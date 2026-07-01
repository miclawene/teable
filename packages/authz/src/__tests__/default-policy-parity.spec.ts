import { Role, RoleLevel, allActions, getPermissions, canManageRole } from '@teable/core';
import { InMemoryPolicyStore } from '../in-memory-policy-store';
import { PolicyEngine } from '../policy-engine';

describe('default policy data parity with @teable/core', () => {
  const engine = new PolicyEngine(new InMemoryPolicyStore());

  it('produces an identical permitted-action set for every default role', () => {
    for (const role of Object.values(Role)) {
      const expected = getPermissions(role).slice().sort();
      const actual = engine.getPermissions(role).slice().sort();
      expect(actual).toEqual(expected);
    }
  });

  it('agrees with @teable/core on every known action for every default role', () => {
    for (const role of Object.values(Role)) {
      for (const action of allActions) {
        expect(engine.hasPermission(role, action)).toBe(getPermissions(role).includes(action));
      }
    }
  });

  it('preserves role ranking equivalent to RoleLevel', () => {
    for (let i = 0; i < RoleLevel.length; i++) {
      for (let j = 0; j < RoleLevel.length; j++) {
        if (i === j) continue;
        const a = RoleLevel[i];
        const b = RoleLevel[j];
        expect(engine.canManageRole(a, b)).toBe(canManageRole(a, b));
      }
    }
  });
});
