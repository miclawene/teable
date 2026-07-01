import { Injectable } from '@nestjs/common';
import {
  ActionRegistry,
  TriggerRegistry,
  WorkflowEngine,
  createRecordAction,
  recordCreatedTrigger,
  type IEnginePayload,
  type IRecordWriter,
  type IWorkflowDefinition,
} from '@teable/automation-engine';
import { RecordWriterAdapter } from './record-writer.adapter';

/**
 * NestJS-facing entry point for the decoupled automation engine
 * (@teable/automation-engine). Registers the built-in trigger/action pair
 * implemented so far (record.created -> record.create) and wires the
 * `record.create` executor to Teable's real record service via
 * RecordWriterAdapter.
 */
@Injectable()
export class AutomationEngineService {
  private readonly engine: WorkflowEngine<IRecordWriter>;

  constructor(private readonly recordWriterAdapter: RecordWriterAdapter) {
    const triggers = new TriggerRegistry();
    triggers.register(recordCreatedTrigger);

    const actions = new ActionRegistry<IRecordWriter>();
    actions.register(createRecordAction);

    this.engine = new WorkflowEngine<IRecordWriter>(triggers, actions);
  }

  matches(workflow: IWorkflowDefinition, payload: IEnginePayload): boolean {
    return this.engine.matches(workflow, payload);
  }

  run(workflow: IWorkflowDefinition, payload: IEnginePayload) {
    return this.engine.run(workflow, payload, this.recordWriterAdapter);
  }
}
