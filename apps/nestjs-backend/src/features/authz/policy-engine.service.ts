import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { IActionName, IRoleName } from '@teable/authz';
import { PolicyEngine } from '@teable/authz';
import { PrismaPolicyStore } from './prisma-policy-store';

/**
 * NestJS-facing entry point for the decoupled RBAC engine (@teable/authz).
 * Mirrors the method signatures @teable/core's permission.ts used to expose
 * (getPermissions/hasPermission/canManageRole) so PermissionService can be
 * rewired with a mechanical swap of the resolution source, not a rewrite.
 */
@Injectable()
export class PolicyEngineService implements OnModuleInit {
  private readonly engine: PolicyEngine;

  constructor(private readonly store: PrismaPolicyStore) {
    this.engine = new PolicyEngine(this.store);
  }

  async onModuleInit() {
    await this.store.refresh();
  }

  async refresh(): Promise<void> {
    await this.store.refresh();
  }

  getPermissions(role: IRoleName): IActionName[] {
    return this.engine.getPermissions(role);
  }

  hasPermission(role: IRoleName, action: IActionName): boolean {
    return this.engine.hasPermission(role, action);
  }

  checkPermissions(role: IRoleName, actions: IActionName[]): boolean {
    return this.engine.checkPermissions(role, actions);
  }

  canManageRole(managerRole: IRoleName, targetRole: IRoleName): boolean {
    return this.engine.canManageRole(managerRole, targetRole);
  }

  listRoles(): IRoleName[] {
    return this.engine.listRoles();
  }
}
