import { database } from '../storage';
import {
  listPendingSyncOperations,
  markSyncOperationFailed,
  markSyncOperationSynced,
  markSyncOperationSyncedInCurrentWriter,
} from '../storage/repositories/sync-queue.repository';
import { upsertCatalogFromServer } from '../storage/repositories/catalog.repository';
import { getServiceLogForJob } from '../storage/repositories/service-logs.repository';
import { getWarrantyForJob } from '../storage/repositories/warranties.repository';
import { pullJobsFromServer } from './jobs-sync.service';
import { authJsonHeaders, API_URL } from './api.config';
import SyncConflict from '../storage/models/SyncConflict';
import SyncLog from '../storage/models/SyncLog';

export type UnifiedSyncSummary = {
  jobsPulled: number;
  catalogSynced: number;
  recordsPushed: number;
  failures: number;
};

const conflictsCollection = database.get<SyncConflict>('sync_conflicts');
const syncLogsCollection = database.get<SyncLog>('sync_logs');

// ────────────────────────────────────────────────────────
// 1. Catalog Syncing (Background Pull Routine)
// ────────────────────────────────────────────────────────
export async function pullCatalogFromServer(token: string): Promise<number> {
  let itemsCount = 0;
  try {
    const res = await fetch(`${API_URL}/library/models?page=1&pageSize=100`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (res.ok) {
      const body = await res.json();
      const models = body.items || [];
      
      // Upsert local boiler_models
      itemsCount += await upsertCatalogFromServer('boiler_models', models);

      // Extract and upsert linked parts and fault codes
      const partsMap = new Map<string, any>();
      const faultsMap = new Map<string, any>();

      for (const m of models) {
        if (Array.isArray(m.parts)) {
          m.parts.forEach((p: any) => partsMap.set(p.id, p));
        }
        if (Array.isArray(m.faultCodes)) {
          m.faultCodes.forEach((f: any) => faultsMap.set(f.id, f));
        }
      }

      const parts = Array.from(partsMap.values());
      const faultCodes = Array.from(faultsMap.values());

      itemsCount += await upsertCatalogFromServer('parts', parts);
      itemsCount += await upsertCatalogFromServer('fault_codes', faultCodes);
    }
  } catch (error) {
    console.error('[Unified Sync] Catalog pull error:', error);
  }
  return itemsCount;
}

// ────────────────────────────────────────────────────────
// 2. Push Queue Synchronization (Cascading Push Engine)
// ────────────────────────────────────────────────────────
async function pushTransactionalQueue(token: string, batchSize = 100) {
  const pending = await listPendingSyncOperations(batchSize);
  let pushed = 0;
  let failures = 0;

  if (pending.length === 0) {
    return { pushed, failures };
  }

  // Pre-seed local-to-remote ID map to bind children records seamlessly
  const idMap = new Map<string, string>();

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload || '{}') as Record<string, any>;

      // ----------------- SERVICE LOGS -----------------
      if (item.tableName === 'service_logs') {
        if (item.operation === 'INSERT') {
          const res = await fetch(`${API_URL}/service-logs`, {
            method: 'POST',
            headers: authJsonHeaders(token),
            body: JSON.stringify({
              jobId: payload.jobId,
              status: payload.status,
              summary: payload.summary,
              notes: payload.notes,
            }),
          });

          if (!res.ok) {
            await handlePushFailure(item.id, 'service_logs', item.recordId, res);
            failures += 1;
            continue;
          }

          const created = await res.json();
          idMap.set(item.recordId, created.id);

          await database.write(async () => {
            const localLog = await database.get('service_logs').find(item.recordId);
            await localLog.update((rec: any) => {
              rec.remoteId = created.id;
              rec.syncedAt = new Date();
            });
            await markSyncOperationSyncedInCurrentWriter(item.id);
          });
          pushed += 1;
        } else if (item.operation === 'UPDATE') {
          const remoteId = payload.remoteId || idMap.get(item.recordId);
          if (!remoteId) {
            await markSyncOperationFailed(item.id);
            failures += 1;
            continue;
          }

          const res = await fetch(`${API_URL}/service-logs/${remoteId}`, {
            method: 'PATCH',
            headers: authJsonHeaders(token),
            body: JSON.stringify({
              status: payload.status,
              summary: payload.summary,
              notes: payload.notes,
            }),
          });

          if (!res.ok) {
            await handlePushFailure(item.id, 'service_logs', item.recordId, res);
            failures += 1;
            continue;
          }

          await markSyncOperationSynced(item.id);
          pushed += 1;
        } else if (item.operation === 'DELETE') {
          const remoteId = payload.remoteId;
          const res = await fetch(`${API_URL}/service-logs/${remoteId}`, {
            method: 'DELETE',
            headers: authJsonHeaders(token),
          });

          if (res.ok || res.status === 404) {
            await markSyncOperationSynced(item.id);
            pushed += 1;
          } else {
            await markSyncOperationFailed(item.id);
            failures += 1;
          }
        }
        continue;
      }

      // ----------------- LABOR ENTRIES -----------------
      if (item.tableName === 'labor_entries' && item.operation === 'INSERT') {
        const localLogId = payload.serviceLogId;
        let remoteLogId = idMap.get(localLogId);
        if (!remoteLogId) {
          const localLog = await database.get('service_logs').find(localLogId);
          remoteLogId = localLog.remoteId || undefined;
        }

        if (!remoteLogId) {
          await markSyncOperationFailed(item.id);
          failures += 1;
          continue;
        }

        const res = await fetch(`${API_URL}/service-logs/${remoteLogId}/labor`, {
          method: 'POST',
          headers: authJsonHeaders(token),
          body: JSON.stringify({
            hours: payload.hours,
            hourlyRate: payload.hourlyRate,
            description: payload.description,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          await database.write(async () => {
            const entry = await database.get('labor_entries').find(item.recordId);
            await entry.update((rec: any) => {
              rec.remoteId = created.id;
            });
            await markSyncOperationSyncedInCurrentWriter(item.id);
          });
          pushed += 1;
        } else {
          await handlePushFailure(item.id, 'labor_entries', item.recordId, res);
          failures += 1;
        }
        continue;
      }

      // ----------------- CONSUMED PARTS -----------------
      if (item.tableName === 'consumed_parts' && item.operation === 'INSERT') {
        const localLogId = payload.serviceLogId;
        let remoteLogId = idMap.get(localLogId);
        if (!remoteLogId) {
          const localLog = await database.get('service_logs').find(localLogId);
          remoteLogId = localLog.remoteId || undefined;
        }

        if (!remoteLogId) {
          await markSyncOperationFailed(item.id);
          failures += 1;
          continue;
        }

        const res = await fetch(`${API_URL}/service-logs/${remoteLogId}/parts`, {
          method: 'POST',
          headers: authJsonHeaders(token),
          body: JSON.stringify({
            partId: payload.partId,
            quantity: payload.quantity,
            unitPrice: payload.unitPrice,
            notes: payload.notes,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          await database.write(async () => {
            const itemRecord = await database.get('consumed_parts').find(item.recordId);
            await itemRecord.update((rec: any) => {
              rec.remoteId = created.id;
            });
            await markSyncOperationSyncedInCurrentWriter(item.id);
          });
          pushed += 1;
        } else {
          await handlePushFailure(item.id, 'consumed_parts', item.recordId, res);
          failures += 1;
        }
        continue;
      }

      // ----------------- WARRANTIES -----------------
      if (item.tableName === 'warranties' && item.operation === 'INSERT') {
        const res = await fetch(`${API_URL}/warranties`, {
          method: 'POST',
          headers: authJsonHeaders(token),
          body: JSON.stringify({
            boilerModelId: payload.boilerModelId,
            jobId: payload.jobId,
            startDate: payload.startDate,
            durationMonths: payload.durationMonths,
            notes: payload.notes,
            readings: payload.readings || [],
          }),
        });

        if (res.ok) {
          const created = await res.json();
          await database.write(async () => {
            const warranty = await database.get('warranties').find(item.recordId);
            await warranty.update((rec: any) => {
              rec.remoteId = created.id;
            });
            await markSyncOperationSyncedInCurrentWriter(item.id);
          });
          pushed += 1;
        } else {
          await handlePushFailure(item.id, 'warranties', item.recordId, res);
          failures += 1;
        }
        continue;
      }

      // ----------------- DEFAULT (JOBS ETC.) -----------------
      if (item.tableName === 'jobs') {
        // Fallback to existing Jobs push routine logic
        const jobsSync = require('./jobs-sync.service');
        // Simple shim since we run batch push
        const res = await fetch(`${API_URL}/jobs${item.operation === 'UPDATE' ? '/' + (payload.remoteId || item.recordId) : ''}`, {
          method: item.operation === 'UPDATE' ? 'PATCH' : 'POST',
          headers: authJsonHeaders(token),
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await markSyncOperationSynced(item.id);
          pushed += 1;
        } else {
          await markSyncOperationFailed(item.id);
          failures += 1;
        }
        continue;
      }

      // Unrecognized table
      await markSyncOperationFailed(item.id);
      failures += 1;
    } catch (e) {
      console.error('[Unified Sync] Error processing item:', item.id, e);
      await markSyncOperationFailed(item.id);
      failures += 1;
    }
  }

  return { pushed, failures };
}

// Helper to log sync conflicts locally for manager dashboard
async function handlePushFailure(
  queueId: string,
  entity: string,
  recordId: string,
  res: Response
) {
  await markSyncOperationFailed(queueId);

  // 409 Conflict check
  if (res.status === 409) {
    try {
      const details = await res.json();
      await database.write(async () => {
        await conflictsCollection.create((conflict) => {
          conflict.affectedEntity = entity;
          conflict.affectedId = recordId;
          conflict.policy = 'MANUAL_REVIEW';
          conflict.status = 'OPEN';
          conflict.details = JSON.stringify(details);
          conflict.resolutionNotes = null;
          conflict.resolvedAt = null;
        });
      });
    } catch {
      // Ignored if cannot parse JSON details
    }
  }
}

// ────────────────────────────────────────────────────────
// 3. Unified Synchronizer Execution
// ────────────────────────────────────────────────────────
export async function executeUnifiedSync(token: string): Promise<UnifiedSyncSummary> {
  const startLog = Date.now();
  
  // A. Pull latest Jobs
  let jobsPulled = 0;
  try {
    jobsPulled = await pullJobsFromServer(token);
  } catch (err) {
    console.error('[Unified Sync] Pull jobs failed:', err);
  }

  // B. Pull latest Catalog items
  const catalogSynced = await pullCatalogFromServer(token);

  // C. Push local changes
  const pushSummary = await pushTransactionalQueue(token, 100);

  // D. Write Sync Log locally
  try {
    await database.write(async () => {
      await syncLogsCollection.create((log) => {
        log.syncedAt = new Date();
        log.pushed = pushSummary.pushed;
        log.pulled = jobsPulled + catalogSynced;
        log.status = pushSummary.failures > 0 ? 'failed' : 'success';
        log.error = pushSummary.failures > 0 ? `${pushSummary.failures} failures recorded` : null;
      });
    });
  } catch (err) {
    console.error('[Unified Sync] Sync log write failed:', err);
  }

  return {
    jobsPulled,
    catalogSynced,
    recordsPushed: pushSummary.pushed,
    failures: pushSummary.failures,
  };
}
