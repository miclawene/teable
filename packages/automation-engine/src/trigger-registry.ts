import type { IEnginePayload, ITriggerDefinition, ITriggerType } from './types';

/**
 * Registry of available trigger types. New trigger types (schedule, webhook,
 * field-updated, ...) are added by registering a new ITriggerDefinition —
 * the engine core never needs to change.
 */
export class TriggerRegistry {
  private readonly triggers = new Map<ITriggerType, ITriggerDefinition>();

  register<TConfig>(definition: ITriggerDefinition<TConfig>): void {
    this.triggers.set(definition.type, definition as ITriggerDefinition);
  }

  get(type: ITriggerType): ITriggerDefinition | undefined {
    return this.triggers.get(type);
  }

  has(type: ITriggerType): boolean {
    return this.triggers.has(type);
  }

  list(): ITriggerType[] {
    return Array.from(this.triggers.keys());
  }

  matches(type: ITriggerType, payload: IEnginePayload, config: Record<string, unknown>): boolean {
    const definition = this.triggers.get(type);
    if (!definition) return false;
    return definition.matches(payload, config);
  }
}
