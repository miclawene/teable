import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';
import { workflowRunVoSchema } from '../types';

export const GET_WORKFLOW_RUN_LIST = '/base/{baseId}/workflow/{workflowId}/run';

export const getWorkflowRunListVoSchema = z.array(workflowRunVoSchema);

export type IGetWorkflowRunListVo = z.infer<typeof getWorkflowRunListVoSchema>;

export const GetWorkflowRunListRoute: RouteConfig = registerRoute({
  method: 'get',
  path: GET_WORKFLOW_RUN_LIST,
  description: 'Get the execution history of an automation workflow',
  request: {
    params: z.object({ baseId: z.string(), workflowId: z.string() }),
  },
  responses: {
    200: {
      description: 'Returns the list of workflow runs.',
      content: {
        'application/json': {
          schema: getWorkflowRunListVoSchema,
        },
      },
    },
  },
  tags: ['automation'],
});

export const getWorkflowRunList = async (baseId: string, workflowId: string) => {
  return axios.get<IGetWorkflowRunListVo>(urlBuilder(GET_WORKFLOW_RUN_LIST, { baseId, workflowId }));
};
