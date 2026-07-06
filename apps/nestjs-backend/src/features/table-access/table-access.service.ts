import { Injectable } from '@nestjs/common';
import { generateTableAccessGrantId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';

export type ITableAccessPrincipalType = 'user' | 'department';

export interface ITableAccessPrincipal {
  principalType: ITableAccessPrincipalType;
  principalId: string;
}

/**
 * Per-table visibility grants. Deliberately depends only on PrismaService and
 * ClsService (not PermissionService/AuthorityMatrixService) so PermissionService
 * can inject it without a circular module dependency.
 */
@Injectable()
export class TableAccessService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  /** The current request's principals: the user themself plus their departments. */
  getCurrentPrincipals(): string[] {
    const userId = this.cls.get('user.id');
    const departments = this.cls.get('organization.departments');
    return [userId, ...(departments?.map((department) => department.id) ?? [])].filter(Boolean);
  }

  async getGrants(tableId: string): Promise<ITableAccessPrincipal[]> {
    const client = this.prismaService.txClient();
    const grants = await client.tableAccessGrant.findMany({
      where: { tableId },
      select: { principalType: true, principalId: true },
    });
    return grants as ITableAccessPrincipal[];
  }

  async setGrants(
    baseId: string,
    tableId: string,
    grants: ITableAccessPrincipal[],
    userId: string
  ): Promise<void> {
    const client = this.prismaService.txClient();
    await client.tableAccessGrant.deleteMany({ where: { tableId } });
    if (grants.length) {
      await client.tableAccessGrant.createMany({
        data: grants.map((grant) => ({
          id: generateTableAccessGrantId(),
          baseId,
          tableId,
          principalType: grant.principalType,
          principalId: grant.principalId,
          createdBy: userId,
        })),
      });
    }
  }

  /** No grants for a table => open to everyone (backward compatible default). */
  async canAccessTable(tableId: string, principals: string[]): Promise<boolean> {
    const client = this.prismaService.txClient();
    const grants = await client.tableAccessGrant.findMany({
      where: { tableId },
      select: { principalId: true },
    });
    if (grants.length === 0) return true;
    const allowedIds = new Set(grants.map((grant: { principalId: string }) => grant.principalId));
    return principals.some((principal) => allowedIds.has(principal));
  }

  /** Batch variant of canAccessTable for filtering a base's table list. */
  async filterAccessibleTableIds(tableIds: string[], principals: string[]): Promise<string[]> {
    if (tableIds.length === 0) return [];
    const client = this.prismaService.txClient();
    const grants = await client.tableAccessGrant.findMany({
      where: { tableId: { in: tableIds } },
      select: { tableId: true, principalId: true },
    });
    if (grants.length === 0) return tableIds;

    const grantsByTable = new Map<string, Set<string>>();
    for (const grant of grants) {
      if (!grantsByTable.has(grant.tableId)) {
        grantsByTable.set(grant.tableId, new Set());
      }
      grantsByTable.get(grant.tableId)!.add(grant.principalId);
    }
    return tableIds.filter((tableId) => {
      const allowedIds = grantsByTable.get(tableId);
      if (!allowedIds) return true;
      return principals.some((principal) => allowedIds.has(principal));
    });
  }
}
