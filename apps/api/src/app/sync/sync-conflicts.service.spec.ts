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

  describe('list', () => {
    it('returns paginated list of conflicts', async () => {
      prisma.syncConflict.count.mockResolvedValue(1);
      prisma.syncConflict.findMany.mockResolvedValue([
        {
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
        }
      ]);

      const result = await service.list(ConflictStatus.OPEN, 1, 10);
      expect(prisma.syncConflict.count).toHaveBeenCalledWith({ where: { status: ConflictStatus.OPEN } });
      expect(prisma.syncConflict.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ConflictStatus.OPEN },
          skip: 0,
          take: 10,
        })
      );
      expect(result.items.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('uses default pagination values', async () => {
      prisma.syncConflict.count.mockResolvedValue(0);
      prisma.syncConflict.findMany.mockResolvedValue([]);

      const result = await service.list(undefined);
      expect(prisma.syncConflict.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 25,
        })
      );
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(25);
    });
  });

  describe('resolve', () => {
    it('throws if conflictId is missing', async () => {
      await expect(service.resolve({} as any)).rejects.toThrow('conflictId is required');
    });

    it('throws if conflict is not found', async () => {
      prisma.syncConflict.findUnique.mockResolvedValue(null);
      await expect(service.resolve({ conflictId: 'invalid', policy: 'SERVER_WINS' } as any)).rejects.toThrow('Conflict not found');
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
      } as any);

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
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
