import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
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

  it('update blocks labor and parts edits once synced', async () => {
    const now = new Date('2026-05-19T00:00:00.000Z');
    prisma.serviceLog.findFirst.mockResolvedValue({
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
      job: { id: 'job-1' },
      laborEntries: [],
      consumedParts: [],
    });

    await expect(
      service.update(
        { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
        'log-1',
        { laborEntries: [{ hours: 1, hourlyRate: 50 }] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
