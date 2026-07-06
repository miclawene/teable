import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import { updateTableAccessRoSchema, type IUpdateTableAccessRo } from './types';

export const UPDATE_TABLE_ACCESS = '/base/{baseId}/authority-matrix/table/{tableId}/access';

export const UpdateTableAccessRoute: RouteConfig = registerRoute({
  method: 'put',
  path: UPDATE_TABLE_ACCESS,
  description:
    'Set which departments/users can see a table. Empty grants list makes the table visible to every base collaborator again.',
  request: {
    params: z.object({ baseId: z.string(), tableId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateTableAccessRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Table access grants updated',
    },
  },
  tags: ['authority-matrix'],
});

export const updateTableAccess = async (
  baseId: string,
  tableId: string,
  updateTableAccessRo: IUpdateTableAccessRo
) => {
  return axios.put(
    urlBuilder(UPDATE_TABLE_ACCESS, { baseId, tableId }),
    updateTableAccessRo
  );
};
