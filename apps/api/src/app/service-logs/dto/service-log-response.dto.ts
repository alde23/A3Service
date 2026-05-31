import type { ServiceLogStatus } from '../../../generated/prisma/client';

export type ServiceLogLaborEntryDto = {
  id: string;
  hours: number;
  hourlyRate: string;
  description?: string | null;
};

export type ServiceLogConsumedPartDto = {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: string | null;
  notes?: string | null;
};

export type ServiceLogTotalsDto = {
  laborTotal: string;
  partsTotal: string;
  totalCost: string;
};

export type ServiceLogDto = {
  id: string;
  jobId: string;
  status: ServiceLogStatus;
  summary?: string | null;
  notes?: string | null;
  skippedValidation: boolean;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  laborEntries: ServiceLogLaborEntryDto[];
  consumedParts: ServiceLogConsumedPartDto[];
  totals: ServiceLogTotalsDto;
};

export type ServiceLogListResponse = {
  items: ServiceLogDto[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
};

export type ServiceLogSyncResponse = {
  status: 'SUCCESS' | 'FAIL';
  duplicate: boolean;
  serviceLog: ServiceLogDto;
};
