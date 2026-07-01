import { InMemoryPolicyStore } from '../in-memory-policy-store';
import { PolicyEngine } from '../policy-engine';
import type { IPolicyStore } from '../types';

describe('PolicyEngine with a custom PolicyStore', () => {
  it('resolves permissions from any IPolicyStore implementation, not just the default', () => {
    const customStore: IPolicyStore = {
      getRoleDefinition: (role) =>
        role === 'analyst' ? { name: 'analyst', rank: 5, isSystem: false } : undefined,
      listRoleDefinitions: () => [{ name: 'analyst', rank: 5, isSystem: false }],
      getPermittedActions: (role) => (role === 'analyst' ? ['record|read', 'view|read'] : []),
    };
    const engine = new PolicyEngine(customStore);

    expect(engine.hasPermission('analyst', 'record|read')).toBe(true);
    expect(engine.hasPermission('analyst', 'record|create')).toBe(false);
    expect(engine.checkPermissions('analyst', ['record|read', 'view|read'])).toBe(true);
    expect(engine.checkPermissions('analyst', ['record|read', 'record|create'])).toBe(false);
    expect(engine.getPermissions('unknown-role')).toEqual([]);
  });

  it('allows registering a brand new custom role at runtime via InMemoryPolicyStore', () => {
    const store = new InMemoryPolicyStore([], {});
    store.upsertRole({ name: 'auditor', rank: 10, isSystem: false }, ['table_record_history|read']);
    const engine = new PolicyEngine(store);

    expect(engine.hasPermission('auditor', 'table_record_history|read')).toBe(true);
    expect(engine.hasPermission('auditor', 'record|create')).toBe(false);
    expect(engine.listRoles()).toEqual(['auditor']);
  });

  it('canManageRole is false for unknown roles', () => {
    const engine = new PolicyEngine(new InMemoryPolicyStore([], {}));
    expect(engine.canManageRole('owner', 'viewer')).toBe(false);
  });
});
