import { z } from '../zod';

export const fieldPermissionLevelSchema = z.enum(['hidden', 'readonly', 'editable']);

export type IFieldPermissionLevel = z.infer<typeof fieldPermissionLevelSchema>;

export const tableAccessPrincipalTypeSchema = z.enum(['user', 'department']);

export type ITableAccessPrincipalType = z.infer<typeof tableAccessPrincipalTypeSchema>;

export const tableAccessPrincipalSchema = z.object({
  principalType: tableAccessPrincipalTypeSchema,
  principalId: z.string(),
});

export type ITableAccessPrincipal = z.infer<typeof tableAccessPrincipalSchema>;

export const authorityMatrixRoleSchema = z.object({
  name: z.string(),
  rank: z.number(),
  isSystem: z.boolean(),
});

export const authorityMatrixTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  // Departments/users allowed to see this table. Empty = visible to every
  // base collaborator (default, unrestricted).
  accessGrants: z.array(tableAccessPrincipalSchema),
});

export const authorityMatrixPermissionSchema = z.object({
  fieldId: z.string(),
  roleName: z.string(),
  level: fieldPermissionLevelSchema,
});

export const fieldPrincipalPermissionSchema = z.object({
  fieldId: z.string(),
  principalType: tableAccessPrincipalTypeSchema,
  principalId: z.string(),
  level: fieldPermissionLevelSchema,
});

export type IFieldPrincipalPermission = z.infer<typeof fieldPrincipalPermissionSchema>;

export const authorityMatrixVoSchema = z.object({
  roles: z.array(authorityMatrixRoleSchema),
  tables: z.array(authorityMatrixTableSchema),
  permissions: z.array(authorityMatrixPermissionSchema),
  // Field visibility scoped to a specific department/employee, taking
  // precedence over the role-based `permissions` above when present.
  principalPermissions: z.array(fieldPrincipalPermissionSchema),
});

export type IAuthorityMatrixVo = z.infer<typeof authorityMatrixVoSchema>;

export const updateAuthorityMatrixRoSchema = z.object({
  updates: z.array(authorityMatrixPermissionSchema),
});

export type IUpdateAuthorityMatrixRo = z.infer<typeof updateAuthorityMatrixRoSchema>;

export const updateTableAccessRoSchema = z.object({
  grants: z.array(tableAccessPrincipalSchema),
});

export type IUpdateTableAccessRo = z.infer<typeof updateTableAccessRoSchema>;

export const updateFieldPrincipalPermissionsRoSchema = z.object({
  updates: z.array(fieldPrincipalPermissionSchema),
});

export type IUpdateFieldPrincipalPermissionsRo = z.infer<
  typeof updateFieldPrincipalPermissionsRoSchema
>;
