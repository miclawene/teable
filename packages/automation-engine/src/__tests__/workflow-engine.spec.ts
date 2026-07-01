import { createRecordAction, type IRecordWriter } from '../builtin/actions/create-record.action';
import { recordCreatedTrigger } from '../builtin/triggers/record-created.trigger';
import { ActionRegistry } from '../action-registry';
import { TriggerRegistry } from '../trigger-registry';
import type { IWorkflowDefinition } from '../types';
import { WorkflowEngine } from '../workflow-engine';

describe('WorkflowEngine end-to-end (record.created -> record.create)', () => {
  const triggers = new TriggerRegistry();
  triggers.register(recordCreatedTrigger);
  const actions = new ActionRegistry<IRecordWriter>();
  actions.register(createRecordAction);
  const engine = new WorkflowEngine<IRecordWriter>(triggers, actions);

  const workflow: IWorkflowDefinition = {
    id: 'wfl_test',
    triggerType: 'record.created',
    triggerConfig: { tableId: 'tblA' },
    conditionConfig: { operator: 'and', conditions: [{ field: 'fields.status', operator: 'eq', value: 'done' }] },
    actions: [{ type: 'record.create', config: { tableId: 'tblB', fields: { copiedFrom: 'tblA' } } }],
  };

  it('does not match when the trigger config does not apply', () => {
    expect(engine.matches(workflow, { tableId: 'tblOther', fields: { status: 'done' } })).toBe(false);
  });

  it('does not match when the condition fails', () => {
    expect(engine.matches(workflow, { tableId: 'tblA', fields: { status: 'todo' } })).toBe(false);
  });

  it('matches and runs its actions end-to-end when trigger and condition both hold', async () => {
    expect(engine.matches(workflow, { tableId: 'tblA', fields: { status: 'done' } })).toBe(true);

    const recordWriter: IRecordWriter = {
      createRecords: vi.fn().mockResolvedValue([{ id: 'recNew' }]),
    };
    const results = await engine.run(workflow, { tableId: 'tblA', fields: { status: 'done' } }, recordWriter);

    expect(results).toEqual([{ success: true, output: { id: 'recNew' } }]);
    expect(recordWriter.createRecords).toHaveBeenCalledWith('tblB', [{ fields: { copiedFrom: 'tblA' } }]);
  });
});
