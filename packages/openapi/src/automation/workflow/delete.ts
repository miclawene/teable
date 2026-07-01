import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';

export const DELETE_WORKFLOW = '/base/{baseId}/workflow/{workflowId}';

export const DeleteWorkflowRoute: RouteConfig = registerRoute({
  method: 'delete',
  path: DELETE_WORKFLOW,
  description: 'Delete an automation workflow',
  request: {
    params: z.object({ baseId: z.string(), workflowId: z.string() }),
  },
  responses: {
    200: {
      description: 'Workflow deleted',
    },
  },
  tags: ['automation'],
});

export const deleteWorkflow = async (baseId: string, workflowId: string) => {
  return axios.delete(urlBuilder(DELETE_WORKFLOW, { baseId, workflowId }));
};
