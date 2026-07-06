import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import { authorityMatrixVoSchema, type IAuthorityMatrixVo } from './types';

export const GET_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix';

export const GetAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'get',
  path: GET_AUTHORITY_MATRIX,
  description: 'Get the field x role authority matrix for a base',
  request: {
    params: z.object({ baseId: z.string() }),
  },
  responses: {
    200: {
      description: 'Returns the authority matrix.',
      content: {
        'application/json': {
          schema: authorityMatrixVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const getAuthorityMatrix = async (baseId: string) => {
  return axios.get<IAuthorityMatrixVo>(urlBuilder(GET_AUTHORITY_MATRIX, { baseId }));
};
