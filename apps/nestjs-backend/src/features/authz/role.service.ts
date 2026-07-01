import { Injectable } from '@nestjs/common';
import { HttpErrorCode, SYSTEM_USER_ID, generateRoleDefinitionId, generateRolePolicyId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { CustomHttpException } from '../../custom.exception';
import type { IClsStore } from '../../types/cls';
import { PolicyEngineService } from './policy-engine.service';

const GLOBAL_SCOPE = 'global';

export interface ICreateRoleRo {
  name: string;
  rank: number;
  actions: string[];
}

/**
 * Minimal CRUD for custom roles on top of the decoupled RBAC engine
 * (@teable/authz). System roles (the 5 built-in defaults) can never be
 * mutated or deleted here — only new roles can be added, so default
 * behavior can never regress through this API.
 */
@Injectable()
export class RoleService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly policyEngineService: PolicyEngineService
  ) {}

  listRoles() {
    return this.prismaService.txClient().roleDefinition.findMany({
      select: { name: true, rank: true, isSystem: true },
      orderBy: { rank: 'asc' },
    });
  }

  async createRole(ro: ICreateRoleRo) {
    const userId = this.cls.get('user.id');
    const client = this.prismaService.txClient();
    const existing = await client.roleDefinition.findUnique({ where: { name: ro.name } });
    if (existing) {
      throw new CustomHttpException(`Role ${ro.name} already exists`, HttpErrorCode.VALIDATION_ERROR);
    }
    await client.roleDefinition.create({
      data: {
        id: generateRoleDefinitionId(),
        name: ro.name,
        rank: ro.rank,
        isSystem: false,
        createdBy: userId,
      },
    });
    await client.rolePolicy.createMany({
      data: ro.actions.map((action) => ({
        id: generateRolePolicyId(),
        roleName: ro.name,
        scope: GLOBAL_SCOPE,
        action,
        allowed: true,
        isSystem: false,
        createdBy: userId,
      })),
    });
    await this.policyEngineService.refresh();
  }

  async deleteRole(name: string) {
    const client = this.prismaService.txClient();
    const role = await client.roleDefinition.findUnique({ where: { name } });
    if (!role) {
      throw new CustomHttpException(`Role ${name} not found`, HttpErrorCode.NOT_FOUND);
    }
    if (role.isSystem) {
      throw new CustomHttpException(
        `System role ${name} cannot be deleted`,
        HttpErrorCode.RESTRICTED_RESOURCE
      );
    }
    await client.rolePolicy.deleteMany({ where: { roleName: name, scope: GLOBAL_SCOPE } });
    await client.roleDefinition.delete({ where: { name } });
    await this.policyEngineService.refresh();
  }
}
