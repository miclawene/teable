import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventJobModule } from '../../event-emitter/event-job/event-job.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module';
import { ActionExecutionProcessor, AUTOMATION_ACTIONS_QUEUE } from './action-execution.processor';
import { AutomationController } from './automation.controller';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationService } from './automation.service';
import { RecordWriterAdapter } from './record-writer.adapter';
import { TriggerMatchingListener } from './trigger-matching.listener';

@Module({
  imports: [EventJobModule.registerQueue(AUTOMATION_ACTIONS_QUEUE), RecordOpenApiModule, EventEmitterModule],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    AutomationEngineService,
    RecordWriterAdapter,
    ActionExecutionProcessor,
    TriggerMatchingListener,
  ],
  exports: [AutomationService],
})
export class AutomationModule {}
