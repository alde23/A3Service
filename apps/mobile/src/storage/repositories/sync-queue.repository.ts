import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import SyncQueueItem, {
  type SyncOperation,
  type SyncStatus,
} from '../models/SyncQueueItem';

type EnqueueSyncOperationInput = {
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  payload: string;
  status?: SyncStatus;
  retries?: number;
};

const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

export function observePendingSyncCount() {
  return syncQueueCollection
    .query(Q.where('status', 'pending'))
    .observeCount(false);
}

async function createSyncQueueItem({
  tableName,
  recordId,
  operation,
  payload,
  status = 'pending',
  retries = 0,
}: EnqueueSyncOperationInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await syncQueueCollection.create((item: any) => {
    item.tableName = tableName;
    item.recordId = recordId;
    item.operation = operation;
    item.payload = payload;
    item.status = status;
    item.retries = retries;
    item.createdAt = new Date();
  });
}

export async function enqueueSyncOperationInCurrentWriter(
  input: EnqueueSyncOperationInput
) {
  await createSyncQueueItem(input);
}

export async function enqueueSyncOperation({
  tableName,
  recordId,
  operation,
  payload,
  status = 'pending',
  retries = 0,
}: EnqueueSyncOperationInput) {
  await database.write(async () => {
    await createSyncQueueItem({
      tableName,
      recordId,
      operation,
      payload,
      status,
      retries,
    });
  });
}

export async function listPendingSyncOperations(limit = 20) {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;

  return await syncQueueCollection
    .query(
      Q.where('status', 'pending'),
      Q.sortBy('created_at', Q.asc),
      Q.take(safeLimit)
    )
    .fetch();
}

async function updateSyncOperationStatusInCurrentWriter(
  id: string,
  status: SyncStatus,
  incrementRetries = false
) {
  const item = await syncQueueCollection.find(id);
  await item.update((record) => {
    record.status = status;
    if (incrementRetries) {
      record.retries = (record.retries ?? 0) + 1;
    }
  });
}

export async function markSyncOperationSynced(id: string) {
  await database.write(async () => {
    await updateSyncOperationStatusInCurrentWriter(id, 'synced');
  });
}

export async function markSyncOperationSyncedInCurrentWriter(id: string) {
  await updateSyncOperationStatusInCurrentWriter(id, 'synced');
}

export async function markSyncOperationFailed(id: string) {
  await database.write(async () => {
    await updateSyncOperationStatusInCurrentWriter(id, 'failed', true);
  });
}

export async function markSyncOperationFailedInCurrentWriter(id: string) {
  await updateSyncOperationStatusInCurrentWriter(id, 'failed', true);
}

export async function retryFailedOperations(maxRetries = 3) {
  const safeMaxRetries =
    Number.isFinite(maxRetries) && maxRetries > 0
      ? Math.floor(maxRetries)
      : 3;

  const failedItems = await syncQueueCollection
    .query(
      Q.where('status', 'failed'),
      Q.where('retries', Q.lt(safeMaxRetries)),
      Q.sortBy('created_at', Q.asc)
    )
    .fetch();

  if (failedItems.length === 0) {
    return 0;
  }

  await database.write(async () => {
    for (const item of failedItems) {
      await item.update((record) => {
        record.status = 'pending';
      });
    }
  });

  return failedItems.length;
}
