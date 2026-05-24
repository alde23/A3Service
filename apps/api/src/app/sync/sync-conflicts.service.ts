import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ConflictStatus, SyncAction, SyncResult } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ResolveSyncConflictDto,
  ResolveSyncConflictResponse,
  SyncConflictDto,
  SyncConflictListResponse,
} from './dto/conflict.dto';

type ConflictRecord = Prisma.SyncConflictGetPayload<Prisma.SyncConflictDefaultArgs>;

type Pagination = {
  page: number;
  pageSize: number;
  withTotal: (total: number) => { total: number; page: number; pageSize: number };
};

@Injectable()
export class SyncConflictsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    status: ConflictStatus | undefined,
    page?: number,
    pageSize?: number,
  ): Promise<SyncConflictListResponse> {
    const pagination = this.normalizePagination(page, pageSize);
    const where: Prisma.SyncConflictWhereInput = status ? { status } : {};

    const total = await this.prisma.syncConflict.count({ where });
    const items = await this.prisma.syncConflict.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return {
      items: items.map((conflict) => this.mapConflict(conflict)),
      meta: pagination.withTotal(total),
    };
  }

  async resolve(dto: ResolveSyncConflictDto): Promise<ResolveSyncConflictResponse> {
    if (!dto?.conflictId || typeof dto.conflictId !== 'string') {
      throw new BadRequestException('conflictId is required');
    }

    const conflict = await this.prisma.syncConflict.findUnique({
      where: { id: dto.conflictId },
    });

    if (!conflict) {
      throw new NotFoundException('Conflict not found');
    }

    if (conflict.status === ConflictStatus.RESOLVED) {
      throw new BadRequestException('Conflict is already resolved');
    }

    const updated = await this.prisma.syncConflict.update({
      where: { id: conflict.id },
      data: {
        policy: dto.policy,
        status: ConflictStatus.RESOLVED,
        resolutionNotes: dto.resolutionNotes,
        resolvedAt: new Date(),
      },
    });

    const conflictDetails: Prisma.InputJsonValue = {
      conflictId: conflict.id,
      policy: dto.policy,
      resolutionNotes: dto.resolutionNotes ?? null,
    };

    const log = await this.prisma.syncLog.create({
      data: {
        action: SyncAction.CONFLICT,
        affectedEntity: conflict.affectedEntity,
        affectedId: conflict.affectedId,
        idempotencyKey: conflict.id,
        result: SyncResult.SUCCESS,
        conflictDetails,
      },
    });

    return {
      conflict: this.mapConflict(updated),
      logId: log.id,
    };
  }

  private mapConflict(conflict: ConflictRecord): SyncConflictDto {
    return {
      id: conflict.id,
      affectedEntity: conflict.affectedEntity,
      affectedId: conflict.affectedId,
      status: conflict.status,
      policy: conflict.policy ?? null,
      details: (conflict.details as Record<string, unknown> | null) ?? null,
      resolutionNotes: conflict.resolutionNotes ?? null,
      resolvedAt: conflict.resolvedAt ? conflict.resolvedAt.toISOString() : null,
      createdAt: conflict.createdAt.toISOString(),
      updatedAt: conflict.updatedAt.toISOString(),
    };
  }

  private normalizePagination(page?: number, pageSize?: number): Pagination {
    const safePage = page && page > 0 ? Math.floor(page) : 1;
    const safeSize = pageSize && pageSize > 0 ? Math.floor(pageSize) : 25;
    const limitedSize = Math.min(safeSize, 100);

    return {
      page: safePage,
      pageSize: limitedSize,
      withTotal: (total: number) => ({ total, page: safePage, pageSize: limitedSize }),
    };
  }
}
