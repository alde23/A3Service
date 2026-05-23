import type { ConsumedPartInputDto, LaborEntryInputDto } from './create-service-log.dto';

export class UpdateServiceLogDto {
  summary?: string;
  notes?: string;
  laborEntries?: LaborEntryInputDto[];
  consumedParts?: ConsumedPartInputDto[];
}
