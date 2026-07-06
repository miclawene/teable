import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  createDepartmentRoSchema,
  updateDepartmentRoSchema,
  addDepartmentMemberRoSchema,
  getDepartmentListRoSchema,
  getDepartmentUserRoSchema,
  type ICreateDepartmentRo,
  type IUpdateDepartmentRo,
  type IAddDepartmentMemberRo,
  type IGetDepartmentListRo,
  type IGetDepartmentListVo,
  type IGetDepartmentUserRo,
  type IGetDepartmentUserVo,
  type IOrganizationMeVo,
} from '@teable/openapi';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { ZodValidationPipe } from '../../zod.validation.pipe';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { OrganizationService } from './organization.service';

@Controller('api/organization')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  @Get('me')
  async getOrganizationMe(): Promise<IOrganizationMeVo> {
    return this.organizationService.getMe(this.cls.get('user.id'));
  }

  @Get('department-user')
  async getDepartmentUsers(
    @Query(new ZodValidationPipe(getDepartmentUserRoSchema)) query: IGetDepartmentUserRo
  ): Promise<IGetDepartmentUserVo> {
    return this.organizationService.getDepartmentUsers(query);
  }

  @Get('department')
  async getDepartmentList(
    @Query(new ZodValidationPipe(getDepartmentListRoSchema)) query: IGetDepartmentListRo
  ): Promise<IGetDepartmentListVo> {
    return this.organizationService.getDepartmentList(query);
  }

  @Post('department')
  @Permissions('instance|update')
  async createDepartment(
    @Body(new ZodValidationPipe(createDepartmentRoSchema)) ro: ICreateDepartmentRo
  ): Promise<{ id: string }> {
    return this.organizationService.createDepartment(ro.name, ro.parentId, this.cls.get('user.id'));
  }

  @Patch('department/:id')
  @Permissions('instance|update')
  async updateDepartment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDepartmentRoSchema)) ro: IUpdateDepartmentRo
  ): Promise<void> {
    return this.organizationService.renameDepartment(id, ro.name);
  }

  @Delete('department/:id')
  @Permissions('instance|update')
  async deleteDepartment(@Param('id') id: string): Promise<void> {
    return this.organizationService.deleteDepartment(id);
  }

  @Post('department/:id/member')
  @Permissions('instance|update')
  async addMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addDepartmentMemberRoSchema)) ro: IAddDepartmentMemberRo
  ): Promise<void> {
    return this.organizationService.addMember(id, ro.userId);
  }

  @Delete('department/:id/member/:userId')
  @Permissions('instance|update')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string): Promise<void> {
    return this.organizationService.removeMember(id, userId);
  }
}
