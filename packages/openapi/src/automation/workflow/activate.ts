import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';

export const ACTIVATE_WORKFLOW = '/base/{baseId}/workflow/{workflowId}/activate';
export const DEACTIVATE_WORKFLOW = '/base/{baseId}/workflow/{workflowId}/deactivate';

export const ActivateWorkflowRoute: RouteConfig = registerRoute({
  method: 'post',
  path: ACTIVATE_WORKFLOW,
  description: 'Activate an automation workflow',
  request: {
    params: z.object({ baseId: z.string(), workflowId: z.string() }),
  },
  responses: {
    200: {
      description: 'Workflow activated',
    },
  },
  tags: ['automation'],
});

export const DeactivateWorkflowRoute: RouteConfig = registerRoute({
  method: 'post',
  path: DEACTIVATE_WORKFLOW,
  description: 'Deactivate an automation workflow',
  request: {
    params: z.object({ baseId: z.string(), workflowId: z.string() }),
  },
  responses: {
    200: {
      description: 'Workflow deactivated',
    },
  },
  tags: ['automation'],
});

export const activateWorkflow = async (baseId: string, workflowId: string) => {
  return axios.post(urlBuilder(ACTIVATE_WORKFLOW, { baseId, workflowId }));
};

export const deactivateWorkflow = async (baseId: string, workflowId: string) => {
  return axios.post(urlBuilder(DEACTIVATE_WORKFLOW, { baseId, workflowId }));
};
