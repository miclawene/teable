import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';
import { conditionGroupSchema, workflowActionConfigSchema, workflowVoSchema } from '../types';

export const CREATE_WORKFLOW = '/base/{baseId}/workflow';

export const createWorkflowRoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  triggerType: z.string(),
  triggerConfig: z.record(z.string(), z.unknown()),
  conditionConfig: conditionGroupSchema.optional(),
  actions: z.array(workflowActionConfigSchema),
});

export type ICreateWorkflowRo = z.infer<typeof createWorkflowRoSchema>;

export type ICreateWorkflowVo = z.infer<typeof workflowVoSchema>;

export const CreateWorkflowRoute: RouteConfig = registerRoute({
  method: 'post',
  path: CREATE_WORKFLOW,
  description: 'Create a new automation workflow in a base',
  request: {
    params: z.object({ baseId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: createWorkflowRoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Returns data about the created workflow.',
      content: {
        'application/json': {
          schema: workflowVoSchema,
        },
      },
    },
  },
  tags: ['automation'],
});

export const createWorkflow = async (baseId: string, createWorkflowRo: ICreateWorkflowRo) => {
  return axios.post<ICreateWorkflowVo>(urlBuilder(CREATE_WORKFLOW, { baseId }), createWorkflowRo);
};
