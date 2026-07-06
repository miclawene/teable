import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const ADD_DEPARTMENT_MEMBER = '/organization/department/{id}/member';

export const addDepartmentMemberRoSchema = z.object({
  userId: z.string(),
});

export type IAddDepartmentMemberRo = z.infer<typeof addDepartmentMemberRoSchema>;

export const addDepartmentMemberRoute: RouteConfig = registerRoute({
  method: 'post',
  path: ADD_DEPARTMENT_MEMBER,
  description: 'Add a user to a department',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: addDepartmentMemberRoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Member added',
    },
  },
  tags: ['organization'],
});

export const addDepartmentMember = (id: string, ro: IAddDepartmentMemberRo) => {
  return axios.post(urlBuilder(ADD_DEPARTMENT_MEMBER, { id }), ro);
};
