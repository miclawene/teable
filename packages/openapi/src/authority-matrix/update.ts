import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import { updateAuthorityMatrixRoSchema, type IUpdateAuthorityMatrixRo } from './types';

export const UPDATE_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix';

export const UpdateAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'put',
  path: UPDATE_AUTHORITY_MATRIX,
  description: 'Update the field x role authority matrix for a base',
  request: {
    params: z.object({ baseId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateAuthorityMatrixRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Authority matrix updated',
    },
  },
  tags: ['authority-matrix'],
});

export const updateAuthorityMatrix = async (
  baseId: string,
  updateAuthorityMatrixRo: IUpdateAuthorityMatrixRo
) => {
  return axios.put(urlBuilder(UPDATE_AUTHORITY_MATRIX, { baseId }), updateAuthorityMatrixRo);
};
