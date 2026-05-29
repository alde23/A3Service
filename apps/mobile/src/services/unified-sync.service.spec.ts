import { executeUnifiedSync, pullCatalogFromServer } from './unified-sync.service';
import { database } from '../storage';
import { enqueueSyncOperation } from '../storage/repositories/sync-queue.repository';
import { createServiceLog } from '../storage/repositories/service-logs.repository';

const fetchMock = global.fetch as jest.Mock;

describe('unified-sync.service', () => {
  beforeEach(async () => {
    fetchMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    // Clear local SQLite tables between runs
    await database.write(async () => {
      await database.get('sync_queue').query().destroyAllPermanently();
      await database.get('sync_logs').query().destroyAllPermanently();
      await database.get('sync_conflicts').query().destroyAllPermanently();
      await database.get('service_logs').query().destroyAllPermanently();
      await database.get('boiler_models').query().destroyAllPermanently();
      await database.get('parts').query().destroyAllPermanently();
      await database.get('fault_codes').query().destroyAllPermanently();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pulls catalog items and upserts models, parts, and fault codes locally', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'model-eco',
            modelName: 'ecoTEC Plus',
            manufacturerId: 'Vaillant',
            parts: [{ id: 'part-valv', sku: 'VALV-1', name: 'Gas Valve' }],
            faultCodes: [{ id: 'fault-f22', code: 'F22', title: 'Low Water' }],
          },
        ],
      }),
    });

    const itemsCount = await pullCatalogFromServer('token-123');
    expect(itemsCount).toBeGreaterThan(0);

    const models = await database.get('boiler_models').query().fetch();
    expect(models.length).toBe(1);
    expect(models[0].remoteId).toBe('model-eco');

    const parts = await database.get('parts').query().fetch();
    expect(parts.length).toBe(1);
    expect(parts[0].remoteId).toBe('part-valv');
  });

  it('pushes pending transactional queue in proper dependency order and records sync status', async () => {
    // 1. Mock API calls:
    // A. Mock jobs pull
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    // B. Mock catalog pull
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });
    // C. Mock ServiceLog Push
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'remote-log-123' }),
    });

    // 2. Setup mock local record and enqueue insert sync operation
    const log = await createServiceLog('job-abc', 'Completed service', 'All done');

    const summary = await executeUnifiedSync('token-123');
    expect(summary.recordsPushed).toBe(1);
    expect(summary.failures).toBe(0);

    // Verify local record remoteId was successfully updated
    const updated = await database.get('service_logs').find(log.id);
    expect(updated.remoteId).toBe('remote-log-123');

    // Verify local SyncLog was recorded
    const logs = await database.get('sync_logs').query().fetch();
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('success');
  });

  it('handles conflict (409) and writes to sync_conflicts table offline', async () => {
    // A. Mock jobs pull
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    // B. Mock catalog pull
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });
    // C. Mock ServiceLog Push with 409 Conflict status
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Conflict found on job-abc' }),
    });

    await createServiceLog('job-abc', 'Completed service', 'All done');

    const summary = await executeUnifiedSync('token-123');
    expect(summary.recordsPushed).toBe(0);
    expect(summary.failures).toBe(1);

    // Verify SyncConflict record is added
    const conflicts = await database.get('sync_conflicts').query().fetch();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].affectedEntity).toBe('service_logs');
    expect(conflicts[0].status).toBe('OPEN');
  });
});
