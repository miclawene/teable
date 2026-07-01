// A role name is a plain string, not a fixed union — this is what makes the
// engine pluggable: custom roles are just new strings a PolicyStore knows about.
export type IRoleName = string;

export type IActionName = string;

export interface IRoleDefinition {
  name: IRoleName;
  // Lower rank = more privileged. Mirrors the total ordering `RoleLevel` used
  // to provide today by `@teable/core`, needed to merge multiple role grants
  // (e.g. org + direct collaborator) into a single "highest privilege" role.
  rank: number;
  isSystem: boolean;
}

/**
 * Storage abstraction for role -> permission data. The engine ships an
 * in-memory default implementation seeded from @teable/core's existing role
 * matrix, but any implementation (e.g. database-backed) can be substituted
 * without changing PolicyEngine's call sites.
 */
export interface IPolicyStore {
  getRoleDefinition(role: IRoleName): IRoleDefinition | undefined;
  listRoleDefinitions(): IRoleDefinition[];
  getPermittedActions(role: IRoleName): IActionName[];
}
