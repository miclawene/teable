import { z } from '../zod';

// Mirrors @teable/automation-engine's IFieldCondition/IConditionGroup shapes.
// Kept as an independently-defined zod schema (rather than importing runtime
// types from the engine package) so @teable/openapi has no dependency on the
// automation engine's implementation, only on the wire shape.
export const conditionOperatorSchema = z.enum(['eq', 'neq', 'contains', 'gt', 'lt', 'exists']);

export const fieldConditionSchema = z.object({
  field: z.string(),
  operator: conditionOperatorSchema,
  value: z.unknown().optional(),
});

export const conditionGroupSchema: z.ZodType<{
  operator: 'and' | 'or';
  conditions: unknown[];
}> = z
  .lazy(() =>
    z.object({
      operator: z.enum(['and', 'or']),
      conditions: z.array(z.union([fieldConditionSchema, conditionGroupSchema])),
    })
  )
  // zod-to-openapi cannot introspect z.lazy() schemas on its own (same
  // limitation as packages/core's filter.ts); an explicit type hint here
  // is required or OpenAPI schema generation throws at server bootstrap.
  .meta({
    type: 'object',
    description: 'A tree of AND/OR field conditions gating whether a workflow run fires.',
  });

export type IConditionGroupRo = z.infer<typeof conditionGroupSchema>;

export const workflowActionConfigSchema = z.object({
  type: z.string(),
  config: z.record(z.string(), z.unknown()),
});

export type IWorkflowActionConfigRo = z.infer<typeof workflowActionConfigSchema>;

export const workflowVoSchema = z.object({
  id: z.string(),
  baseId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  triggerType: z.string(),
  triggerConfig: z.record(z.string(), z.unknown()),
  conditionConfig: conditionGroupSchema.optional().nullable(),
  actions: z.array(workflowActionConfigSchema),
  createdTime: z.string(),
  lastModifiedTime: z.string().nullable().optional(),
});

export type IWorkflowVo = z.infer<typeof workflowVoSchema>;

export const workflowRunVoSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(['pending', 'running', 'success', 'failed']),
  triggerEventName: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  startedTime: z.string().nullable().optional(),
  finishedTime: z.string().nullable().optional(),
  createdTime: z.string(),
});

export type IWorkflowRunVo = z.infer<typeof workflowRunVoSchema>;
