import { SyncAction, SyncResult } from '../../../generated/prisma/client';

export type ReconcileItemDto = {
  /** Client-generated unique key to ensure idempotent reconcile calls. */
  idempotencyKey: string;
  /** Sync action type for this item (upload/download/conflict). */
  action: SyncAction;
  /** Entity name the sync item refers to (e.g., Job, ServiceLog). */
  affectedEntity: string;
  /** Entity id for the record being synced. */
  affectedId: string;
  /** Optional job id when the entity relates to a job. */
  jobId?: string;
  /** Optional result override; defaults to SUCCESS when omitted. */
  result?: SyncResult;
  /** Optional client payload snapshot for troubleshooting. */
  payload?: Record<string, unknown>;
};

export type ReconcileDto = {
  /** Batch of items to reconcile in a single request. */
  items: ReconcileItemDto[];
};
