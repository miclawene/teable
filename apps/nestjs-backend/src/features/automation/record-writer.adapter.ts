import { Injectable } from '@nestjs/common';
import { FieldKeyType } from '@teable/core';
import type { IRecordWriter } from '@teable/automation-engine';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';

/**
 * Satisfies @teable/automation-engine's IRecordWriter contract by delegating
 * to Teable's existing record CRUD service. This is the only place the
 * automation engine's `record.create` action touches Teable-specific code.
 */
@Injectable()
export class RecordWriterAdapter implements IRecordWriter {
  constructor(private readonly recordOpenApiService: RecordOpenApiService) {}

  async createRecords(
    tableId: string,
    records: { fields: Record<string, unknown> }[]
  ): Promise<{ id: string }[]> {
    const result = await this.recordOpenApiService.createRecords(tableId, {
      fieldKeyType: FieldKeyType.Id,
      records,
    });
    return result.records.map((record) => ({ id: record.id }));
  }
}
