import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../zod.validation.pipe';
import { RoleService, type ICreateRoleRo } from './role.service';

const createRoleRoSchema = z.object({
  name: z.string().min(1),
  rank: z.number().int(),
  actions: z.array(z.string()),
});

/**
 * Minimal, API-only surface for managing custom roles on top of the
 * decoupled RBAC engine. Instance-admin only, mirroring the existing
 * `api/admin` controller's `instance|update` guard convention.
 */
@Controller('api/admin/role')
@Permissions('instance|update')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  listRoles() {
    return this.roleService.listRoles();
  }

  @Post()
  createRole(@Body(new ZodValidationPipe(createRoleRoSchema)) ro: ICreateRoleRo) {
    return this.roleService.createRole(ro);
  }

  @Delete(':name')
  deleteRole(@Param('name') name: string) {
    return this.roleService.deleteRole(name);
  }
}
