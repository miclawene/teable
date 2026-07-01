import { InMemoryPolicyStore } from './in-memory-policy-store';
import type { IActionName, IPolicyStore, IRoleName } from './types';

/**
 * Framework-agnostic facade over a PolicyStore. Signatures mirror
 * @teable/core's existing `permission.ts` helpers (getPermissions,
 * hasPermission, checkPermissions, canManageRole, isRestrictedRole) so that
 * call sites can be rewired to this engine with no behavioral change.
 */
export class PolicyEngine {
  constructor(private readonly store: IPolicyStore = new InMemoryPolicyStore()) {}

  getPermissions(role: IRoleName): IActionName[] {
    return this.store.getPermittedActions(role);
  }

  hasPermission(role: IRoleName, action: IActionName): boolean {
    return this.checkPermissions(role, [action]);
  }

  checkPermissions(role: IRoleName, actions: IActionName[]): boolean {
    const permitted = new Set(this.store.getPermittedActions(role));
    return actions.every((action) => permitted.has(action));
  }

  isRestrictedRole(role: IRoleName): boolean {
    const definition = this.store.getRoleDefinition(role);
    // Rank 0 is the most privileged role (e.g. Owner) by convention; anything
    // less privileged than the top rank is "restricted".
    return definition === undefined || definition.rank !== 0;
  }

  canManageRole(managerRole: IRoleName, targetRole: IRoleName): boolean {
    const managerRank = this.store.getRoleDefinition(managerRole)?.rank;
    const targetRank = this.store.getRoleDefinition(targetRole)?.rank;
    if (managerRank === undefined || targetRank === undefined) {
      return false;
    }
    return managerRank < targetRank;
  }

  listRoles(): IRoleName[] {
    return this.store
      .listRoleDefinitions()
      .sort((a, b) => a.rank - b.rank)
      .map((definition) => definition.name);
  }
}
