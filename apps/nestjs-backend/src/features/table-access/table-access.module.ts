import { Global, Module } from '@nestjs/common';
import { TableAccessService } from './table-access.service';

@Global()
@Module({
  providers: [TableAccessService],
  exports: [TableAccessService],
})
export class TableAccessModule {}
