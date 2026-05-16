import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SyncAction, SyncResult } from '../../generated/prisma/client';
import type { ReconcileItemDto } from './dto/reconcile.dto';

export type SyncStatus = {
  status: 'pending' | 'success' | 'failed';
  lastSyncAt: string | null;
  lastAction: SyncAction | null;
  lastResult: SyncResult | null;
};

export type ReconcileResultItem = {
  idempotencyKey: string;
  logId: string;
  result: SyncResult;
  duplicate: boolean;
};

export type ReconcileResult = {
  status: 'success' | 'failed';
  received: number;
  created: number;
  duplicates: number;
  results: ReconcileResultItem[];
};

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly idempotencyLocks = new Map<string, Promise<void>>();

  async getStatus(jobId?: string): Promise<SyncStatus> {
    const lastLog = await this.prisma.syncLog.findFirst({
      where: jobId ? { jobId } : undefined,
      orderBy: { timestamp: 'desc' },
    });

    if (!lastLog) {
      return {
        status: 'pending',
        lastSyncAt: null,
        lastAction: null,
        lastResult: null,
      };
    }

    const status = this.mapResultToStatus(lastLog.result);

    return {
      status,
      lastSyncAt: lastLog.timestamp.toISOString(),
      lastAction: lastLog.action,
      lastResult: lastLog.result,
    };
  }

  async reconcile(items: ReconcileItemDto[]): Promise<ReconcileResult> {
    const results: ReconcileResultItem[] = [];
    let created = 0;
    let duplicates = 0;

    for (const item of items) {
      const outcome = await this.withIdempotencyLock(item.idempotencyKey, () =>
        this.processItem(item),
      );

      if (outcome.duplicate) {
        duplicates += 1;
      } else {
        created += 1;
      }

      results.push(outcome);
    }

    const hasFailure = results.some((r) => r.result === SyncResult.FAIL);

    return {
      status: hasFailure ? 'failed' : 'success',
      received: items.length,
      created,
      duplicates,
      results,
    };
  }

  private async findByIdempotency(item: ReconcileItemDto) {
    const where = {
      affectedEntity: item.affectedEntity,
      affectedId: item.affectedId,
      action: item.action,
      ...(item.jobId ? { jobId: item.jobId } : {}),
    };

    const logs = await this.prisma.syncLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return logs.find((log) => {
      const details = log.conflictDetails as { idempotencyKey?: string } | null;
      return details?.idempotencyKey === item.idempotencyKey;
    });
  }

  private mapResultToStatus(result: SyncResult): SyncStatus['status'] {
    switch (result) {
      case SyncResult.FAIL:
        return 'failed';
      case SyncResult.SUCCESS:
        return 'success';
      default:
        return 'pending';
    }
  }

  private async processItem(item: ReconcileItemDto): Promise<ReconcileResultItem> {
    const existing = await this.findByIdempotency(item);
    if (existing) {
      return {
        idempotencyKey: item.idempotencyKey,
        logId: existing.id,
        result: existing.result,
        duplicate: true,
      };
    }

    const result = item.result ?? SyncResult.SUCCESS;
    const now = new Date();

    const conflictDetails: Prisma.InputJsonValue = {
      idempotencyKey: item.idempotencyKey,
      payload: item.payload ?? null,
    };

    const createdLog = await this.prisma.syncLog.create({
      data: {
        action: item.action,
        affectedEntity: item.affectedEntity,
        affectedId: item.affectedId,
        result,
        jobId: item.jobId,
        conflictDetails,
      },
    });

    if (item.jobId && result === SyncResult.SUCCESS) {
      await this.prisma.job.updateMany({
        where: { id: item.jobId },
        data: { lastSyncedAt: now },
      });
    }

    return {
      idempotencyKey: item.idempotencyKey,
      logId: createdLog.id,
      result: createdLog.result,
      duplicate: false,
    };
  }

  private async withIdempotencyLock<T>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.idempotencyLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const chain = previous.then(() => current);
    this.idempotencyLocks.set(key, chain);

    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.idempotencyLocks.get(key) === chain) {
        this.idempotencyLocks.delete(key);
      }
    }
  }
}
