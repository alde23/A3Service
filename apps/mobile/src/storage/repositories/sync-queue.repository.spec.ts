import {
  enqueueSyncOperation,
  listPendingSyncOperations,
  markSyncOperationSynced,
  markSyncOperationFailed,
  retryFailedOperations,
} from './sync-queue.repository';
import { database } from '../index';

describe('sync-queue.repository', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.get('sync_queue').query().destroyAllPermanently();
    });
  });

  it('enqueues and lists pending operations', async () => {
    await enqueueSyncOperation({
      tableName: 'jobs',
      recordId: 'r1',
      operation: 'INSERT',
      payload: '{}',
    });

    const pending = await listPendingSyncOperations(10);
    expect(pending.length).toBe(1);
    expect(pending[0].recordId).toBe('r1');
    expect(pending[0].status).toBe('pending');
  });

  it('marks synced', async () => {
    await enqueueSyncOperation({
      tableName: 'jobs',
      recordId: 'r1',
      operation: 'INSERT',
      payload: '{}',
    });
    const pending = await listPendingSyncOperations(10);
    const id = pending[0].id;

    await markSyncOperationSynced(id);

    const updated = await database.get('sync_queue').find(id);
    expect((updated as any).status).toBe('synced');
  });

  it('marks failed', async () => {
    await enqueueSyncOperation({
      tableName: 'jobs',
      recordId: 'r1',
      operation: 'INSERT',
      payload: '{}',
    });
    const pending = await listPendingSyncOperations(10);
    const id = pending[0].id;

    await markSyncOperationFailed(id);

    const updated = await database.get('sync_queue').find(id);
    expect((updated as any).status).toBe('failed');
    expect((updated as any).retries).toBe(1);
  });

  it('retries failed operations', async () => {
    await enqueueSyncOperation({
      tableName: 'jobs',
      recordId: 'r1',
      operation: 'INSERT',
      payload: '{}',
    });
    const pending = await listPendingSyncOperations(10);
    const id = pending[0].id;

    await markSyncOperationFailed(id); // try 1
    
    const retried = await retryFailedOperations(3);
    expect(retried).toBe(1);
    
    const updated = await database.get('sync_queue').find(id);
    expect((updated as any).status).toBe('pending');
  });

  it('does not retry if max retries exceeded', async () => {
    await enqueueSyncOperation({
      tableName: 'jobs',
      recordId: 'r1',
      operation: 'INSERT',
      payload: '{}',
      status: 'failed',
      retries: 3,
    });

    const retried = await retryFailedOperations(3);
    expect(retried).toBe(0);
  });
});
