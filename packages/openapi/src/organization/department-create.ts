import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute } from '../utils';
import { z } from '../zod';

export const CREATE_DEPARTMENT = '/organization/department';

export const createDepartmentRoSchema = z.object({
  name: z.string(),
  parentId: z.string().optional(),
});

export type ICreateDepartmentRo = z.infer<typeof createDepartmentRoSchema>;

export const createDepartmentVoSchema = z.object({ id: z.string() });

export type ICreateDepartmentVo = z.infer<typeof createDepartmentVoSchema>;

export const createDepartmentRoute: RouteConfig = registerRoute({
  method: 'post',
  path: CREATE_DEPARTMENT,
  description: 'Create a department (user group)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createDepartmentRoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Department created',
      content: {
        'application/json': {
          schema: createDepartmentVoSchema,
        },
      },
    },
  },
  tags: ['organization'],
});

export const createDepartment = (ro: ICreateDepartmentRo) => {
  return axios.post<ICreateDepartmentVo>(CREATE_DEPARTMENT, ro);
};
