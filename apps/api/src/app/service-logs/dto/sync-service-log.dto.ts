import type { ConsumedPartInputDto, LaborEntryInputDto } from './create-service-log.dto';

export class SyncServiceLogDto {
  idempotencyKey!: string;
  jobId!: string;
  summary?: string;
  notes?: string;
  laborEntries?: LaborEntryInputDto[];
  consumedParts?: ConsumedPartInputDto[];
}
