import { syncJobsWithServer, pullJobsFromServer } from './jobs-sync.service';
import { database } from '../storage';

jest.mock('../storage/repositories/sync-queue.repository', () => ({
  listPendingSyncOperations: jest.fn().mockResolvedValue([]),
  markSyncOperationFailed: jest.fn(),
  markSyncOperationSynced: jest.fn(),
  markSyncOperationSyncedInCurrentWriter: jest.fn(),
}));

describe('jobs-sync.service', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.get('jobs').query().destroyAllPermanently();
    });
    jest.restoreAllMocks();
    global.fetch = jest.fn();
  });

  describe('pullJobsFromServer', () => {
    it('throws error if response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(pullJobsFromServer('token-123')).rejects.toThrow('Pull jobs failed (500)');
    });

    it('throws error if response is not an array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      await expect(pullJobsFromServer('token-123')).rejects.toThrow('Pull jobs response is not an array');
    });

    it('pulls jobs from server and upserts them', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'job-1',
            siteId: 'site-1',
            technicianId: 'tech-1',
            scheduledDate: new Date().toISOString(),
            estimatedDuration: 60,
            status: 'PENDING',
            notes: 'Test note',
            rawAddress: 'Test address',
          },
        ],
      });

      const count = await pullJobsFromServer('token-123');
      expect(count).toBe(1);

      const jobs = await database.get('jobs').query().fetch();
      expect(jobs.length).toBe(1);
    });
  });

  describe('syncJobsWithServer (pushPendingQueue)', () => {
    it('returns a sync summary', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const summary = await syncJobsWithServer('token-123');
      expect(summary.pulled).toBe(0);
      expect(summary.pushed).toBe(0);
      expect(summary.failed).toBe(0);
    });

    it('pushes pending operations', async () => {
      await database.write(async () => {
        await database.get('jobs').create((job: any) => {
          job._raw.id = 'l1';
          job.siteId = 'site-1';
        });
      });

      const syncQueueMock = require('../storage/repositories/sync-queue.repository');
      syncQueueMock.listPendingSyncOperations.mockResolvedValueOnce([
        { id: 'q-1', tableName: 'jobs', operation: 'INSERT', payload: JSON.stringify({ localJobId: 'l1', rawAddress: 'address' }), recordId: 'l1' },
        { id: 'q-2', tableName: 'jobs', operation: 'UPDATE', payload: JSON.stringify({ remoteId: 'r1', status: 'COMPLETED' }), recordId: 'l2' },
        { id: 'q-invalid', tableName: 'other', operation: 'INSERT', payload: '{}' },
      ]);
      
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (options.method === 'GET') {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        if (options.method === 'POST') {
          return Promise.resolve({ ok: true, json: async () => ({ id: 'r2' }) });
        }
        if (options.method === 'PATCH') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });

      const summary = await syncJobsWithServer('token-123');
      expect(summary.pushed).toBe(2);
      expect(summary.failed).toBe(1);
    });
  });
});
