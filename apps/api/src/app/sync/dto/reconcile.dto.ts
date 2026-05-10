import { SyncAction, SyncResult } from '../../../generated/prisma/client';

export type ReconcileItemDto = {
  idempotencyKey: string;
  action: SyncAction;
  affectedEntity: string;
  affectedId: string;
  jobId?: string;
  result?: SyncResult;
  payload?: Record<string, unknown>;
};

export type ReconcileDto = {
  items: ReconcileItemDto[];
};
