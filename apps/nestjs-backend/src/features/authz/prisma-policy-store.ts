import { Injectable, Logger } from '@nestjs/common';
import {
  defaultRoleDefinitions,
  defaultRolePermissions,
  type IActionName,
  type IPolicyStore,
  type IRoleDefinition,
  type IRoleName,
} from '@teable/authz';
import { SYSTEM_USER_ID, generateRoleDefinitionId, generateRolePolicyId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';

const GLOBAL_SCOPE = 'global';

/**
 * IPolicyStore implementation backed by the RolePolicy/RoleDefinition Prisma
 * models. Lookups themselves stay synchronous (an in-memory cache, matching
 * @teable/authz's IPolicyStore contract) — `refresh()` is the only place that
 * talks to the database, called on bootstrap and after any role/policy write.
 * On first boot (empty tables) it seeds the exact default role matrix from
 * @teable/authz, guaranteeing identical out-of-the-box behavior to Teable's
 * previous hardcoded RolePermission matrix.
 */
@Injectable()
export class PrismaPolicyStore implements IPolicyStore {
  private readonly logger = new Logger(PrismaPolicyStore.name);
  private roleDefinitions = new Map<IRoleName, IRoleDefinition>();
  private rolePermissions = new Map<IRoleName, Set<IActionName>>();

  constructor(private readonly prismaService: PrismaService) {}

  getRoleDefinition(role: IRoleName): IRoleDefinition | undefined {
    return this.roleDefinitions.get(role);
  }

  listRoleDefinitions(): IRoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  getPermittedActions(role: IRoleName): IActionName[] {
    return Array.from(this.rolePermissions.get(role) ?? []);
  }

  async refresh(): Promise<void> {
    const client = this.prismaService.txClient();
    const [roleRows, policyRows] = await Promise.all([
      client.roleDefinition.findMany(),
      client.rolePolicy.findMany({ where: { scope: GLOBAL_SCOPE, allowed: true } }),
    ]);

    if (roleRows.length === 0 && policyRows.length === 0) {
      this.logger.log('role_definition/role_policy tables are empty, seeding default roles');
      await this.seedDefaults();
      return this.refresh();
    }

    const nextRoleDefinitions = new Map<IRoleName, IRoleDefinition>();
    for (const row of roleRows) {
      nextRoleDefinitions.set(row.name, { name: row.name, rank: row.rank, isSystem: row.isSystem });
    }

    const nextRolePermissions = new Map<IRoleName, Set<IActionName>>();
    for (const row of policyRows) {
      const actions = nextRolePermissions.get(row.roleName) ?? new Set<IActionName>();
      actions.add(row.action);
      nextRolePermissions.set(row.roleName, actions);
    }

    this.roleDefinitions = nextRoleDefinitions;
    this.rolePermissions = nextRolePermissions;
  }

  private async seedDefaults(): Promise<void> {
    const client = this.prismaService.txClient();
    await client.roleDefinition.createMany({
      data: defaultRoleDefinitions.map((definition) => ({
        id: generateRoleDefinitionId(),
        name: definition.name,
        rank: definition.rank,
        isSystem: definition.isSystem,
        createdBy: SYSTEM_USER_ID,
      })),
    });
    await client.rolePolicy.createMany({
      data: Object.entries(defaultRolePermissions).flatMap(([roleName, actions]) =>
        actions.map((action) => ({
          id: generateRolePolicyId(),
          roleName,
          scope: GLOBAL_SCOPE,
          action,
          allowed: true,
          isSystem: true,
          createdBy: SYSTEM_USER_ID,
        }))
      ),
    });
  }
}
