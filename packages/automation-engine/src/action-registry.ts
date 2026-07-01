import type { IActionDefinition, IActionResult, IActionType, IEnginePayload } from './types';

/**
 * Registry of available action executors. Executors receive their external
 * dependencies (e.g. a record-writer backed by Teable's record service) via
 * the `deps` parameter, injected by the integration layer that registers
 * them — the engine core never imports Prisma/NestJS/etc.
 */
export class ActionRegistry<TDeps = unknown> {
  private readonly actions = new Map<IActionType, IActionDefinition<Record<string, unknown>, TDeps>>();

  register<TConfig>(definition: IActionDefinition<TConfig, TDeps>): void {
    this.actions.set(definition.type, definition as IActionDefinition<Record<string, unknown>, TDeps>);
  }

  has(type: IActionType): boolean {
    return this.actions.has(type);
  }

  list(): IActionType[] {
    return Array.from(this.actions.keys());
  }

  async execute(
    type: IActionType,
    config: Record<string, unknown>,
    payload: IEnginePayload,
    deps: TDeps
  ): Promise<IActionResult> {
    const definition = this.actions.get(type);
    if (!definition) {
      return { success: false, error: `Unknown action type: ${type}` };
    }
    try {
      return await definition.execute(config, payload, deps);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
