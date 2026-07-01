import { Injectable } from '@nestjs/common';
import { HttpErrorCode, generateWorkflowActionId, generateWorkflowId } from '@teable/core';
import type { IWorkflowDefinition } from '@teable/automation-engine';
import type {
  ICreateWorkflowRo,
  IUpdateWorkflowRo,
  IWorkflowRunVo,
  IWorkflowVo,
} from '@teable/openapi';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { CustomHttpException } from '../../custom.exception';
import type { IClsStore } from '../../types/cls';

@Injectable()
export class AutomationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  private toVo(row: {
    id: string;
    baseId: string;
    name: string;
    description: string | null;
    isActive: boolean;
    triggerType: string;
    triggerConfig: string;
    conditionConfig: string | null;
    createdTime: Date;
    lastModifiedTime: Date | null;
    actions: { actionType: string; actionConfig: string }[];
  }): IWorkflowVo {
    return {
      id: row.id,
      baseId: row.baseId,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      triggerType: row.triggerType,
      triggerConfig: JSON.parse(row.triggerConfig),
      conditionConfig: row.conditionConfig ? JSON.parse(row.conditionConfig) : undefined,
      actions: row.actions.map((action) => ({
        type: action.actionType,
        config: JSON.parse(action.actionConfig),
      })),
      createdTime: row.createdTime.toISOString(),
      lastModifiedTime: row.lastModifiedTime?.toISOString(),
    };
  }

  async createWorkflow(baseId: string, ro: ICreateWorkflowRo): Promise<IWorkflowVo> {
    const userId = this.cls.get('user.id');
    const workflow = await this.prismaService.txClient().workflow.create({
      data: {
        id: generateWorkflowId(),
        baseId,
        name: ro.name,
        description: ro.description,
        triggerType: ro.triggerType,
        triggerConfig: JSON.stringify(ro.triggerConfig),
        conditionConfig: ro.conditionConfig ? JSON.stringify(ro.conditionConfig) : undefined,
        createdBy: userId,
        actions: {
          create: ro.actions.map((action, index) => ({
            id: generateWorkflowActionId(),
            order: index,
            actionType: action.type,
            actionConfig: JSON.stringify(action.config),
          })),
        },
      },
      include: { actions: true },
    });
    return this.toVo(workflow);
  }

  async getWorkflow(baseId: string, workflowId: string): Promise<IWorkflowVo> {
    const workflow = await this.prismaService
      .txClient()
      .workflow.findFirstOrThrow({
        where: { id: workflowId, baseId, deletedTime: null },
        include: { actions: { orderBy: { order: 'asc' } } },
      })
      .catch(() => {
        throw new CustomHttpException('Workflow not found', HttpErrorCode.NOT_FOUND);
      });
    return this.toVo(workflow);
  }

  async listWorkflows(baseId: string): Promise<IWorkflowVo[]> {
    const workflows = await this.prismaService.txClient().workflow.findMany({
      where: { baseId, deletedTime: null },
      include: { actions: { orderBy: { order: 'asc' } } },
      orderBy: { createdTime: 'asc' },
    });
    return workflows.map((workflow) => this.toVo(workflow));
  }

  async updateWorkflow(
    baseId: string,
    workflowId: string,
    ro: IUpdateWorkflowRo
  ): Promise<IWorkflowVo> {
    await this.getWorkflow(baseId, workflowId);
    const client = this.prismaService.txClient();
    if (ro.actions) {
      await client.workflowAction.deleteMany({ where: { workflowId } });
    }
    const workflow = await client.workflow.update({
      where: { id: workflowId },
      data: {
        name: ro.name,
        description: ro.description,
        triggerConfig: ro.triggerConfig ? JSON.stringify(ro.triggerConfig) : undefined,
        conditionConfig: ro.conditionConfig ? JSON.stringify(ro.conditionConfig) : undefined,
        ...(ro.actions && {
          actions: {
            create: ro.actions.map((action, index) => ({
              id: generateWorkflowActionId(),
              order: index,
              actionType: action.type,
              actionConfig: JSON.stringify(action.config),
            })),
          },
        }),
      },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
    return this.toVo(workflow);
  }

  async deleteWorkflow(baseId: string, workflowId: string): Promise<void> {
    await this.getWorkflow(baseId, workflowId);
    await this.prismaService.txClient().workflow.update({
      where: { id: workflowId },
      data: { deletedTime: new Date() },
    });
  }

  async setActive(baseId: string, workflowId: string, isActive: boolean): Promise<void> {
    await this.getWorkflow(baseId, workflowId);
    await this.prismaService.txClient().workflow.update({
      where: { id: workflowId },
      data: { isActive },
    });
  }

  async listActiveWorkflowsByTrigger(baseId: string, triggerType: string) {
    return this.prismaService.txClient().workflow.findMany({
      where: { baseId, triggerType, isActive: true, deletedTime: null },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  toEngineDefinition(row: {
    id: string;
    triggerType: string;
    triggerConfig: string;
    conditionConfig: string | null;
    actions: { actionType: string; actionConfig: string }[];
  }): IWorkflowDefinition {
    return {
      id: row.id,
      triggerType: row.triggerType,
      triggerConfig: JSON.parse(row.triggerConfig),
      conditionConfig: row.conditionConfig ? JSON.parse(row.conditionConfig) : undefined,
      actions: row.actions.map((action) => ({
        type: action.actionType,
        config: JSON.parse(action.actionConfig),
      })),
    };
  }

  async getWorkflowForEngine(
    workflowId: string
  ): Promise<{ definition: IWorkflowDefinition; actionIds: string[] } | null> {
    const row = await this.prismaService.txClient().workflow.findFirst({
      where: { id: workflowId, deletedTime: null },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
    if (!row) return null;
    return {
      definition: this.toEngineDefinition(row),
      actionIds: row.actions.map((action) => action.id),
    };
  }

  async listRuns(baseId: string, workflowId: string): Promise<IWorkflowRunVo[]> {
    await this.getWorkflow(baseId, workflowId);
    const runs = await this.prismaService.txClient().workflowRun.findMany({
      where: { workflowId },
      orderBy: { createdTime: 'desc' },
      take: 50,
    });
    return runs.map((run) => ({
      id: run.id,
      workflowId: run.workflowId,
      status: run.status as IWorkflowRunVo['status'],
      triggerEventName: run.triggerEventName,
      error: run.error,
      startedTime: run.startedTime?.toISOString(),
      finishedTime: run.finishedTime?.toISOString(),
      createdTime: run.createdTime.toISOString(),
    }));
  }
}
