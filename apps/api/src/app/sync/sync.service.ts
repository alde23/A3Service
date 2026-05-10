import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SyncAction, SyncResult } from '../../generated/prisma/client';
import type { ReconcileItemDto } from './dto/reconcile.dto';

export type SyncStatus = {
  status: 'pending' | 'success' | 'failed';
  last_sync_at: string | null;
  last_action: SyncAction | null;
  last_result: SyncResult | null;
};

export type ReconcileResultItem = {
  idempotency_key: string;
  log_id: string;
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

  async getStatus(jobId?: string): Promise<SyncStatus> {
    const lastLog = await this.prisma.syncLog.findFirst({
      where: jobId ? { jobId } : undefined,
      orderBy: { timestamp: 'desc' },
    });

    if (!lastLog) {
      return {
        status: 'pending',
        last_sync_at: null,
        last_action: null,
        last_result: null,
      };
    }

    const failed = lastLog.result === SyncResult.FAIL;

    return {
      status: failed ? 'failed' : 'success',
      last_sync_at: lastLog.timestamp.toISOString(),
      last_action: lastLog.action,
      last_result: lastLog.result,
    };
  }

  async reconcile(items: ReconcileItemDto[]): Promise<ReconcileResult> {
    const results: ReconcileResultItem[] = [];
    let created = 0;
    let duplicates = 0;

    for (const item of items) {
      const existing = await this.findByIdempotency(item);
      if (existing) {
        duplicates += 1;
        results.push({
          idempotency_key: item.idempotencyKey,
          log_id: existing.id,
          result: existing.result,
          duplicate: true,
        });
        continue;
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

      created += 1;
      results.push({
        idempotency_key: item.idempotencyKey,
        log_id: createdLog.id,
        result: createdLog.result,
        duplicate: false,
      });
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
      take: 25,
    });

    return logs.find((log) => {
      const details = log.conflictDetails as { idempotencyKey?: string } | null;
      return details?.idempotencyKey === item.idempotencyKey;
    });
  }
}
