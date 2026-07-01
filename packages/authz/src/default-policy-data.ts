import { Role, RoleLevel, RolePermission, allActions } from '@teable/core';
import type { IActionName, IRoleDefinition, IRoleName } from './types';

/**
 * Default role/action seed data, sourced from @teable/core's existing role
 * matrix rather than re-declared by hand, so the engine's out-of-the-box
 * behavior is guaranteed identical to Teable's built-in 5 roles with zero
 * risk of drift. This is the *only* file that couples @teable/authz to
 * @teable/core, and only for default-data purposes.
 */
export const defaultRoleDefinitions: IRoleDefinition[] = RoleLevel.map((roleName, index) => ({
  name: roleName,
  rank: index,
  isSystem: true,
}));

export const defaultRolePermissions: Record<IRoleName, IActionName[]> = Object.values(Role).reduce(
  (acc, roleName) => {
    const permissionMap = RolePermission[roleName];
    acc[roleName] = allActions.filter((action) => Boolean(permissionMap[action]));
    return acc;
  },
  {} as Record<IRoleName, IActionName[]>
);
