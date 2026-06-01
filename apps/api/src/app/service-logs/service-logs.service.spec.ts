import { describe, expect, it, beforeEach, vi } from 'vitest';

import { Prisma, ServiceLogStatus, SyncResult, UserRole } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { ServiceLogService } from './service-logs.service';

const makePrisma = () => ({
  serviceLog: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  laborEntry: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  consumedPart: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  job: {
    findFirst: vi.fn(),
  },
  part: {
    findMany: vi.fn(),
  },
  serviceLogSync: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
});

type PrismaMock = ReturnType<typeof makePrisma>;

describe('ServiceLogService', () => {
  let prisma: PrismaMock;
  let service: ServiceLogService;

  beforeEach(() => {
    prisma = makePrisma();
    prisma.$transaction = vi.fn(async (cb: (tx: PrismaMock) => unknown) => cb(prisma));
    service = new ServiceLogService(prisma as unknown as PrismaService);
  });

  it('create calculates totals from labor and parts', async () => {
    prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
    prisma.part.findMany.mockResolvedValue([{ id: 'part-1' }]);

    const now = new Date('2026-05-19T00:00:00.000Z');
    prisma.serviceLog.create.mockResolvedValue({
      id: 'log-1',
      jobId: 'job-1',
      status: ServiceLogStatus.DRAFT,
      summary: null,
      notes: null,
      syncedAt: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      laborEntries: [
        {
          id: 'labor-1',
          serviceLogId: 'log-1',
          hours: 2,
          hourlyRate: new Prisma.Decimal(100),
          description: null,
          isDeleted: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      consumedParts: [
        {
          id: 'cp-1',
          serviceLogId: 'log-1',
          partId: 'part-1',
          quantity: 2,
          unitPrice: new Prisma.Decimal(25),
          notes: null,
          isDeleted: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const result = await service.create(
      { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
      {
        jobId: 'job-1',
        laborEntries: [{ hours: 2, hourlyRate: 100 }],
        consumedParts: [{ partId: 'part-1', quantity: 2, unitPrice: 25 }],
      },
    );

    expect(result.totals).toEqual({
      laborTotal: '200.00',
      partsTotal: '50.00',
      totalCost: '250.00',
    });
  });

  it('sync is idempotent by idempotency key', async () => {
    const now = new Date('2026-05-19T00:00:00.000Z');
    prisma.serviceLogSync.findUnique.mockResolvedValue({
      id: 'sync-1',
      idempotencyKey: 'dup-key',
      result: SyncResult.SUCCESS,
      serviceLog: {
        id: 'log-1',
        jobId: 'job-1',
        status: ServiceLogStatus.SYNCED,
        summary: null,
        notes: null,
        syncedAt: now,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        laborEntries: [],
        consumedParts: [],
      },
    });

    const result = await service.sync(
      { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
      'log-1',
      { idempotencyKey: 'dup-key', jobId: 'job-1' },
    );

    expect(result.duplicate).toBe(true);
    expect(result.status).toBe('SUCCESS');
  });

  describe('list', () => {
    it('returns paginated items', async () => {
      prisma.serviceLog.count.mockResolvedValue(1);
      prisma.serviceLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          jobId: 'job-1',
          status: ServiceLogStatus.DRAFT,
          summary: null,
          notes: null,
          syncedAt: null,
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          laborEntries: [],
          consumedParts: [],
        }
      ]);
      const result = await service.list({ sub: 'm1', role: UserRole.MANAGER } as any, 'job-1', 1, 10);
      expect(result.items.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('throws if not found', async () => {
      prisma.serviceLog.findFirst.mockResolvedValue(null);
      await expect(service.getById({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1')).rejects.toThrow('Service log not found');
    });

    it('returns mapped log if found', async () => {
      prisma.serviceLog.findFirst.mockResolvedValue({
        id: 'log-1',
        jobId: 'job-1',
        status: ServiceLogStatus.DRAFT,
        summary: null,
        notes: null,
        syncedAt: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        laborEntries: [],
        consumedParts: [],
      });
      const result = await service.getById({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1');
      expect(result.id).toBe('log-1');
    });
  });

  describe('create', () => {
    it('throws if jobId is missing', async () => {
      await expect(service.create({ sub: 't1', role: UserRole.TECHNICIAN } as any, {} as any)).rejects.toThrow('jobId is required');
    });

    it('throws if job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(service.create({ sub: 't1', role: UserRole.TECHNICIAN } as any, { jobId: 'job-1' } as any)).rejects.toThrow('Job not found');
    });

    it('throws if labor hours invalid', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
      await expect(service.create({ sub: 't1', role: UserRole.TECHNICIAN } as any, { jobId: 'job-1', laborEntries: [{ hours: -1, hourlyRate: 100 }] } as any)).rejects.toThrow('laborEntries[0].hours must be positive');
    });

    it('throws if partId missing', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
      await expect(service.create({ sub: 't1', role: UserRole.TECHNICIAN } as any, { jobId: 'job-1', consumedParts: [{ quantity: 1 }] } as any)).rejects.toThrow('consumedParts[0].partId is required');
    });
  });

  describe('update', () => {
    it('throws if not found', async () => {
      prisma.serviceLog.findFirst.mockResolvedValue(null);
      await expect(service.update({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1', {} as any)).rejects.toThrow('Service log not found');
    });

    it('throws if updated record returns null', async () => {
      prisma.serviceLog.findFirst.mockResolvedValue({ id: 'log-1' });
      prisma.serviceLog.update.mockResolvedValue(null);
      prisma.serviceLog.findUnique.mockResolvedValue(null);
      await expect(service.update({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1', {} as any)).rejects.toThrow('Service log not found');
    });
  });

  describe('sync', () => {
    it('throws if idempotencyKey missing', async () => {
      await expect(service.sync({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1', {} as any)).rejects.toThrow('idempotencyKey is required');
    });

    it('throws if jobId missing', async () => {
      await expect(service.sync({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1', { idempotencyKey: 'k' } as any)).rejects.toThrow('jobId is required');
    });

    it('throws if already synced and trying to change labor/parts', async () => {
      prisma.serviceLogSync.findUnique.mockResolvedValue(null);
      prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
      
      const tx = {
        serviceLog: {
          findUnique: vi.fn().mockResolvedValue({ id: 'log-1', status: ServiceLogStatus.SYNCED }),
        }
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      await expect(service.sync({ sub: 'm1', role: UserRole.MANAGER } as any, 'log-1', { idempotencyKey: 'k', jobId: 'job-1', laborEntries: [] } as any)).rejects.toThrow('Synced logs cannot change labor or parts');
    });
  });
});
