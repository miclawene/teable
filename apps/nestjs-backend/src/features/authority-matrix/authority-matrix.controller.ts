import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  updateAuthorityMatrixRoSchema,
  updateTableAccessRoSchema,
  updateFieldPrincipalPermissionsRoSchema,
  type IAuthorityMatrixVo,
  type IUpdateAuthorityMatrixRo,
  type IUpdateTableAccessRo,
  type IUpdateFieldPrincipalPermissionsRo,
} from '@teable/openapi';
import { ZodValidationPipe } from '../../zod.validation.pipe';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuthorityMatrixService } from './authority-matrix.service';

@Controller('api/base/:baseId/authority-matrix')
@Permissions('base|authority_matrix_config')
export class AuthorityMatrixController {
  constructor(private readonly authorityMatrixService: AuthorityMatrixService) {}

  @Get()
  getMatrix(@Param('baseId') baseId: string): Promise<IAuthorityMatrixVo> {
    return this.authorityMatrixService.getMatrix(baseId);
  }

  @Put()
  updateMatrix(
    @Param('baseId') baseId: string,
    @Body(new ZodValidationPipe(updateAuthorityMatrixRoSchema)) ro: IUpdateAuthorityMatrixRo
  ): Promise<void> {
    return this.authorityMatrixService.setPermissions(baseId, ro.updates);
  }

  @Put('table/:tableId/access')
  updateTableAccess(
    @Param('baseId') baseId: string,
    @Param('tableId') tableId: string,
    @Body(new ZodValidationPipe(updateTableAccessRoSchema)) ro: IUpdateTableAccessRo
  ): Promise<void> {
    return this.authorityMatrixService.setTableAccessGrants(baseId, tableId, ro.grants);
  }

  @Put('table/:tableId/principal-permissions')
  updateFieldPrincipalPermissions(
    @Param('baseId') baseId: string,
    @Param('tableId') tableId: string,
    @Body(new ZodValidationPipe(updateFieldPrincipalPermissionsRoSchema))
    ro: IUpdateFieldPrincipalPermissionsRo
  ): Promise<void> {
    return this.authorityMatrixService.setFieldPrincipalPermissions(baseId, tableId, ro.updates);
  }
}
