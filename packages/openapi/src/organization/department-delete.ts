import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const DELETE_DEPARTMENT = '/organization/department/{id}';

export const deleteDepartmentRoute: RouteConfig = registerRoute({
  method: 'delete',
  path: DELETE_DEPARTMENT,
  description: 'Delete a department',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: 'Department deleted',
    },
  },
  tags: ['organization'],
});

export const deleteDepartment = (id: string) => {
  return axios.delete(urlBuilder(DELETE_DEPARTMENT, { id }));
};
