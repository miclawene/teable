import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import {
  updateFieldPrincipalPermissionsRoSchema,
  type IUpdateFieldPrincipalPermissionsRo,
} from './types';

export const UPDATE_FIELD_PRINCIPAL_PERMISSIONS =
  '/base/{baseId}/authority-matrix/table/{tableId}/principal-permissions';

export const UpdateFieldPrincipalPermissionsRoute: RouteConfig = registerRoute({
  method: 'put',
  path: UPDATE_FIELD_PRINCIPAL_PERMISSIONS,
  description:
    'Set field visibility (hidden/readonly/editable) for a specific department or employee on a table.',
  request: {
    params: z.object({ baseId: z.string(), tableId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateFieldPrincipalPermissionsRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Field principal permissions updated',
    },
  },
  tags: ['authority-matrix'],
});

export const updateFieldPrincipalPermissions = async (
  baseId: string,
  tableId: string,
  ro: IUpdateFieldPrincipalPermissionsRo
) => {
  return axios.put(urlBuilder(UPDATE_FIELD_PRINCIPAL_PERMISSIONS, { baseId, tableId }), ro);
};
