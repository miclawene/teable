import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';
import { workflowVoSchema } from '../types';

export const GET_WORKFLOW = '/base/{baseId}/workflow/{workflowId}';

export type IGetWorkflowVo = z.infer<typeof workflowVoSchema>;

export const GetWorkflowRoute: RouteConfig = registerRoute({
  method: 'get',
  path: GET_WORKFLOW,
  description: 'Get an automation workflow by id',
  request: {
    params: z.object({ baseId: z.string(), workflowId: z.string() }),
  },
  responses: {
    200: {
      description: 'Returns data about the workflow.',
      content: {
        'application/json': {
          schema: workflowVoSchema,
        },
      },
    },
  },
  tags: ['automation'],
});

export const getWorkflow = async (baseId: string, workflowId: string) => {
  return axios.get<IGetWorkflowVo>(urlBuilder(GET_WORKFLOW, { baseId, workflowId }));
};
