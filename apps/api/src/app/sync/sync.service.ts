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
  succeeded: number;
  failed: number;
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
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      const outcome = await this.withIdempotencyLock(item.idempotencyKey, () =>
        this.processItem(item),
      );

      if (outcome.duplicate) {
        duplicates += 1;
      } else {
        created += 1;
        if (outcome.result === SyncResult.SUCCESS) {
          succeeded += 1;
        } else {
          failed += 1;
        }
      }

      results.push(outcome);
    }

    const hasFailure = results.some((r) => r.result === SyncResult.FAIL);

    return {
      status: hasFailure ? 'failed' : 'success',
      received: items.length,
      created,
      duplicates,
      succeeded,
      failed,
      results,
    };
  }

  private async findByIdempotency(item: ReconcileItemDto) {
    return this.prisma.syncLog.findFirst({
      where: {
        affectedEntity: item.affectedEntity,
        affectedId: item.affectedId,
        action: item.action,
        idempotencyKey: item.idempotencyKey,
      },
      orderBy: { timestamp: 'desc' },
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

    const initialResult = item.result ?? SyncResult.SUCCESS;
    const now = new Date();

    const conflictDetails: Prisma.InputJsonValue = {
      idempotencyKey: item.idempotencyKey,
      payload: item.payload ?? null,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const createdLog = await tx.syncLog.create({
          data: {
            action: item.action,
            affectedEntity: item.affectedEntity,
            affectedId: item.affectedId,
            idempotencyKey: item.idempotencyKey,
            result: initialResult,
            jobId: item.jobId,
            conflictDetails,
          },
        });

        let finalResult = createdLog.result;

        if (item.jobId && initialResult === SyncResult.SUCCESS) {
          const updateResult = await tx.job.updateMany({
            where: { id: item.jobId },
            data: { lastSyncedAt: now },
          });

          if (updateResult.count === 0) {
            finalResult = SyncResult.FAIL;
            await tx.syncLog.update({
              where: { id: createdLog.id },
              data: { result: finalResult },
            });
          }
        }

        return {
          idempotencyKey: item.idempotencyKey,
          logId: createdLog.id,
          result: finalResult,
          duplicate: false,
        };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const duplicate = await this.findByIdempotency(item);
        if (duplicate) {
          return {
            idempotencyKey: item.idempotencyKey,
            logId: duplicate.id,
            result: duplicate.result,
            duplicate: true,
          };
        }
      }
      throw error;
    }
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

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
