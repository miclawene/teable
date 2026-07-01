import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createWorkflowRoSchema,
  updateWorkflowRoSchema,
  type ICreateWorkflowRo,
  type ICreateWorkflowVo,
  type IGetWorkflowListVo,
  type IGetWorkflowRunListVo,
  type IGetWorkflowVo,
  type IUpdateWorkflowRo,
  type IUpdateWorkflowVo,
} from '@teable/openapi';
import { EmitControllerEvent } from '../../event-emitter/decorators/emit-controller-event.decorator';
import { Events } from '../../event-emitter/events';
import { ZodValidationPipe } from '../../zod.validation.pipe';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AutomationService } from './automation.service';

@Controller('api/base/:baseId/workflow')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  @Permissions('automation|read')
  getWorkflowList(@Param('baseId') baseId: string): Promise<IGetWorkflowListVo> {
    return this.automationService.listWorkflows(baseId);
  }

  @Get(':workflowId')
  @Permissions('automation|read')
  getWorkflow(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<IGetWorkflowVo> {
    return this.automationService.getWorkflow(baseId, workflowId);
  }

  @Post()
  @Permissions('automation|create')
  @EmitControllerEvent(Events.WORKFLOW_CREATE)
  createWorkflow(
    @Param('baseId') baseId: string,
    @Body(new ZodValidationPipe(createWorkflowRoSchema)) ro: ICreateWorkflowRo
  ): Promise<ICreateWorkflowVo> {
    return this.automationService.createWorkflow(baseId, ro);
  }

  @Patch(':workflowId')
  @Permissions('automation|update')
  @EmitControllerEvent(Events.WORKFLOW_UPDATE)
  updateWorkflow(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string,
    @Body(new ZodValidationPipe(updateWorkflowRoSchema)) ro: IUpdateWorkflowRo
  ): Promise<IUpdateWorkflowVo> {
    return this.automationService.updateWorkflow(baseId, workflowId, ro);
  }

  @Delete(':workflowId')
  @Permissions('automation|delete')
  @EmitControllerEvent(Events.WORKFLOW_DELETE)
  deleteWorkflow(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<void> {
    return this.automationService.deleteWorkflow(baseId, workflowId);
  }

  @Post(':workflowId/activate')
  @Permissions('automation|update')
  activateWorkflow(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<void> {
    return this.automationService.setActive(baseId, workflowId, true);
  }

  @Post(':workflowId/deactivate')
  @Permissions('automation|update')
  deactivateWorkflow(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<void> {
    return this.automationService.setActive(baseId, workflowId, false);
  }

  @Get(':workflowId/run')
  @Permissions('automation|read')
  getWorkflowRunList(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<IGetWorkflowRunListVo> {
    return this.automationService.listRuns(baseId, workflowId);
  }
}
