import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';
import { workflowVoSchema } from '../types';

export const GET_WORKFLOW_LIST = '/base/{baseId}/workflow';

export const getWorkflowListVoSchema = z.array(workflowVoSchema);

export type IGetWorkflowListVo = z.infer<typeof getWorkflowListVoSchema>;

export const GetWorkflowListRoute: RouteConfig = registerRoute({
  method: 'get',
  path: GET_WORKFLOW_LIST,
  description: 'Get the list of automation workflows in a base',
  request: {
    params: z.object({ baseId: z.string() }),
  },
  responses: {
    200: {
      description: 'Returns the list of workflows.',
      content: {
        'application/json': {
          schema: getWorkflowListVoSchema,
        },
      },
    },
  },
  tags: ['automation'],
});

export const getWorkflowList = async (baseId: string) => {
  return axios.get<IGetWorkflowListVo>(urlBuilder(GET_WORKFLOW_LIST, { baseId }));
};
