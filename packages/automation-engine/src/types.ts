export type ITriggerType = string;
export type IActionType = string;

/**
 * Normalized shape of a domain event, as handed to the engine by whatever
 * integration layer bridges it to a real event source (e.g. NestJS's
 * EventEmitter2). The engine itself has no knowledge of where events
 * originate.
 */
export interface IEnginePayload {
  [key: string]: unknown;
}

export interface ITriggerDefinition<TConfig = Record<string, unknown>> {
  type: ITriggerType;
  // Whether a given event payload satisfies this trigger's own config
  // (e.g. "only fire for this tableId"), independent of user-defined
  // conditions layered on top via ConditionEvaluator.
  matches(payload: IEnginePayload, config: TConfig): boolean;
}

export type IConditionOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'exists';

export interface IFieldCondition {
  field: string;
  operator: IConditionOperator;
  value?: unknown;
}

export interface IConditionGroup {
  operator: 'and' | 'or';
  conditions: (IFieldCondition | IConditionGroup)[];
}

export type ICondition = IFieldCondition | IConditionGroup;

export interface IActionResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export interface IActionDefinition<TConfig = Record<string, unknown>, TDeps = unknown> {
  type: IActionType;
  execute(config: TConfig, payload: IEnginePayload, deps: TDeps): Promise<IActionResult>;
}

export interface IWorkflowActionConfig {
  type: IActionType;
  config: Record<string, unknown>;
}

export interface IWorkflowDefinition {
  id: string;
  triggerType: ITriggerType;
  triggerConfig: Record<string, unknown>;
  conditionConfig?: IConditionGroup;
  actions: IWorkflowActionConfig[];
}
