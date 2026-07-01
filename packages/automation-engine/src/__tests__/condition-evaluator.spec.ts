import { evaluateCondition } from '../condition-evaluator';
import type { IConditionGroup } from '../types';

describe('evaluateCondition', () => {
  it('returns true when no condition is given', () => {
    expect(evaluateCondition(undefined, {})).toBe(true);
  });

  it('evaluates a single field condition', () => {
    expect(evaluateCondition({ field: 'status', operator: 'eq', value: 'done' }, { status: 'done' })).toBe(
      true
    );
    expect(evaluateCondition({ field: 'status', operator: 'eq', value: 'done' }, { status: 'todo' })).toBe(
      false
    );
  });

  it('supports nested field paths', () => {
    expect(
      evaluateCondition(
        { field: 'record.fields.priority', operator: 'gt', value: 3 },
        { record: { fields: { priority: 5 } } }
      )
    ).toBe(true);
  });

  it('evaluates AND groups requiring every condition to hold', () => {
    const condition: IConditionGroup = {
      operator: 'and',
      conditions: [
        { field: 'status', operator: 'eq', value: 'done' },
        { field: 'priority', operator: 'gt', value: 3 },
      ],
    };
    expect(evaluateCondition(condition, { status: 'done', priority: 5 })).toBe(true);
    expect(evaluateCondition(condition, { status: 'done', priority: 1 })).toBe(false);
  });

  it('evaluates OR groups requiring at least one condition to hold', () => {
    const condition: IConditionGroup = {
      operator: 'or',
      conditions: [
        { field: 'status', operator: 'eq', value: 'done' },
        { field: 'priority', operator: 'gt', value: 3 },
      ],
    };
    expect(evaluateCondition(condition, { status: 'todo', priority: 5 })).toBe(true);
    expect(evaluateCondition(condition, { status: 'todo', priority: 1 })).toBe(false);
  });

  it('supports nested groups', () => {
    const condition: IConditionGroup = {
      operator: 'and',
      conditions: [
        { field: 'status', operator: 'eq', value: 'done' },
        {
          operator: 'or',
          conditions: [
            { field: 'priority', operator: 'gt', value: 3 },
            { field: 'urgent', operator: 'eq', value: true },
          ],
        },
      ],
    };
    expect(evaluateCondition(condition, { status: 'done', priority: 1, urgent: true })).toBe(true);
    expect(evaluateCondition(condition, { status: 'done', priority: 1, urgent: false })).toBe(false);
  });

  it('exists operator checks for presence', () => {
    expect(evaluateCondition({ field: 'foo', operator: 'exists' }, { foo: 'bar' })).toBe(true);
    expect(evaluateCondition({ field: 'foo', operator: 'exists' }, {})).toBe(false);
  });
});
