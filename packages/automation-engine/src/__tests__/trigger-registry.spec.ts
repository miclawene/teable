import { recordCreatedTrigger } from '../builtin/triggers/record-created.trigger';
import { TriggerRegistry } from '../trigger-registry';

describe('TriggerRegistry', () => {
  it('registers and looks up trigger definitions by type', () => {
    const registry = new TriggerRegistry();
    registry.register(recordCreatedTrigger);

    expect(registry.has('record.created')).toBe(true);
    expect(registry.list()).toEqual(['record.created']);
    expect(registry.get('record.created')).toBe(recordCreatedTrigger);
  });

  it('matches payload against trigger config', () => {
    const registry = new TriggerRegistry();
    registry.register(recordCreatedTrigger);

    expect(registry.matches('record.created', { tableId: 'tbl1' }, { tableId: 'tbl1' })).toBe(true);
    expect(registry.matches('record.created', { tableId: 'tbl2' }, { tableId: 'tbl1' })).toBe(false);
  });

  it('returns false for an unregistered trigger type', () => {
    const registry = new TriggerRegistry();
    expect(registry.matches('unknown.type', {}, {})).toBe(false);
  });

  it('supports registering new custom trigger types without changing the registry', () => {
    const registry = new TriggerRegistry();
    registry.register({
      type: 'custom.event',
      matches: (payload) => payload.flag === true,
    });

    expect(registry.matches('custom.event', { flag: true }, {})).toBe(true);
    expect(registry.matches('custom.event', { flag: false }, {})).toBe(false);
  });
});
