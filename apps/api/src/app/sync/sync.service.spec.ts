import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SyncAction, SyncResult } from '../../generated/prisma/client';
import { SyncService } from './sync.service';

const makePrismaMock = () => {
  const logs: Array<{
    id: string;
    timestamp: Date;
    action: SyncAction;
    affectedEntity: string;
    affectedId: string;
    result: SyncResult;
    jobId?: string | null;
    conflictDetails?: unknown;
  }> = [];

  const syncLog = {
    findFirst: vi.fn(async (args?: { where?: { jobId?: string } }) => {
      const filtered = args?.where?.jobId
        ? logs.filter((l) => l.jobId === args.where?.jobId)
        : logs.slice();
      const sorted = filtered.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      return sorted[0] ?? null;
    }),
    findMany: vi.fn(async (args: { where: any; orderBy: any; take: number }) => {
      const where = args.where || {};
      let filtered = logs.slice();
      if (where.affectedEntity) {
        filtered = filtered.filter((l) => l.affectedEntity === where.affectedEntity);
      }
      if (where.affectedId) {
        filtered = filtered.filter((l) => l.affectedId === where.affectedId);
      }
      if (where.action) {
        filtered = filtered.filter((l) => l.action === where.action);
      }
      if (where.jobId) {
        filtered = filtered.filter((l) => l.jobId === where.jobId);
      }
      const sorted = filtered.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      return sorted.slice(0, args.take ?? 25);
    }),
    create: vi.fn(async ({ data }: { data: any }) => {
      const log = {
        id: `log_${logs.length + 1}`,
        timestamp: new Date(),
        action: data.action,
        affectedEntity: data.affectedEntity,
        affectedId: data.affectedId,
        result: data.result,
        jobId: data.jobId ?? null,
        conflictDetails: data.conflictDetails ?? null,
      };
      logs.push(log);
      return log;
    }),
  };

  const job = {
    updateMany: vi.fn(async () => ({ count: 1 })),
  };

  return { syncLog, job, logs };
};

describe('SyncService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: SyncService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new SyncService(prisma as any);
  });

  it('returns pending when no sync logs exist', async () => {
    const status = await service.getStatus();
    expect(status.status).toBe('pending');
    expect(status.last_sync_at).toBeNull();
  });

  it('creates a sync log and marks success', async () => {
    const result = await service.reconcile([
      {
        idempotencyKey: 'abc',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-1',
        jobId: 'job-1',
      },
    ]);

    expect(result.status).toBe('success');
    expect(result.received).toBe(1);
    expect(result.created).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(prisma.job.updateMany).toHaveBeenCalledTimes(1);
  });

  it('treats duplicate idempotencyKey as duplicate', async () => {
    await service.reconcile([
      {
        idempotencyKey: 'dup',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-2',
        jobId: 'job-2',
      },
    ]);

    const result = await service.reconcile([
      {
        idempotencyKey: 'dup',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-2',
        jobId: 'job-2',
      },
    ]);

    expect(result.created).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(result.results[0].duplicate).toBe(true);
  });

  it('marks failed when a reconcile item fails', async () => {
    const result = await service.reconcile([
      {
        idempotencyKey: 'fail-1',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-3',
        result: SyncResult.FAIL,
      },
    ]);

    expect(result.status).toBe('failed');
  });
});
