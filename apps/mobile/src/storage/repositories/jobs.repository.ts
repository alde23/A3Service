import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import Job from '../models/Job';
import { DEFAULT_SYNC_SITE_ID } from '../sync.config';
import { enqueueSyncOperationInCurrentWriter } from './sync-queue.repository';

export type JobStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export type ApiJobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type CreateJobInput = {
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  status?: JobStatus;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  technicianId: string;
  clientId: string;
  siteId?: string | null;
  remoteId?: string | null;
};

export type RemoteJobInput = {
  id: string;
  siteId: string;
  technicianId?: string | null;
  scheduledDate: string;
  estimatedDuration?: number | null;
  status?: string | null;
  notes?: string | null;
  rawAddress?: string | null;
};

const jobsCollection = database.get<Job>('jobs');

function toSyncSiteId(clientOrSiteId: string) {
  // Demo/local placeholder client IDs are not valid backend site IDs.
  // Route them to a known seeded site so POST /jobs can succeed.
  if (clientOrSiteId.startsWith('client-')) {
    return DEFAULT_SYNC_SITE_ID;
  }
  return clientOrSiteId;
}

function toSafeDate(value: string | Date | number | undefined) {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value ?? Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

export function mapApiJobStatusToLocal(status: string | null | undefined): JobStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'PENDING':
    default:
      return 'not-started';
  }
}

export function mapLocalJobStatusToApi(status: JobStatus): ApiJobStatus {
  switch (status) {
    case 'in-progress':
      return 'IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    case 'not-started':
    default:
      return 'PENDING';
  }
}

export function observeJobs() {
  return jobsCollection
    .query(Q.sortBy('scheduled_at', Q.asc))
    .observeWithColumns(['scheduled_at', 'status', 'title']);
}

export async function ensureJobsSeeded() {
  const jobsCount = await jobsCollection.query().fetchCount();
  if (jobsCount > 0) {
    return;
  }

  const now = Date.now();
  const demoJobs: CreateJobInput[] = [
    {
      title: 'Acme Corporation',
      scheduledAt: new Date(now + 60 * 60 * 1000),
      durationMinutes: 90,
      status: 'in-progress',
      notes: 'AC not cooling properly',
      latitude: null,
      longitude: null,
      technicianId: 'tech-001',
      clientId: 'client-001',
      remoteId: null,
    },
    {
      title: 'Tech Solutions Ltd',
      scheduledAt: new Date(now + 4 * 60 * 60 * 1000),
      durationMinutes: 60,
      status: 'not-started',
      notes: 'Refrigerator making noise',
      latitude: null,
      longitude: null,
      technicianId: 'tech-001',
      clientId: 'client-002',
      remoteId: null,
    },
    {
      title: 'Global Industries',
      scheduledAt: new Date(now + 7 * 60 * 60 * 1000),
      durationMinutes: 45,
      status: 'not-started',
      notes: 'Preventive maintenance check',
      latitude: null,
      longitude: null,
      technicianId: 'tech-001',
      clientId: 'client-003',
      remoteId: null,
    },
  ];

  await database.write(async () => {
    for (const jobInput of demoJobs) {
      await jobsCollection.create((job) => {
        job.title = jobInput.title;
        job.scheduledAt = jobInput.scheduledAt;
        job.durationMinutes = jobInput.durationMinutes;
        job.status = jobInput.status ?? 'not-started';
        job.notes = jobInput.notes ?? null;
        job.latitude = jobInput.latitude ?? null;
        job.longitude = jobInput.longitude ?? null;
        job.technicianId = jobInput.technicianId;
        job.clientId = jobInput.clientId;
        job.remoteId = jobInput.remoteId ?? null;
      });
    }
  });
}

export async function getJobByLocalId(localId: string) {
  return await jobsCollection.find(localId);
}

export async function findJobByRemoteId(remoteId: string) {
  const records = await jobsCollection
    .query(Q.where('remote_id', remoteId), Q.take(1))
    .fetch();
  return records[0] ?? null;
}

export async function setJobRemoteIdInCurrentWriter(
  localId: string,
  remoteId: string
) {
  const job = await jobsCollection.find(localId);
  await job.update((record) => {
    record.remoteId = remoteId;
  });
}

export async function upsertJobsFromServer(remoteJobs: RemoteJobInput[]) {
  if (remoteJobs.length === 0) {
    return 0;
  }

  let changed = 0;
  await database.write(async () => {
    for (const remoteJob of remoteJobs) {
      const existing = await jobsCollection
        .query(Q.where('remote_id', remoteJob.id), Q.take(1))
        .fetch();
      const status = mapApiJobStatusToLocal(remoteJob.status);
      const duration =
        typeof remoteJob.estimatedDuration === 'number' &&
        Number.isFinite(remoteJob.estimatedDuration)
          ? Math.max(1, Math.floor(remoteJob.estimatedDuration))
          : 60;
      const scheduledAt = toSafeDate(remoteJob.scheduledDate);

      if (existing.length > 0) {
        await existing[0].update((record) => {
          record.title = remoteJob.rawAddress ?? `Job ${remoteJob.id.slice(0, 8)}`;
          record.scheduledAt = scheduledAt;
          record.durationMinutes = duration;
          record.status = status;
          record.notes = remoteJob.notes ?? null;
          record.technicianId = remoteJob.technicianId ?? 'unassigned';
          record.clientId = remoteJob.siteId;
          record.remoteId = remoteJob.id;
        });
        changed += 1;
      } else {
        await jobsCollection.create((record) => {
          record.title = remoteJob.rawAddress ?? `Job ${remoteJob.id.slice(0, 8)}`;
          record.scheduledAt = scheduledAt;
          record.durationMinutes = duration;
          record.status = status;
          record.notes = remoteJob.notes ?? null;
          record.latitude = null;
          record.longitude = null;
          record.technicianId = remoteJob.technicianId ?? 'unassigned';
          record.clientId = remoteJob.siteId;
          record.remoteId = remoteJob.id;
        });
        changed += 1;
      }
    }
  });

  return changed;
}

export async function createJob(input: CreateJobInput) {
  await database.write(async () => {
    const created = await jobsCollection.create((job) => {
      job.title = input.title;
      job.scheduledAt = input.scheduledAt;
      job.durationMinutes = input.durationMinutes;
      job.status = input.status ?? 'not-started';
      job.notes = input.notes ?? null;
      job.latitude = input.latitude ?? null;
      job.longitude = input.longitude ?? null;
      job.technicianId = input.technicianId;
      job.clientId = input.clientId;
      job.remoteId = input.remoteId ?? null;
    });

    await enqueueSyncOperationInCurrentWriter({
      tableName: 'jobs',
      recordId: created.id,
      operation: 'INSERT',
      payload: JSON.stringify({
        siteId: toSyncSiteId(input.siteId ?? input.clientId),
        technicianId: input.technicianId,
        scheduledDate: input.scheduledAt.toISOString(),
        estimatedDuration: input.durationMinutes,
        status: mapLocalJobStatusToApi(input.status ?? 'not-started'),
        notes: input.notes ?? null,
        rawAddress: input.title,
        localJobId: created.id,
      }),
    });
  });
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  await database.write(async () => {
    const job = await jobsCollection.find(jobId);
    await job.update((record) => {
      record.status = status;
    });

    const hasRemoteId = Boolean(job.remoteId);
    await enqueueSyncOperationInCurrentWriter({
      tableName: 'jobs',
      recordId: jobId,
      operation: hasRemoteId ? 'UPDATE' : 'INSERT',
      payload: hasRemoteId
        ? JSON.stringify({
            remoteId: job.remoteId,
            status: mapLocalJobStatusToApi(status),
            notes: job.notes ?? null,
          })
        : JSON.stringify({
            siteId: toSyncSiteId(job.clientId),
            technicianId: job.technicianId,
            scheduledDate: job.scheduledAt.toISOString(),
            estimatedDuration: job.durationMinutes,
            status: mapLocalJobStatusToApi(status),
            notes: job.notes ?? null,
            rawAddress: job.title,
            localJobId: job.id,
          }),
    });
  });
}
