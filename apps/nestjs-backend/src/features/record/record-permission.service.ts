import { Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { AuthorityMatrixService } from '../authority-matrix/authority-matrix.service';

export type IWrapViewQuery = {
  keepPrimaryKey?: boolean;
  viewId?: string;
};

export type IRecordReadQuerySource = {
  tableName: string;
  cteName: string;
  cteSql: string;
  enabledFieldIds?: string[];
};

@Injectable()
export class RecordPermissionService {
  constructor(private readonly authorityMatrixService: AuthorityMatrixService) {}

  async getReadQuerySource(
    _tableId: string,
    _query?: IWrapViewQuery
  ): Promise<IRecordReadQuerySource | undefined> {
    return undefined;
  }

  async wrapView(
    tableId: string,
    builder: Knex.QueryBuilder,
    _query?: IWrapViewQuery
  ): Promise<{ viewCte?: string; builder: Knex.QueryBuilder; enabledFieldIds?: string[] }> {
    const enabledFieldIds = await this.authorityMatrixService.getEnabledFieldIds(tableId);
    return {
      viewCte: undefined,
      builder,
      enabledFieldIds,
    };
  }
}
