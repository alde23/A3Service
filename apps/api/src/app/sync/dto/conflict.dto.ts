import type { ConflictResolutionPolicy, ConflictStatus } from '../../../generated/prisma/client';

export type SyncConflictDto = {
  id: string;
  affectedEntity: string;
  affectedId: string;
  status: ConflictStatus;
  policy: ConflictResolutionPolicy | null;
  details: Record<string, unknown> | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyncConflictListResponse = {
  items: SyncConflictDto[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
};

export type ResolveSyncConflictDto = {
  conflictId: string;
  policy: ConflictResolutionPolicy;
  resolutionNotes?: string;
};

export type ResolveSyncConflictResponse = {
  conflict: SyncConflictDto;
  logId: string;
};
