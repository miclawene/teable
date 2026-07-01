import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';
import { conditionGroupSchema, workflowActionConfigSchema, workflowVoSchema } from '../types';

export const UPDATE_WORKFLOW = '/base/{baseId}/workflow/{workflowId}';

export const updateWorkflowRoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  conditionConfig: conditionGroupSchema.optional(),
  actions: z.array(workflowActionConfigSchema).optional(),
});

export type IUpdateWorkflowRo = z.infer<typeof updateWorkflowRoSchema>;

export type IUpdateWorkflowVo = z.infer<typeof workflowVoSchema>;

export const UpdateWorkflowRoute: RouteConfig = registerRoute({
  method: 'patch',
  path: UPDATE_WORKFLOW,
  description: 'Update an automation workflow',
  request: {
    params: z.object({ baseId: z.string(), workflowId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateWorkflowRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Returns data about the updated workflow.',
      content: {
        'application/json': {
          schema: workflowVoSchema,
        },
      },
    },
  },
  tags: ['automation'],
});

export const updateWorkflow = async (
  baseId: string,
  workflowId: string,
  updateWorkflowRo: IUpdateWorkflowRo
) => {
  return axios.patch<IUpdateWorkflowVo>(
    urlBuilder(UPDATE_WORKFLOW, { baseId, workflowId }),
    updateWorkflowRo
  );
};
