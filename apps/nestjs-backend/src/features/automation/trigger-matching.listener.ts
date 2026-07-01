import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IRecord } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type { Queue } from 'bullmq';
import { Events } from '../../event-emitter/events';
import type { RecordCreateEvent } from '../../event-emitter/events';
import { AUTOMATION_ACTIONS_QUEUE, type IAutomationActionsJob } from './action-execution.processor';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationService } from './automation.service';

const RECORD_CREATED_TRIGGER = 'record.created';

/**
 * Bridges Teable's existing domain events (already a decoupled pub/sub
 * surface via EventEmitterService) into the automation engine's trigger
 * matching, without any changes to the record CRUD services that emit them.
 */
@Injectable()
export class TriggerMatchingListener {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly automationService: AutomationService,
    private readonly automationEngineService: AutomationEngineService,
    @InjectQueue(AUTOMATION_ACTIONS_QUEUE) private readonly queue: Queue<IAutomationActionsJob>
  ) {}

  @OnEvent(Events.TABLE_RECORD_CREATE, { async: true })
  async onRecordCreate(event: RecordCreateEvent): Promise<void> {
    const { tableId, record } = event.payload;
    const table = await this.prismaService.txClient().tableMeta.findFirst({
      where: { id: tableId },
      select: { baseId: true },
    });
    if (!table) return;

    const workflows = await this.automationService.listActiveWorkflowsByTrigger(
      table.baseId,
      RECORD_CREATED_TRIGGER
    );
    if (workflows.length === 0) return;

    const records = Array.isArray(record) ? record : [record];
    for (const workflow of workflows) {
      const definition = this.automationService.toEngineDefinition(workflow);
      for (const rec of records as IRecord[]) {
        const payload = { tableId, id: rec.id, fields: rec.fields };
        if (this.automationEngineService.matches(definition, payload)) {
          await this.queue.add(AUTOMATION_ACTIONS_QUEUE, {
            workflowId: workflow.id,
            eventName: Events.TABLE_RECORD_CREATE,
            payload,
          });
        }
      }
    }
  }
}
