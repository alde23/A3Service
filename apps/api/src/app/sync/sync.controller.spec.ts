import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SyncAction } from '../../generated/prisma/client';
import { SyncController } from './sync.controller';

const makeController = () => {
  const syncService = {
    getStatus: vi.fn(async () => ({
      status: 'pending',
      last_sync_at: null,
      last_action: null,
      last_result: null,
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
});
