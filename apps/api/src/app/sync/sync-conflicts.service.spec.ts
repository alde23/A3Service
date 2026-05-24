import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConflictStatus, SyncAction, SyncResult } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { SyncConflictsService } from './sync-conflicts.service';

const makePrisma = () => ({
  syncConflict: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  syncLog: {
    create: vi.fn(),
  },
});

type PrismaMock = ReturnType<typeof makePrisma>;

describe('SyncConflictsService', () => {
  let prisma: PrismaMock;
  let service: SyncConflictsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SyncConflictsService(prisma as unknown as PrismaService);
  });

  it('resolves an open conflict and records a sync log', async () => {
    prisma.syncConflict.findUnique.mockResolvedValue({
      id: 'conflict-1',
      affectedEntity: 'ServiceLog',
      affectedId: 'log-1',
      status: ConflictStatus.OPEN,
      policy: null,
      details: null,
      resolutionNotes: null,
      resolvedAt: null,
      createdAt: new Date('2026-05-24T00:00:00.000Z'),
      updatedAt: new Date('2026-05-24T00:00:00.000Z'),
    });

    prisma.syncConflict.update.mockResolvedValue({
      id: 'conflict-1',
      affectedEntity: 'ServiceLog',
      affectedId: 'log-1',
      status: ConflictStatus.RESOLVED,
      policy: 'SERVER_WINS',
      details: null,
      resolutionNotes: 'use server',
      resolvedAt: new Date('2026-05-24T00:00:00.000Z'),
      createdAt: new Date('2026-05-24T00:00:00.000Z'),
      updatedAt: new Date('2026-05-24T00:00:00.000Z'),
    });

    prisma.syncLog.create.mockResolvedValue({
      id: 'log-1',
      action: SyncAction.CONFLICT,
      result: SyncResult.SUCCESS,
    });

    const result = await service.resolve({
      conflictId: 'conflict-1',
      policy: 'SERVER_WINS',
      resolutionNotes: 'use server',
    });

    expect(result.logId).toBe('log-1');
    expect(result.conflict.status).toBe(ConflictStatus.RESOLVED);
  });

  it('rejects resolving an already resolved conflict', async () => {
    prisma.syncConflict.findUnique.mockResolvedValue({
      id: 'conflict-2',
      affectedEntity: 'ServiceLog',
      affectedId: 'log-2',
      status: ConflictStatus.RESOLVED,
      policy: 'CLIENT_WINS',
      details: null,
      resolutionNotes: null,
      resolvedAt: new Date('2026-05-24T00:00:00.000Z'),
      createdAt: new Date('2026-05-24T00:00:00.000Z'),
      updatedAt: new Date('2026-05-24T00:00:00.000Z'),
    });

    await expect(
      service.resolve({
        conflictId: 'conflict-2',
        policy: 'CLIENT_WINS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
