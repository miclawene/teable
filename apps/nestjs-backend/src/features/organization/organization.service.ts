import { Injectable } from '@nestjs/common';
import { HttpErrorCode, generateDepartmentId, generateDepartmentMemberId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type {
  IGetDepartmentListVo,
  IGetDepartmentUserItem,
  IGetDepartmentUserVo,
  IGetDepartmentVo,
  IOrganizationMeVo,
} from '@teable/openapi';
import { CustomHttpException } from '../../custom.exception';
import type { IClsStore } from '../../types/cls';

const DEFAULT_ORGANIZATION_ID = 'default';
const DEFAULT_ORGANIZATION_NAME = 'Organization';

@Injectable()
export class OrganizationService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMe(userId: string): Promise<IOrganizationMeVo> {
    const user = await this.prismaService
      .txClient()
      .user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!user) return null;
    return {
      id: DEFAULT_ORGANIZATION_ID,
      name: DEFAULT_ORGANIZATION_NAME,
      isAdmin: Boolean(user.isAdmin),
    };
  }

  async getDepartmentList(ro: {
    parentId?: string;
    search?: string;
    includeChildrenDepartment?: boolean;
  }): Promise<IGetDepartmentListVo> {
    const client = this.prismaService.txClient();
    const departments = ro.search
      ? await client.department.findMany({
          where: { deletedTime: null, name: { contains: ro.search, mode: 'insensitive' } },
          orderBy: { createdTime: 'asc' },
        })
      : await client.department.findMany({
          where: { deletedTime: null, parentId: ro.parentId ?? null },
          orderBy: { createdTime: 'asc' },
        });

    const result: IGetDepartmentVo[] = [];
    for (const department of departments) {
      const childCount = await client.department.count({
        where: { parentId: department.id, deletedTime: null },
      });
      const { path, pathName } = await this.getDepartmentPath(department.id);
      result.push({
        id: department.id,
        name: department.name,
        parentId: department.parentId ?? undefined,
        path,
        pathName,
        hasChildren: childCount > 0,
      });
    }
    return result;
  }

  async getDepartmentUsers(ro: {
    departmentId?: string;
    includeChildrenDepartment?: boolean;
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<IGetDepartmentUserVo> {
    const client = this.prismaService.txClient();
    const departmentIds = ro.departmentId
      ? ro.includeChildrenDepartment
        ? await this.getDescendantDepartmentIds(ro.departmentId)
        : [ro.departmentId]
      : undefined;

    const memberUserIds = departmentIds
      ? (
          await client.departmentMember.findMany({
            where: { departmentId: { in: departmentIds } },
            select: { userId: true },
            distinct: ['userId'],
          })
        ).map((member: { userId: string }) => member.userId)
      : undefined;

    const userWhere = {
      deletedTime: null,
      ...(memberUserIds ? { id: { in: memberUserIds } } : {}),
      ...(ro.search
        ? {
            OR: [
              { name: { contains: ro.search, mode: 'insensitive' as const } },
              { email: { contains: ro.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      client.user.count({ where: userWhere }),
      client.user.findMany({
        where: userWhere,
        select: { id: true, name: true, email: true, avatar: true },
        skip: ro.skip ?? 0,
        take: ro.take ?? 50,
        orderBy: { name: 'asc' },
      }),
    ]);

    const result: IGetDepartmentUserItem[] = [];
    for (const user of users) {
      const memberships = await client.departmentMember.findMany({
        where: { userId: user.id },
        select: { departmentId: true },
      });
      const departments = [];
      for (const membership of memberships) {
        const department = await client.department.findFirst({
          where: { id: membership.departmentId, deletedTime: null },
          select: { id: true, name: true },
        });
        if (!department) continue;
        const { path, pathName } = await this.getDepartmentPath(department.id);
        departments.push({ id: department.id, name: department.name, path, pathName });
      }
      result.push({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined,
        departments,
      });
    }
    return { users: result, total };
  }

  async createDepartment(
    name: string,
    parentId: string | undefined,
    userId: string
  ): Promise<{ id: string }> {
    const id = generateDepartmentId();
    await this.prismaService.txClient().department.create({
      data: { id, name, parentId, createdBy: userId },
    });
    return { id };
  }

  async renameDepartment(id: string, name: string): Promise<void> {
    await this.prismaService.txClient().department.update({ where: { id }, data: { name } });
  }

  async deleteDepartment(id: string): Promise<void> {
    const client = this.prismaService.txClient();
    const childCount = await client.department.count({
      where: { parentId: id, deletedTime: null },
    });
    if (childCount > 0) {
      throw new CustomHttpException(
        'Cannot delete a department that has sub-departments',
        HttpErrorCode.VALIDATION_ERROR
      );
    }
    await client.department.update({ where: { id }, data: { deletedTime: new Date() } });
    await client.departmentMember.deleteMany({ where: { departmentId: id } });
  }

  async addMember(departmentId: string, userId: string): Promise<void> {
    const client = this.prismaService.txClient();
    const existing = await client.departmentMember.findUnique({
      where: { departmentId_userId: { departmentId, userId } },
    });
    if (existing) return;
    await client.departmentMember.create({
      data: { id: generateDepartmentMemberId(), departmentId, userId },
    });
  }

  async removeMember(departmentId: string, userId: string): Promise<void> {
    await this.prismaService.txClient().departmentMember.deleteMany({
      where: { departmentId, userId },
    });
  }

  /**
   * Context populated into cls on every authenticated request (see
   * session/jwt/access-token strategies), used throughout the permission
   * resolution paths that already merge `[userId, ...departmentIds]`.
   */
  async getUserOrganizationContext(userId: string): Promise<IClsStore['organization']> {
    const client = this.prismaService.txClient();
    const [user, memberships] = await Promise.all([
      client.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
      client.departmentMember.findMany({ where: { userId }, select: { departmentId: true } }),
    ]);

    const departments = memberships.length
      ? await client.department.findMany({
          where: {
            id: { in: memberships.map((m: { departmentId: string }) => m.departmentId) },
            deletedTime: null,
          },
          select: { id: true, name: true },
        })
      : [];

    return {
      id: DEFAULT_ORGANIZATION_ID,
      name: DEFAULT_ORGANIZATION_NAME,
      isAdmin: Boolean(user?.isAdmin),
      departments,
    };
  }

  private async getDescendantDepartmentIds(departmentId: string): Promise<string[]> {
    const client = this.prismaService.txClient();
    const result = [departmentId];
    const queue = [departmentId];
    while (queue.length) {
      const current = queue.shift()!;
      const children = await client.department.findMany({
        where: { parentId: current, deletedTime: null },
        select: { id: true },
      });
      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }
    return result;
  }

  private async getDepartmentPath(
    departmentId: string
  ): Promise<{ path: string[]; pathName: string[] }> {
    const client = this.prismaService.txClient();
    const path: string[] = [];
    const pathName: string[] = [];
    let currentId: string | null = departmentId;
    while (currentId) {
      const department: { id: string; name: string; parentId: string | null } | null =
        await client.department.findFirst({
          where: { id: currentId },
          select: { id: true, name: true, parentId: true },
        });
      if (!department) break;
      path.unshift(department.id);
      pathName.unshift(department.name);
      currentId = department.parentId;
    }
    return { path, pathName };
  }
}
