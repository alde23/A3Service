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
    idempotencyKey?: string;
    result: SyncResult;
    jobId?: string | null;
    conflictDetails?: unknown;
  }> = [];

  const syncLog = {
    findFirst: vi.fn(async (args?: { where?: any }) => {
      const where = args?.where || {};
      let filtered = logs.slice();
      if (where.jobId) {
        filtered = filtered.filter((l) => l.jobId === where.jobId);
      }
      if (where.affectedEntity) {
        filtered = filtered.filter((l) => l.affectedEntity === where.affectedEntity);
      }
      if (where.affectedId) {
        filtered = filtered.filter((l) => l.affectedId === where.affectedId);
      }
      if (where.action) {
        filtered = filtered.filter((l) => l.action === where.action);
      }
      if (where.idempotencyKey) {
        filtered = filtered.filter((l) => l.idempotencyKey === where.idempotencyKey);
      }
      const sorted = filtered.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      return sorted[0] ?? null;
    }),
    create: vi.fn(async ({ data }: { data: any }) => {
      const log = {
        id: `log_${logs.length + 1}`,
        timestamp: new Date(),
        action: data.action,
        affectedEntity: data.affectedEntity,
        affectedId: data.affectedId,
        idempotencyKey: data.idempotencyKey,
        result: data.result,
        jobId: data.jobId ?? null,
        conflictDetails: data.conflictDetails ?? null,
      };
      logs.push(log);
      return log;
    }),
    update: vi.fn(async ({ data }: { data: any }) => data),
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
    (prisma as any).$transaction = vi.fn(async (cb: any) => cb(prisma));
    service = new SyncService(prisma as any);
  });

  it('returns pending when no sync logs exist', async () => {
    const status = await service.getStatus();
    expect(status.status).toBe('pending');
    expect(status.lastSyncAt).toBeNull();
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
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
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
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results[0].duplicate).toBe(true);
  });

  it('treats a duplicate as duplicate even when the original log is older than the most recent 25 logs', async () => {
    await service.reconcile([
      {
        idempotencyKey: 'dup-window',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-window-original',
        jobId: 'job-window-original',
      },
    ]);

    for (let i = 0; i < 25; i += 1) {
      await service.reconcile([
        {
          idempotencyKey: `filler-${i}`,
          action: SyncAction.UPLOAD,
          affectedEntity: 'Job',
          affectedId: `job-window-${i}`,
          jobId: `job-window-${i}`,
        },
      ]);
    }

    const result = await service.reconcile([
      {
        idempotencyKey: 'dup-window',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-window-original',
        jobId: 'job-window-original',
      },
    ]);

    expect(result.created).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results[0].duplicate).toBe(true);
  });

  it('deduplicates concurrent reconcile calls with the same idempotencyKey', async () => {
    let releaseFindMany!: () => void;
    const findManyGate = new Promise<void>((resolve) => {
      releaseFindMany = resolve;
    });

    let findManyCalls = 0;
    const originalFindFirst = prisma.syncLog.findFirst;
    prisma.syncLog.findFirst = vi.fn(async (...args: Parameters<typeof originalFindFirst>) => {
      findManyCalls += 1;
      if (findManyCalls === 1) {
        await findManyGate;
      }
      return originalFindFirst(...args);
    });

    const payload = [
      {
        idempotencyKey: 'dup-concurrent',
        action: SyncAction.UPLOAD,
        affectedEntity: 'Job',
        affectedId: 'job-concurrent',
        jobId: 'job-concurrent',
      },
    ];

    const first = service.reconcile(payload);
    const second = service.reconcile(payload);

    await vi.waitFor(() => {
      expect(findManyCalls).toBe(1);
    });

    expect(findManyCalls).toBe(1);

    releaseFindMany();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(findManyCalls).toBe(2);
    expect(firstResult.created + secondResult.created).toBe(1);
    expect(firstResult.duplicates + secondResult.duplicates).toBe(1);
    expect(
      [firstResult.results[0].duplicate, secondResult.results[0].duplicate].filter(Boolean),
    ).toHaveLength(1);
    expect(firstResult.succeeded + secondResult.succeeded).toBe(1);
    expect(firstResult.failed + secondResult.failed).toBe(0);
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
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
  });
});
