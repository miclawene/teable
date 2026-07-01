import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { generateWorkflowActionRunId, generateWorkflowRunId } from '@teable/core';
import type { IEnginePayload } from '@teable/automation-engine';
import { PrismaService } from '@teable/db-main-prisma';
import type { Job, Queue } from 'bullmq';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationService } from './automation.service';

export const AUTOMATION_ACTIONS_QUEUE = 'automation-actions-queue';

export interface IAutomationActionsJob {
  workflowId: string;
  eventName: string;
  payload: IEnginePayload;
}

/**
 * Executes a matched workflow's actions asynchronously via BullMQ, keeping
 * automation execution off the request path that triggered it (e.g. a
 * record creation). Persists a WorkflowRun + per-action WorkflowActionRun
 * audit trail so executions are observable.
 */
@Injectable()
@Processor(AUTOMATION_ACTIONS_QUEUE)
export class ActionExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ActionExecutionProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly automationService: AutomationService,
    private readonly automationEngineService: AutomationEngineService,
    @InjectQueue(AUTOMATION_ACTIONS_QUEUE) public readonly queue: Queue<IAutomationActionsJob>
  ) {
    super();
  }

  async process(job: Job<IAutomationActionsJob>): Promise<void> {
    const { workflowId, eventName, payload } = job.data;
    const workflow = await this.automationService.getWorkflowForEngine(workflowId);
    if (!workflow) {
      this.logger.warn(`Workflow ${workflowId} no longer exists, skipping run`);
      return;
    }
    const { definition, actionIds } = workflow;

    const client = this.prismaService.txClient();
    const run = await client.workflowRun.create({
      data: {
        id: generateWorkflowRunId(),
        workflowId,
        status: 'running',
        triggerEventName: eventName,
        triggerPayload: JSON.stringify(payload),
        startedTime: new Date(),
      },
    });

    const results = await this.automationEngineService.run(definition, payload);

    await client.workflowActionRun.createMany({
      data: results.map((result, index) => ({
        id: generateWorkflowActionRunId(),
        runId: run.id,
        workflowActionId: actionIds[index] ?? 'unknown',
        status: result.success ? 'success' : 'failed',
        output: result.output !== undefined ? JSON.stringify(result.output) : undefined,
        error: result.error,
        startedTime: new Date(),
        finishedTime: new Date(),
      })),
    });

    const allSucceeded = results.every((result) => result.success);
    await client.workflowRun.update({
      where: { id: run.id },
      data: {
        status: allSucceeded ? 'success' : 'failed',
        error: allSucceeded ? undefined : results.find((r) => !r.success)?.error,
        finishedTime: new Date(),
      },
    });
  }
}
