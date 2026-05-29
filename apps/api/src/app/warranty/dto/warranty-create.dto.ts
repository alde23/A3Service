import type { CommissioningReadingDto } from '../../commissioning/dto/commissioning-validate.dto';

export class WarrantyCreateDto {
  jobId!: string;
  boilerModelId!: string;
  startDate?: string;
  durationMonths?: number;
  notes?: string;
  readings!: CommissioningReadingDto[];
}
