import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import ServiceLog from '../models/ServiceLog';
import LaborEntry from '../models/LaborEntry';
import ConsumedPart from '../models/ConsumedPart';
import { enqueueSyncOperationInCurrentWriter } from './sync-queue.repository';

const logsCollection = database.get<ServiceLog>('service_logs');
const laborCollection = database.get<LaborEntry>('labor_entries');
const consumedPartsCollection = database.get<ConsumedPart>('consumed_parts');

export async function getServiceLogForJob(jobId: string): Promise<ServiceLog | null> {
  const records = await logsCollection
    .query(Q.where('job_id', jobId), Q.take(1))
    .fetch();
  return records[0] ?? null;
}

export async function createServiceLog(
  jobId: string,
  summary: string,
  notes: string
): Promise<ServiceLog> {
  let createdLog!: ServiceLog;
  await database.write(async () => {
    createdLog = await logsCollection.create((log) => {
      log.jobId = jobId;
      log.status = 'DRAFT';
      log.summary = summary;
      log.notes = notes;
      log.syncedAt = null;
      log.remoteId = null;
    });

    await enqueueSyncOperationInCurrentWriter({
      tableName: 'service_logs',
      recordId: createdLog.id,
      operation: 'INSERT',
      payload: JSON.stringify({
        jobId,
        status: 'DRAFT',
        summary,
        notes,
        localLogId: createdLog.id,
      }),
    });
  });

  return createdLog;
}

export async function updateServiceLog(
  logId: string,
  updates: { summary?: string; notes?: string; status?: string }
): Promise<ServiceLog> {
  const log = await logsCollection.find(logId);
  await database.write(async () => {
    await log.update((record) => {
      if (updates.summary !== undefined) record.summary = updates.summary;
      if (updates.notes !== undefined) record.notes = updates.notes;
      if (updates.status !== undefined) record.status = updates.status;
    });

    const isRemote = Boolean(log.remoteId);
    await enqueueSyncOperationInCurrentWriter({
      tableName: 'service_logs',
      recordId: log.id,
      operation: isRemote ? 'UPDATE' : 'INSERT',
      payload: JSON.stringify({
        remoteId: log.remoteId || null,
        jobId: log.jobId,
        status: log.status,
        summary: log.summary,
        notes: log.notes,
        localLogId: log.id,
      }),
    });
  });
  return log;
}

export async function addLaborEntry(
  logId: string,
  hours: number,
  hourlyRate: number,
  description: string
): Promise<LaborEntry> {
  let createdEntry!: LaborEntry;
  await database.write(async () => {
    createdEntry = await laborCollection.create((entry) => {
      entry.serviceLogId = logId;
      entry.hours = hours;
      entry.hourlyRate = hourlyRate;
      entry.description = description;
      entry.remoteId = null;
    });

    await enqueueSyncOperationInCurrentWriter({
      tableName: 'labor_entries',
      recordId: createdEntry.id,
      operation: 'INSERT',
      payload: JSON.stringify({
        serviceLogId: logId,
        hours,
        hourlyRate,
        description,
        localEntryId: createdEntry.id,
      }),
    });
  });
  return createdEntry;
}

export async function consumePart(
  logId: string,
  partId: string,
  quantity: number,
  unitPrice: number | null,
  notes: string
): Promise<ConsumedPart> {
  let createdPart!: ConsumedPart;
  await database.write(async () => {
    createdPart = await consumedPartsCollection.create((item) => {
      item.serviceLogId = logId;
      item.partId = partId;
      item.quantity = quantity;
      item.unitPrice = unitPrice;
      item.notes = notes;
      item.remoteId = null;
    });

    await enqueueSyncOperationInCurrentWriter({
      tableName: 'consumed_parts',
      recordId: createdPart.id,
      operation: 'INSERT',
      payload: JSON.stringify({
        serviceLogId: logId,
        partId,
        quantity,
        unitPrice,
        notes,
        localItemId: createdPart.id,
      }),
    });
  });
  return createdPart;
}

export async function deleteServiceLog(logId: string): Promise<void> {
  const log = await logsCollection.find(logId);
  const labor = await laborCollection.query(Q.where('service_log_id', logId)).fetch();
  const parts = await consumedPartsCollection.query(Q.where('service_log_id', logId)).fetch();

  await database.write(async () => {
    // Cascade delete local SQLite children first
    for (const entry of labor) {
      await entry.destroyPermanently();
    }
    for (const item of parts) {
      await item.destroyPermanently();
    }
    // Delete parent service log
    await log.destroyPermanently();

    // If it was synchronized, queue remote deletion
    if (log.remoteId) {
      await enqueueSyncOperationInCurrentWriter({
        tableName: 'service_logs',
        recordId: logId,
        operation: 'DELETE',
        payload: JSON.stringify({ remoteId: log.remoteId }),
      });
    }
  });
}

export type LocalBillingSummary = {
  hoursTotal: number;
  laborCost: number;
  partsCost: number;
  overallTotal: number;
};

export async function calculateTotalBilling(logId: string): Promise<LocalBillingSummary> {
  const labor = await laborCollection.query(Q.where('service_log_id', logId)).fetch();
  const parts = await consumedPartsCollection.query(Q.where('service_log_id', logId)).fetch();

  const hoursTotal = labor.reduce((sum, item) => sum + (item.hours || 0), 0);
  const laborCost = labor.reduce((sum, item) => sum + ((item.hours || 0) * (item.hourlyRate || 0)), 0);
  const partsCost = parts.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  return {
    hoursTotal,
    laborCost,
    partsCost,
    overallTotal: laborCost + partsCost,
  };
}
