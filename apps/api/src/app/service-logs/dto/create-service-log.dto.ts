export type LaborEntryInputDto = {
  hours: number;
  hourlyRate: number;
  description?: string;
};

export type ConsumedPartInputDto = {
  partId: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
};

export class CreateServiceLogDto {
  jobId!: string;
  summary?: string;
  notes?: string;
  laborEntries?: LaborEntryInputDto[];
  consumedParts?: ConsumedPartInputDto[];
}
