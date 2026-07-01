import type { ICondition, IConditionGroup, IEnginePayload, IFieldCondition } from './types';

const isConditionGroup = (condition: ICondition): condition is IConditionGroup => {
  return 'operator' in condition && (condition.operator === 'and' || condition.operator === 'or');
};

const getByPath = (payload: IEnginePayload, path: string): unknown => {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value == null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, payload);
};

const evaluateFieldCondition = (condition: IFieldCondition, payload: IEnginePayload): boolean => {
  const actual = getByPath(payload, condition.field);
  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'eq':
      return actual === condition.value;
    case 'neq':
      return actual !== condition.value;
    case 'contains':
      return typeof actual === 'string' && typeof condition.value === 'string'
        ? actual.includes(condition.value)
        : Array.isArray(actual) && actual.includes(condition.value);
    case 'gt':
      return typeof actual === 'number' && typeof condition.value === 'number' && actual > condition.value;
    case 'lt':
      return typeof actual === 'number' && typeof condition.value === 'number' && actual < condition.value;
    default:
      return false;
  }
};

/**
 * Pure evaluation of a condition tree (AND/OR of field comparisons) against
 * a normalized event payload. No knowledge of Teable's field/table model —
 * `field` is just a dotted path into the payload object.
 */
export const evaluateCondition = (condition: ICondition | undefined, payload: IEnginePayload): boolean => {
  if (!condition) return true;
  if (isConditionGroup(condition)) {
    return condition.operator === 'and'
      ? condition.conditions.every((child) => evaluateCondition(child, payload))
      : condition.conditions.some((child) => evaluateCondition(child, payload));
  }
  return evaluateFieldCondition(condition, payload);
};
