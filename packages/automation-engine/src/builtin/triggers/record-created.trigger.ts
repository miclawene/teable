import type { IEnginePayload, ITriggerDefinition } from '../../types';

export interface IRecordCreatedTriggerConfig {
  tableId: string;
}

export interface IRecordCreatedPayload extends IEnginePayload {
  tableId: string;
  recordIds: string[];
}

export const recordCreatedTrigger: ITriggerDefinition<IRecordCreatedTriggerConfig> = {
  type: 'record.created',
  matches: (payload, config) => (payload as IRecordCreatedPayload).tableId === config.tableId,
};
