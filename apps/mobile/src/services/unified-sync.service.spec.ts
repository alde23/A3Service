import { executeUnifiedSync, pullCatalogFromServer } from './unified-sync.service';
import { database } from '../storage';
import { createServiceLog } from '../storage/repositories/service-logs.repository';
import BoilerModel from '../storage/models/BoilerModel';
import Part from '../storage/models/Part';
import ServiceLog from '../storage/models/ServiceLog';
import SyncLog from '../storage/models/SyncLog';
import SyncConflict from '../storage/models/SyncConflict';


jest.mock('./jobs-sync.service', () => ({
  pullJobsFromServer: jest.fn().mockResolvedValue(0),
  syncJobsWithServer: jest.fn().mockResolvedValue({ pulled: 0, pushed: 0, failed: 0 }),
}));

const fetchMock = global.fetch as jest.Mock;

describe('unified-sync.service', () => {
  beforeEach(async () => {
    fetchMock.mockReset();
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
      await database.get('app_preferences').query().destroyAllPermanently();
      await database.get('expenses').query().destroyAllPermanently();
      await database.get('warranties').query().destroyAllPermanently();
      await database.get('labor_entries').query().destroyAllPermanently();
      await database.get('consumed_parts').query().destroyAllPermanently();
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

    const models = await database.get<BoilerModel>('boiler_models').query().fetch();
    expect(models.length).toBe(1);
    expect(models[0].remoteId).toBe('model-eco');

    const parts = await database.get<Part>('parts').query().fetch();
    expect(parts.length).toBe(1);
    expect(parts[0].remoteId).toBe('part-valv');
  });

  it('pushes pending transactional queue in proper dependency order and records sync status', async () => {
    // 1. Mock API calls
    fetchMock.mockImplementation((url, options) => {
      if (url.includes('/library/models')) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
      if (options?.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ id: 'remote-log-123' }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    // 2. Setup mock local record and enqueue insert sync operation
    const log = await createServiceLog('job-abc', 'Completed service', 'All done');

    const summary = await executeUnifiedSync('token-123');
    expect(summary.recordsPushed).toBe(1);
    expect(summary.failures).toBe(0);

    // Verify local record remoteId was successfully updated
    const updated = await database.get<ServiceLog>('service_logs').find(log.id);
    expect(updated.remoteId).toBe('remote-log-123');

    // Verify local SyncLog was recorded
    const logs = await database.get<SyncLog>('sync_logs').query().fetch();
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('success');
  });

  it('handles conflict (409) and writes to sync_conflicts table offline', async () => {
    fetchMock.mockImplementation((url, options) => {
      if (url.includes('/library/models')) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
      if (options?.method === 'POST') return Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'Conflict' }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await createServiceLog('job-abc', 'Completed service', 'All done');

    const summary = await executeUnifiedSync('token-123');
    expect(summary.recordsPushed).toBe(0);
    expect(summary.failures).toBe(1);

    // Verify SyncConflict record is added
    const conflicts = await database.get<SyncConflict>('sync_conflicts').query().fetch();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].affectedEntity).toBe('service_logs');
    expect(conflicts[0].status).toBe('OPEN');
  });

  it('pushes expenses (INSERT, UPDATE, DELETE) successfully', async () => {
    fetchMock.mockImplementation((url, options) => {
      if (url.includes('/library/models')) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
      if (options?.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ id: 'remote-' + Math.random() }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await database.write(async () => {
      const exp1 = await database.get('expenses').create((rec: any) => {
        rec.jobId = 'j1';
        rec.amount = 100;
        rec.currency = 'USD';
        rec.description = 'Tolls';
      });
      await database.get('sync_queue').create((queue: any) => {
        queue.tableName = 'expenses';
        queue.recordId = exp1.id;
        queue.operation = 'INSERT';
        queue.payload = JSON.stringify({ jobId: 'j1', amount: 100, currency: 'USD', description: 'Tolls' });
        queue.status = 'pending';
      });

      const exp2 = await database.get('expenses').create((rec: any) => { rec.remoteId = 'rem2'; rec.jobId = 'j1'; rec.amount = 200; });
      await database.get('sync_queue').create((queue: any) => {
        queue.tableName = 'expenses';
        queue.recordId = exp2.id;
        queue.operation = 'UPDATE';
        queue.payload = JSON.stringify({ remoteId: 'rem2', amount: 250 });
        queue.status = 'pending';
      });

      const exp3 = await database.get('expenses').create((rec: any) => { rec.remoteId = 'rem3'; rec.jobId = 'j1'; rec.amount = 300; });
      await database.get('sync_queue').create((queue: any) => {
        queue.tableName = 'expenses';
        queue.recordId = exp3.id;
        queue.operation = 'DELETE';
        queue.payload = JSON.stringify({ remoteId: 'rem3' });
        queue.status = 'pending';
      });
    });

    const summary = await executeUnifiedSync('token-123');
    console.log('EXPENSES SUMMARY:', summary);
    expect(summary.recordsPushed).toBe(3);
    expect(summary.failures).toBe(0);
  });

  it('pushes warranties, labor entries, and consumed parts', async () => {
    fetchMock.mockImplementation((url, options) => {
      if (url.includes('/library/models')) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
      if (options?.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ id: 'remote-' + Math.random() }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await database.write(async () => {
      const w = await database.get('warranties').create((rec: any) => { rec.jobId = 'j1'; });
      await database.get('sync_queue').create((q: any) => {
        q.tableName = 'warranties';
        q.recordId = w.id;
        q.operation = 'INSERT';
        q.payload = JSON.stringify({ jobId: 'j1' });
        q.status = 'pending';
      });

      const log = await database.get('service_logs').create((rec: any) => { rec.jobId = 'j1'; });
      await database.get('sync_queue').create((q: any) => {
        q.tableName = 'service_logs';
        q.recordId = log.id;
        q.operation = 'INSERT';
        q.payload = JSON.stringify({ jobId: 'j1' });
        q.status = 'pending';
      });

      const labor = await database.get('labor_entries').create((rec: any) => { rec.serviceLogId = log.id; });
      await database.get('sync_queue').create((q: any) => {
        q.tableName = 'labor_entries';
        q.recordId = labor.id;
        q.operation = 'INSERT';
        q.payload = JSON.stringify({ serviceLogId: log.id, hours: 2 });
        q.status = 'pending';
      });

      const part = await database.get('consumed_parts').create((rec: any) => { rec.serviceLogId = log.id; });
      await database.get('sync_queue').create((q: any) => {
        q.tableName = 'consumed_parts';
        q.recordId = part.id;
        q.operation = 'INSERT';
        q.payload = JSON.stringify({ serviceLogId: log.id, partId: 'p1' });
        q.status = 'pending';
      });
    });

    const summary = await executeUnifiedSync('token-123');
    console.log('WARRANTIES SUMMARY:', summary);
    expect(summary.recordsPushed).toBe(4);
    expect(summary.failures).toBe(0);
  });
});
