import { Injectable } from '@nestjs/common';
import { generateFieldRolePermissionId, generateFieldPrincipalPermissionId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type { IAuthorityMatrixVo, IFieldPermissionLevel } from '@teable/openapi';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { PermissionService } from '../auth/permission.service';
import { PolicyEngineService } from '../authz/policy-engine.service';
import type {
  ITableAccessPrincipal,
  ITableAccessPrincipalType,
} from '../table-access/table-access.service';
import { TableAccessService } from '../table-access/table-access.service';

const RESTRICTED_LEVELS = new Set<IFieldPermissionLevel>(['hidden', 'readonly']);

/** Restrictiveness ranking used to merge conflicting principal-level rules. */
const LEVEL_RANK: Record<IFieldPermissionLevel, number> = {
  editable: 0,
  readonly: 1,
  hidden: 2,
};

interface IFieldPrincipalPermission {
  fieldId: string;
  principalType: ITableAccessPrincipalType;
  principalId: string;
  level: IFieldPermissionLevel;
}

@Injectable()
export class AuthorityMatrixService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly policyEngineService: PolicyEngineService,
    private readonly permissionService: PermissionService,
    private readonly tableAccessService: TableAccessService
  ) {}

  async getMatrix(baseId: string): Promise<IAuthorityMatrixVo> {
    const client = this.prismaService.txClient();
    const tables = await client.tableMeta.findMany({
      where: { baseId, deletedTime: null },
      select: { id: true, name: true },
    });
    const tableIds = tables.map((table: { id: string }) => table.id);

    const [tableFields, permissions, accessGrants, principalPermissions] = await Promise.all([
      client.field.findMany({
        where: { tableId: { in: tableIds }, deletedTime: null },
        select: { id: true, name: true, tableId: true },
      }),
      client.fieldRolePermission.findMany({ where: { baseId } }),
      client.tableAccessGrant.findMany({ where: { baseId } }),
      client.fieldPrincipalPermission.findMany({ where: { baseId } }),
    ]);

    const tablesMap = new Map<
      string,
      {
        id: string;
        name: string;
        fields: { id: string; name: string }[];
        accessGrants: ITableAccessPrincipal[];
      }
    >();
    for (const table of tables) {
      tablesMap.set(table.id, { id: table.id, name: table.name, fields: [], accessGrants: [] });
    }
    for (const field of tableFields) {
      tablesMap.get(field.tableId)?.fields.push({ id: field.id, name: field.name });
    }
    for (const grant of accessGrants) {
      tablesMap.get(grant.tableId)?.accessGrants.push({
        principalType: grant.principalType as ITableAccessPrincipalType,
        principalId: grant.principalId,
      });
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
      permissions: permissions.map(
        (permission: { fieldId: string; roleName: string; level: string }) => ({
          fieldId: permission.fieldId,
          roleName: permission.roleName,
          level: permission.level as IFieldPermissionLevel,
        })
      ),
      principalPermissions: principalPermissions.map(
        (permission: {
          fieldId: string;
          principalType: string;
          principalId: string;
          level: string;
        }) => ({
          fieldId: permission.fieldId,
          principalType: permission.principalType as ITableAccessPrincipalType,
          principalId: permission.principalId,
          level: permission.level as IFieldPermissionLevel,
        })
      ),
    };
  }

  async setTableAccessGrants(
    baseId: string,
    tableId: string,
    grants: ITableAccessPrincipal[]
  ): Promise<void> {
    const userId = this.cls.get('user.id');
    return this.tableAccessService.setGrants(baseId, tableId, grants, userId);
  }

  async setFieldPrincipalPermissions(
    baseId: string,
    tableId: string,
    updates: IFieldPrincipalPermission[]
  ): Promise<void> {
    const userId = this.cls.get('user.id');
    const client = this.prismaService.txClient();
    await Promise.all(
      updates.map((update) =>
        client.fieldPrincipalPermission.upsert({
          where: {
            fieldId_principalType_principalId: {
              fieldId: update.fieldId,
              principalType: update.principalType,
              principalId: update.principalId,
            },
          },
          create: {
            id: generateFieldPrincipalPermissionId(),
            baseId,
            tableId,
            fieldId: update.fieldId,
            principalType: update.principalType,
            principalId: update.principalId,
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

  /**
   * Merges role-based rules (FieldRolePermission) with principal-based rules
   * (FieldPrincipalPermission) for the current user. Principal-based rules
   * always win over role-based ones when present: an explicit personal
   * (user) rule wins over department rules, and when several departments the
   * user belongs to disagree on a field, the most restrictive level wins.
   */
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
    const fieldIds = tableFieldIds.map((field: { id: string }) => field.id);

    const userId = this.cls.get('user.id');
    const departmentIds = (this.cls.get('organization.departments') ?? []).map(
      (department) => department.id
    );

    const [roleBased, principalBased] = await Promise.all([
      client.fieldRolePermission.findMany({
        where: {
          baseId: table.baseId,
          roleName: role,
          level: { not: 'editable' },
          fieldId: { in: fieldIds },
        },
        select: { fieldId: true, level: true },
      }),
      client.fieldPrincipalPermission.findMany({
        where: {
          tableId,
          fieldId: { in: fieldIds },
          OR: [
            { principalType: 'user', principalId: userId },
            ...(departmentIds.length
              ? [{ principalType: 'department', principalId: { in: departmentIds } }]
              : []),
          ],
        },
        select: { fieldId: true, principalType: true, level: true },
      }),
    ]);

    const result = new Map<string, IFieldPermissionLevel>();
    for (const permission of roleBased) {
      result.set(permission.fieldId, permission.level as IFieldPermissionLevel);
    }

    const principalOverrides = this.resolvePrincipalOverrides(principalBased);
    for (const [fieldId, effective] of principalOverrides) {
      if (effective === 'editable') {
        result.delete(fieldId);
      } else {
        result.set(fieldId, effective);
      }
    }

    return result.size ? result : undefined;
  }

  /**
   * Groups principal-based rules by field and resolves each field to a single
   * effective level: an explicit personal (user) rule wins outright, else the
   * most restrictive department rule wins.
   */
  private resolvePrincipalOverrides(
    principalBased: { fieldId: string; principalType: string; level: string }[]
  ): Map<string, IFieldPermissionLevel> {
    const rulesByField = new Map<
      string,
      { principalType: ITableAccessPrincipalType; level: IFieldPermissionLevel }[]
    >();
    for (const permission of principalBased) {
      const level = permission.level as IFieldPermissionLevel;
      const principalType = permission.principalType as ITableAccessPrincipalType;
      if (!rulesByField.has(permission.fieldId)) rulesByField.set(permission.fieldId, []);
      rulesByField.get(permission.fieldId)!.push({ principalType, level });
    }

    const effectiveByField = new Map<string, IFieldPermissionLevel>();
    for (const [fieldId, rules] of rulesByField) {
      const userRule = rules.find((rule) => rule.principalType === 'user');
      const effective = userRule
        ? userRule.level
        : rules.reduce<IFieldPermissionLevel>(
            (mostRestrictive, rule) =>
              LEVEL_RANK[rule.level] > LEVEL_RANK[mostRestrictive] ? rule.level : mostRestrictive,
            'editable'
          );
      effectiveByField.set(fieldId, effective);
    }
    return effectiveByField;
  }
}
