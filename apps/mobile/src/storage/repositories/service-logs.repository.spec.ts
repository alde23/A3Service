import { database } from '../index';
import {
  createServiceLog,
  updateServiceLog,
  addLaborEntry,
  consumePart,
  deleteServiceLog,
  calculateTotalBilling,
  getServiceLogForJob,
} from './service-logs.repository';

describe('service-logs.repository', () => {
  beforeEach(async () => {
    // Clear SQLite tables
    await database.write(async () => {
      await database.get('sync_queue').query().destroyAllPermanently();
      await database.get('service_logs').query().destroyAllPermanently();
      await database.get('labor_entries').query().destroyAllPermanently();
      await database.get('consumed_parts').query().destroyAllPermanently();
    });
  });

  it('performs service log CRUD operations locally', async () => {
    // A. Create
    const log = await createServiceLog('job-123', 'Testing log', 'Some notes');
    expect(log.jobId).toBe('job-123');
    expect(log.status).toBe('DRAFT');

    const found = await getServiceLogForJob('job-123');
    expect(found?.id).toBe(log.id);

    // B. Update
    await updateServiceLog(log.id, { status: 'SYNCED', summary: 'Updated summary' });
    const updated = await database.get('service_logs').find(log.id);
    expect(updated.status).toBe('SYNCED');
    expect(updated.summary).toBe('Updated summary');

    // C. Queue check
    const pending = await database.get('sync_queue').query().fetch();
    expect(pending.length).toBe(2); // One for insert, one for update
  });

  it('calculates total billing costs and supports cascading deletes', async () => {
    const log = await createServiceLog('job-123', 'Testing billing', '');

    await addLaborEntry(log.id, 2.5, 80, 'Fixed leakage');
    await addLaborEntry(log.id, 1, 100, 'Re-calibration');

    await consumePart(log.id, 'part-pump', 1, 150, 'Replaced pump');
    await consumePart(log.id, 'part-screw', 5, 2.5, 'Screws');

    const summary = await calculateTotalBilling(log.id);
    expect(summary.hoursTotal).toBe(3.5);
    expect(summary.laborCost).toBe(300); // (2.5 * 80) + (1 * 100) = 200 + 100 = 300
    expect(summary.partsCost).toBe(162.5); // (1 * 150) + (5 * 2.5) = 150 + 12.5 = 162.5
    expect(summary.overallTotal).toBe(462.5);

    // Verify cascading deletion cleans up children tables
    await deleteServiceLog(log.id);

    const logs = await database.get('service_logs').query().fetch();
    expect(logs.length).toBe(0);

    const labor = await database.get('labor_entries').query().fetch();
    expect(labor.length).toBe(0);

    const parts = await database.get('consumed_parts').query().fetch();
    expect(parts.length).toBe(0);
  });
});
