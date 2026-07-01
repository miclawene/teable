import { ActionRegistry } from './action-registry';
import { evaluateCondition } from './condition-evaluator';
import { TriggerRegistry } from './trigger-registry';
import type { IActionResult, IEnginePayload, IWorkflowDefinition } from './types';

/**
 * Orchestrates matching a single workflow definition against an incoming
 * event payload, and running its actions in order when matched. Framework
 * and storage agnostic: the integration layer is responsible for loading
 * IWorkflowDefinition rows and calling this per candidate workflow.
 */
export class WorkflowEngine<TDeps = unknown> {
  constructor(
    private readonly triggers: TriggerRegistry = new TriggerRegistry(),
    private readonly actions: ActionRegistry<TDeps> = new ActionRegistry<TDeps>()
  ) {}

  get triggerRegistry(): TriggerRegistry {
    return this.triggers;
  }

  get actionRegistry(): ActionRegistry<TDeps> {
    return this.actions;
  }

  matches(workflow: IWorkflowDefinition, payload: IEnginePayload): boolean {
    if (!this.triggers.matches(workflow.triggerType, payload, workflow.triggerConfig)) {
      return false;
    }
    return evaluateCondition(workflow.conditionConfig, payload);
  }

  async run(workflow: IWorkflowDefinition, payload: IEnginePayload, deps: TDeps): Promise<IActionResult[]> {
    const results: IActionResult[] = [];
    for (const action of workflow.actions) {
      const result = await this.actions.execute(action.type, action.config, payload, deps);
      results.push(result);
      if (!result.success) break;
    }
    return results;
  }
}
