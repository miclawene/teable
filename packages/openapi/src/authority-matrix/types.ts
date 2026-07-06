import { z } from '../zod';

export const fieldPermissionLevelSchema = z.enum(['hidden', 'readonly', 'editable']);

export type IFieldPermissionLevel = z.infer<typeof fieldPermissionLevelSchema>;

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
});

export const authorityMatrixPermissionSchema = z.object({
  fieldId: z.string(),
  roleName: z.string(),
  level: fieldPermissionLevelSchema,
});

export const authorityMatrixVoSchema = z.object({
  roles: z.array(authorityMatrixRoleSchema),
  tables: z.array(authorityMatrixTableSchema),
  permissions: z.array(authorityMatrixPermissionSchema),
});

export type IAuthorityMatrixVo = z.infer<typeof authorityMatrixVoSchema>;

export const updateAuthorityMatrixRoSchema = z.object({
  updates: z.array(authorityMatrixPermissionSchema),
});

export type IUpdateAuthorityMatrixRo = z.infer<typeof updateAuthorityMatrixRoSchema>;
