import { defaultRoleDefinitions, defaultRolePermissions } from './default-policy-data';
import type { IActionName, IPolicyStore, IRoleDefinition, IRoleName } from './types';

/**
 * Default PolicyStore implementation: holds role definitions and permitted
 * actions in memory. Used as the out-of-the-box store (identical behavior to
 * Teable's hardcoded role matrix) and as a fallback/test double for
 * database-backed stores.
 */
export class InMemoryPolicyStore implements IPolicyStore {
  private readonly roleDefinitions = new Map<IRoleName, IRoleDefinition>();
  private readonly rolePermissions = new Map<IRoleName, Set<IActionName>>();

  constructor(
    roleDefinitions: IRoleDefinition[] = defaultRoleDefinitions,
    rolePermissions: Record<IRoleName, IActionName[]> = defaultRolePermissions
  ) {
    for (const definition of roleDefinitions) {
      this.roleDefinitions.set(definition.name, definition);
    }
    for (const [roleName, actions] of Object.entries(rolePermissions)) {
      this.rolePermissions.set(roleName, new Set(actions));
    }
  }

  getRoleDefinition(role: IRoleName): IRoleDefinition | undefined {
    return this.roleDefinitions.get(role);
  }

  listRoleDefinitions(): IRoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  getPermittedActions(role: IRoleName): IActionName[] {
    return Array.from(this.rolePermissions.get(role) ?? []);
  }

  upsertRole(definition: IRoleDefinition, actions: IActionName[]): void {
    this.roleDefinitions.set(definition.name, definition);
    this.rolePermissions.set(definition.name, new Set(actions));
  }
}
