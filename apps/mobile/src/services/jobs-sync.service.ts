import {
  type RemoteJobInput,
  getJobByLocalId,
  setJobRemoteIdInCurrentWriter,
  upsertJobsFromServer,
} from '../storage/repositories/jobs.repository';
import {
  listPendingSyncOperations,
  markSyncOperationFailed,
  markSyncOperationSynced,
  markSyncOperationSyncedInCurrentWriter,
} from '../storage/repositories/sync-queue.repository';
import { authJsonHeaders, API_URL } from './api.config';
import { database } from '../storage';

type SyncSummary = {
  pulled: number;
  pushed: number;
  failed: number;
};

function isRemoteJobsPayload(data: unknown): data is RemoteJobInput[] {
  return Array.isArray(data);
}

export async function pullJobsFromServer(token: string) {
  const res = await fetch(`${API_URL}/jobs`, {
    method: 'GET',
    headers: authJsonHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Pull jobs failed (${res.status})`);
  }

  const body = (await res.json()) as unknown;
  if (!isRemoteJobsPayload(body)) {
    throw new Error('Pull jobs response is not an array');
  }

  const normalized: RemoteJobInput[] = body.map((job: any) => ({
    id: String(job.id),
    siteId: String(job.siteId ?? ''),
    technicianId:
      typeof job.technicianId === 'string' ? job.technicianId : null,
    scheduledDate: String(job.scheduledDate),
    estimatedDuration:
      typeof job.estimatedDuration === 'number' ? job.estimatedDuration : null,
    status: typeof job.status === 'string' ? job.status : null,
    notes: typeof job.notes === 'string' ? job.notes : null,
    rawAddress: typeof job.rawAddress === 'string' ? job.rawAddress : null,
  }));

  await upsertJobsFromServer(normalized);
  return normalized.length;
}

async function pushPendingQueue(token: string, batchSize = 50) {
  const pending = await listPendingSyncOperations(batchSize);
  if (pending.length === 0) {
    return { pushed: 0, failed: 0 };
  }

  let pushed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      if (item.tableName !== 'jobs') {
        await markSyncOperationFailed(item.id);
        failed += 1;
        continue;
      }

      const payload = JSON.parse(item.payload || '{}') as Record<string, unknown>;

      if (item.operation === 'INSERT') {
        const createRes = await fetch(`${API_URL}/jobs`, {
          method: 'POST',
          headers: authJsonHeaders(token),
          body: JSON.stringify(payload),
        });

        if (!createRes.ok) {
          await markSyncOperationFailed(item.id);
          failed += 1;
          continue;
        }

        const created = (await createRes.json()) as { id?: string };
        const remoteId = created?.id;
        const localJobId =
          typeof payload.localJobId === 'string' ? payload.localJobId : item.recordId;

        await database.write(async () => {
          if (typeof remoteId === 'string' && remoteId.length > 0) {
            await setJobRemoteIdInCurrentWriter(localJobId, remoteId);
          }
          await markSyncOperationSyncedInCurrentWriter(item.id);
        });

        pushed += 1;
        continue;
      }

      if (item.operation === 'UPDATE') {
        let remoteId =
          typeof payload.remoteId === 'string' ? payload.remoteId : undefined;
        if (!remoteId) {
          const localJob = await getJobByLocalId(item.recordId);
          remoteId = localJob?.remoteId ?? undefined;
        }

        if (!remoteId) {
          await markSyncOperationFailed(item.id);
          failed += 1;
          continue;
        }

        const patchBody: Record<string, unknown> = {};
        if (typeof payload.status === 'string') {
          patchBody.status = payload.status;
        }
        if (typeof payload.notes === 'string' || payload.notes === null) {
          patchBody.notes = payload.notes;
        }

        const patchRes = await fetch(`${API_URL}/jobs/${remoteId}`, {
          method: 'PATCH',
          headers: authJsonHeaders(token),
          body: JSON.stringify(patchBody),
        });

        if (!patchRes.ok) {
          await markSyncOperationFailed(item.id);
          failed += 1;
          continue;
        }

        await markSyncOperationSynced(item.id);
        pushed += 1;
        continue;
      }

      await markSyncOperationFailed(item.id);
      failed += 1;
    } catch {
      await markSyncOperationFailed(item.id);
      failed += 1;
    }
  }

  return { pushed, failed };
}

export async function syncJobsWithServer(token: string): Promise<SyncSummary> {
  const pulledBeforePush = await pullJobsFromServer(token);
  const pushSummary = await pushPendingQueue(token, 50);
  const pulledAfterPush = await pullJobsFromServer(token);

  return {
    pulled: pulledBeforePush + pulledAfterPush,
    pushed: pushSummary.pushed,
    failed: pushSummary.failed,
  };
}
