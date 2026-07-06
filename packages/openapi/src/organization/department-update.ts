import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const UPDATE_DEPARTMENT = '/organization/department/{id}';

export const updateDepartmentRoSchema = z.object({
  name: z.string(),
});

export type IUpdateDepartmentRo = z.infer<typeof updateDepartmentRoSchema>;

export const updateDepartmentRoute: RouteConfig = registerRoute({
  method: 'patch',
  path: UPDATE_DEPARTMENT,
  description: 'Rename a department',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateDepartmentRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Department updated',
    },
  },
  tags: ['organization'],
});

export const updateDepartment = (id: string, ro: IUpdateDepartmentRo) => {
  return axios.patch(urlBuilder(UPDATE_DEPARTMENT, { id }), ro);
};
