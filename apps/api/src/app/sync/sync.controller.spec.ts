import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SyncAction } from '../../generated/prisma/client';
import { SyncController } from './sync.controller';

const makeController = () => {
  const syncService = {
    getStatus: vi.fn(async () => ({
      status: 'pending',
      lastSyncAt: null,
      lastAction: null,
      lastResult: null,
    })),
    reconcile: vi.fn(async () => ({
      status: 'success',
      received: 1,
      created: 1,
      duplicates: 0,
      results: [],
    })),
  };

  return { controller: new SyncController(syncService as any), syncService };
};

describe('SyncController', () => {
  it('rejects empty items list', async () => {
    const { controller } = makeController();
    await expect(controller.reconcile({ items: [] } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects too many items', async () => {
    const { controller } = makeController();
    const items = Array.from({ length: 101 }, (_, i) => ({
      idempotencyKey: `key-${i}`,
      action: SyncAction.UPLOAD,
      affectedEntity: 'Job',
      affectedId: `job-${i}`,
    }));

    await expect(controller.reconcile({ items } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects invalid idempotency key', async () => {
    const { controller } = makeController();
    await expect(
      controller.reconcile({
        items: [
          {
            idempotencyKey: '',
            action: SyncAction.UPLOAD,
            affectedEntity: 'Job',
            affectedId: 'job-1',
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts valid status query', async () => {
    const { controller, syncService } = makeController();
    await controller.status('job-1');
    expect(syncService.getStatus).toHaveBeenCalledWith('job-1');
  });

  it('rejects array payloads', async () => {
    const { controller } = makeController();
    await expect(
      controller.reconcile({
        items: [
          {
            idempotencyKey: 'key-1',
            action: SyncAction.UPLOAD,
            affectedEntity: 'Job',
            affectedId: 'job-1',
            payload: [],
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects null payloads', async () => {
    const { controller } = makeController();
    await expect(
      controller.reconcile({
        items: [
          {
            idempotencyKey: 'key-null',
            action: SyncAction.UPLOAD,
            affectedEntity: 'Job',
            affectedId: 'job-2',
            payload: null,
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
