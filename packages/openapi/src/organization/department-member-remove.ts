import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const REMOVE_DEPARTMENT_MEMBER = '/organization/department/{id}/member/{userId}';

export const removeDepartmentMemberRoute: RouteConfig = registerRoute({
  method: 'delete',
  path: REMOVE_DEPARTMENT_MEMBER,
  description: 'Remove a user from a department',
  request: {
    params: z.object({ id: z.string(), userId: z.string() }),
  },
  responses: {
    200: {
      description: 'Member removed',
    },
  },
  tags: ['organization'],
});

export const removeDepartmentMember = (id: string, userId: string) => {
  return axios.delete(urlBuilder(REMOVE_DEPARTMENT_MEMBER, { id, userId }));
};
