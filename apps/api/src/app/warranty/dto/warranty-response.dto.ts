import type { WarrantyStatus } from '../../../generated/prisma/client';

export type WarrantyDto = {
  id: string;
  boilerModelId: string;
  jobId: string | null;
  startDate: string;
  durationMonths: number;
  expiresAt: string | null;
  status: WarrantyStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WarrantyListResponse = {
  items: WarrantyDto[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
};
