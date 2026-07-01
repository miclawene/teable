import type { IActionDefinition } from '../../types';

export interface ICreateRecordActionConfig {
  tableId: string;
  fields: Record<string, unknown>;
}

/**
 * Dependency contract the integration layer must satisfy to execute this
 * action — kept minimal so the engine never depends on Prisma/NestJS or
 * Teable's record service directly.
 */
export interface IRecordWriter {
  createRecords(tableId: string, records: { fields: Record<string, unknown> }[]): Promise<{ id: string }[]>;
}

export const createRecordAction: IActionDefinition<ICreateRecordActionConfig, IRecordWriter> = {
  type: 'record.create',
  execute: async (config, _payload, recordWriter) => {
    const [created] = await recordWriter.createRecords(config.tableId, [{ fields: config.fields }]);
    return { success: true, output: created };
  },
};
