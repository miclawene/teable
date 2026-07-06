import { Injectable } from '@nestjs/common';
import { generateFieldRolePermissionId } from '@teable/core';
import type { IAuthorityMatrixVo, IFieldPermissionLevel } from '@teable/openapi';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { PolicyEngineService } from '../authz/policy-engine.service';
import type { IClsStore } from '../../types/cls';
import { PermissionService } from '../auth/permission.service';

const RESTRICTED_LEVELS = new Set<IFieldPermissionLevel>(['hidden', 'readonly']);

@Injectable()
export class AuthorityMatrixService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly policyEngineService: PolicyEngineService,
    private readonly permissionService: PermissionService
  ) {}

  async getMatrix(baseId: string): Promise<IAuthorityMatrixVo> {
    const client = this.prismaService.txClient();
    const tables = await client.tableMeta.findMany({
      where: { baseId, deletedTime: null },
      select: { id: true, name: true },
    });

    const [tableFields, permissions] = await Promise.all([
      client.field.findMany({
        where: { tableId: { in: tables.map((table) => table.id) }, deletedTime: null },
        select: { id: true, name: true, tableId: true },
      }),
      client.fieldRolePermission.findMany({ where: { baseId } }),
    ]);

    const tablesMap = new Map<string, { id: string; name: string; fields: { id: string; name: string }[] }>();
    for (const table of tables) {
      tablesMap.set(table.id, { id: table.id, name: table.name, fields: [] });
    }
    for (const field of tableFields) {
      tablesMap.get(field.tableId)?.fields.push({ id: field.id, name: field.name });
    }

    const roleNames = this.policyEngineService.listRoles();
    const roleDefinitions = roleNames
      .map((name) => this.policyEngineService.getRoleDefinition(name))
      .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition));

    return {
      roles: roleDefinitions.map((definition) => ({
        name: definition.name,
        rank: definition.rank,
        isSystem: definition.isSystem,
      })),
      tables: Array.from(tablesMap.values()),
      permissions: permissions.map((permission) => ({
        fieldId: permission.fieldId,
        roleName: permission.roleName,
        level: permission.level as IFieldPermissionLevel,
      })),
    };
  }

  async setPermissions(
    baseId: string,
    updates: { fieldId: string; roleName: string; level: IFieldPermissionLevel }[]
  ): Promise<void> {
    const userId = this.cls.get('user.id');
    const client = this.prismaService.txClient();
    await Promise.all(
      updates.map((update) =>
        client.fieldRolePermission.upsert({
          where: { fieldId_roleName: { fieldId: update.fieldId, roleName: update.roleName } },
          create: {
            id: generateFieldRolePermissionId(),
            baseId,
            fieldId: update.fieldId,
            roleName: update.roleName,
            level: update.level,
            createdBy: userId,
          },
          update: {
            level: update.level,
            lastModifiedBy: userId,
          },
        })
      )
    );
  }

  /**
   * Field IDs visible to the current user's role for this table, or
   * `undefined` when nothing is restricted (matches the "no restriction"
   * semantics record.service.ts already expects from enabledFieldIds).
   */
  async getEnabledFieldIds(tableId: string): Promise<string[] | undefined> {
    const restricted = await this.getRestrictedFieldLevels(tableId);
    if (!restricted) return undefined;

    const hiddenFieldIds = new Set(
      Array.from(restricted.entries())
        .filter(([, level]) => level === 'hidden')
        .map(([fieldId]) => fieldId)
    );
    if (hiddenFieldIds.size === 0) return undefined;

    const client = this.prismaService.txClient();
    const allFields = await client.field.findMany({
      where: { tableId, deletedTime: null },
      select: { id: true },
    });
    return allFields.map((field) => field.id).filter((id) => !hiddenFieldIds.has(id));
  }

  /**
   * Field IDs the current user's role is NOT allowed to write (hidden or
   * readonly), or `undefined` when nothing is restricted for this table.
   */
  async getNonEditableFieldIds(tableId: string): Promise<Set<string> | undefined> {
    const restricted = await this.getRestrictedFieldLevels(tableId);
    if (!restricted) return undefined;
    const nonEditable = new Set(
      Array.from(restricted.entries())
        .filter(([, level]) => RESTRICTED_LEVELS.has(level))
        .map(([fieldId]) => fieldId)
    );
    return nonEditable.size ? nonEditable : undefined;
  }

  private async getRestrictedFieldLevels(
    tableId: string
  ): Promise<Map<string, IFieldPermissionLevel> | undefined> {
    const client = this.prismaService.txClient();
    const table = await client.tableMeta.findFirst({
      where: { id: tableId },
      select: { baseId: true },
    });
    if (!table) return undefined;

    const role = await this.permissionService.getRoleByBaseId(table.baseId);
    if (!role) return undefined;

    const tableFieldIds = await client.field.findMany({
      where: { tableId, deletedTime: null },
      select: { id: true },
    });
    if (tableFieldIds.length === 0) return undefined;

    const permissions = await client.fieldRolePermission.findMany({
      where: {
        baseId: table.baseId,
        roleName: role,
        level: { not: 'editable' },
        fieldId: { in: tableFieldIds.map((field) => field.id) },
      },
      select: { fieldId: true, level: true },
    });
    if (permissions.length === 0) return undefined;

    return new Map(permissions.map((p) => [p.fieldId, p.level as IFieldPermissionLevel]));
  }
}
