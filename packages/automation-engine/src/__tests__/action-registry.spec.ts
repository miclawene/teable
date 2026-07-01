import { createRecordAction, type IRecordWriter } from '../builtin/actions/create-record.action';
import { ActionRegistry } from '../action-registry';

describe('ActionRegistry', () => {
  it('executes a registered action with injected dependencies', async () => {
    const recordWriter: IRecordWriter = {
      createRecords: vi.fn().mockResolvedValue([{ id: 'rec1' }]),
    };
    const registry = new ActionRegistry<IRecordWriter>();
    registry.register(createRecordAction);

    const result = await registry.execute(
      'record.create',
      { tableId: 'tbl2', fields: { name: 'copied' } },
      {},
      recordWriter
    );

    expect(result).toEqual({ success: true, output: { id: 'rec1' } });
    expect(recordWriter.createRecords).toHaveBeenCalledWith('tbl2', [{ fields: { name: 'copied' } }]);
  });

  it('returns a failure result for an unknown action type', async () => {
    const registry = new ActionRegistry();
    const result = await registry.execute('unknown.action', {}, {}, undefined);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unknown action type/);
  });

  it('catches executor errors and returns a failure result instead of throwing', async () => {
    const registry = new ActionRegistry();
    registry.register({
      type: 'boom',
      execute: async () => {
        throw new Error('kaboom');
      },
    });

    const result = await registry.execute('boom', {}, {}, undefined);
    expect(result).toEqual({ success: false, error: 'kaboom' });
  });
});
