import { database } from '../storage';
import {
  listPendingSyncOperations,
  markSyncOperationFailed,
  markSyncOperationSynced,
  markSyncOperationSyncedInCurrentWriter,
} from '../storage/repositories/sync-queue.repository';
import { upsertCatalogFromServer } from '../storage/repositories/catalog.repository';
import { pullJobsFromServer } from './jobs-sync.service';
import { authJsonHeaders, API_URL } from './api.config';
import SyncConflict from '../storage/models/SyncConflict';
import SyncLog from '../storage/models/SyncLog';
import ServiceLog from '../storage/models/ServiceLog';
import LaborEntry from '../storage/models/LaborEntry';
import ConsumedPart from '../storage/models/ConsumedPart';
import Warranty from '../storage/models/Warranty';
import Expense from '../storage/models/Expense';

interface CatalogPart {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  unitPrice?: number;
  inventoryStatus?: string;
}

interface CatalogFaultCode {
  id: string;
  code: string;
  title: string;
  description?: string;
  severity?: string;
}

interface CatalogModel {
  id: string;
  modelName: string;
  manufacturerId: string;
  series?: string;
  fuelType?: string;
  productionStartYear?: number;
  productionEndYear?: number;
  parts?: CatalogPart[];
  faultCodes?: CatalogFaultCode[];
  technicalSpecs?: unknown[];
  statusCodes?: unknown[];
  diagnosticCodes?: unknown[];
  safetyWarnings?: unknown[];
  maintenanceTasks?: unknown[];
  modelParts?: unknown[];
}

interface SyncQueuePayload {
  jobId?: string;
  status?: string;
  summary?: string | null;
  notes?: string | null;
  remoteId?: string | null;
  serviceLogId?: string;
  hours?: number;
  hourlyRate?: number;
  description?: string | null;
  partId?: string;
  quantity?: number;
  unitPrice?: number | null;
  boilerModelId?: string;
  startDate?: string;
  durationMonths?: number;
  readings?: Array<{ code: string; value: number }>;
  amount?: number;
  currency?: string;
  incurredAt?: number;
}

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
      const partsMap = new Map<string, CatalogPart>();
      const faultsMap = new Map<string, CatalogFaultCode>();
      const technicalSpecsMap = new Map<string, any>();
      const statusCodesMap = new Map<string, any>();
      const diagnosticCodesMap = new Map<string, any>();
      const safetyWarningsMap = new Map<string, any>();
      const maintenanceTasksMap = new Map<string, any>();
      const modelPartsMap = new Map<string, any>();

      for (const m of models as CatalogModel[]) {
        if (Array.isArray(m.parts)) {
          m.parts.forEach((p: CatalogPart) => partsMap.set(p.id, p));
        }
        if (Array.isArray(m.faultCodes)) {
          m.faultCodes.forEach((f: CatalogFaultCode) => faultsMap.set(f.id, f));
        }
        if (Array.isArray(m.technicalSpecs)) {
          m.technicalSpecs.forEach((x: unknown) => technicalSpecsMap.set(x.id, x));
        }
        if (Array.isArray(m.statusCodes)) {
          m.statusCodes.forEach((x: unknown) => statusCodesMap.set(x.id, x));
        }
        if (Array.isArray(m.diagnosticCodes)) {
          m.diagnosticCodes.forEach((x: unknown) => diagnosticCodesMap.set(x.id, x));
        }
        if (Array.isArray(m.safetyWarnings)) {
          m.safetyWarnings.forEach((x: unknown) => safetyWarningsMap.set(x.id, x));
        }
        if (Array.isArray(m.maintenanceTasks)) {
          m.maintenanceTasks.forEach((x: unknown) => maintenanceTasksMap.set(x.id, x));
        }
        if (Array.isArray(m.modelParts)) {
          m.modelParts.forEach((x: unknown) => modelPartsMap.set(x.modelId + '_' + x.partId, x));
        }
      }

      const parts = Array.from(partsMap.values());
      const faultCodes = Array.from(faultsMap.values());
      const technicalSpecs = Array.from(technicalSpecsMap.values());
      const statusCodes = Array.from(statusCodesMap.values());
      const diagnosticCodes = Array.from(diagnosticCodesMap.values());
      const safetyWarnings = Array.from(safetyWarningsMap.values());
      const maintenanceTasks = Array.from(maintenanceTasksMap.values());
      const modelParts = Array.from(modelPartsMap.values());

      itemsCount += await upsertCatalogFromServer('parts', parts);
      itemsCount += await upsertCatalogFromServer('fault_codes', faultCodes);
      itemsCount += await upsertCatalogFromServer('technical_specs', technicalSpecs);
      itemsCount += await upsertCatalogFromServer('status_codes', statusCodes);
      itemsCount += await upsertCatalogFromServer('diagnostic_codes', diagnosticCodes);
      itemsCount += await upsertCatalogFromServer('safety_warnings', safetyWarnings);
      itemsCount += await upsertCatalogFromServer('maintenance_tasks', maintenanceTasks);
      itemsCount += await upsertCatalogFromServer('model_parts', modelParts);
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
      const payload = JSON.parse(item.payload || '{}') as SyncQueuePayload;

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
            const localLog = await database.get<ServiceLog>('service_logs').find(item.recordId);
            await localLog.update((rec: ServiceLog) => {
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
        if (!localLogId) {
          await markSyncOperationFailed(item.id);
          failures += 1;
          continue;
        }
        let remoteLogId = idMap.get(localLogId);
        if (!remoteLogId) {
          const localLog = await database.get<ServiceLog>('service_logs').find(localLogId);
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
            const entry = await database.get<LaborEntry>('labor_entries').find(item.recordId);
            await entry.update((rec: LaborEntry) => {
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
        if (!localLogId) {
          await markSyncOperationFailed(item.id);
          failures += 1;
          continue;
        }
        let remoteLogId = idMap.get(localLogId);
        if (!remoteLogId) {
          const localLog = await database.get<ServiceLog>('service_logs').find(localLogId);
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
            const itemRecord = await database.get<ConsumedPart>('consumed_parts').find(item.recordId);
            await itemRecord.update((rec: ConsumedPart) => {
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
            const warranty = await database.get<Warranty>('warranties').find(item.recordId);
            await warranty.update((rec: Warranty) => {
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

      // ----------------- EXPENSES -----------------
      if (item.tableName === 'expenses') {
        const res = await fetch(`${API_URL}/expenses${item.operation === 'UPDATE' || item.operation === 'DELETE' ? '/' + (payload.remoteId || item.recordId) : ''}`, {
          method: item.operation === 'UPDATE' ? 'PATCH' : (item.operation === 'DELETE' ? 'DELETE' : 'POST'),
          headers: authJsonHeaders(token),
          body: item.operation !== 'DELETE' ? JSON.stringify({
            jobId: payload.jobId,
            amount: payload.amount,
            currency: payload.currency,
            description: payload.description,
            incurredAt: payload.incurredAt,
          }) : undefined,
        });

        if (res.ok) {
          if (item.operation === 'INSERT') {
            const created = await res.json();
            await database.write(async () => {
              const expense = await database.get<Expense>('expenses').find(item.recordId);
              await expense.update((rec: Expense) => {
                rec.remoteId = created.id;
              });
              await markSyncOperationSyncedInCurrentWriter(item.id);
            });
          } else {
            await markSyncOperationSynced(item.id);
          }
          pushed += 1;
        } else {
          await handlePushFailure(item.id, 'expenses', item.recordId, res);
          failures += 1;
        }
        continue;
      }

      // ----------------- DEFAULT (JOBS ETC.) -----------------
      if (item.tableName === 'jobs') {
        // Fallback to existing Jobs push routine logic
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

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(token: string, intervalMs = 60000) {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    executeUnifiedSync(token).catch((err) => console.error('[Auto Sync] error:', err));
  }, intervalMs);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

