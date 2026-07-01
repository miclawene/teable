import { Global, Module } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import { PrismaPolicyStore } from './prisma-policy-store';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

/**
 * Wires the decoupled RBAC engine (@teable/authz) into the NestJS app.
 * Global so PermissionService (in PermissionModule) can inject
 * PolicyEngineService without an explicit import cycle.
 */
@Global()
@Module({
  providers: [PrismaPolicyStore, PolicyEngineService, RoleService],
  controllers: [RoleController],
  exports: [PolicyEngineService],
})
export class AuthzModule {}
