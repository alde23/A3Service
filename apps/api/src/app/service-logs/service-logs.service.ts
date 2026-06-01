import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceLogStatus, SyncResult, UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/jwt.types';
import type { CreateServiceLogDto, ConsumedPartInputDto, LaborEntryInputDto } from './dto/create-service-log.dto';
import type { UpdateServiceLogDto } from './dto/update-service-log.dto';
import type { SyncServiceLogDto } from './dto/sync-service-log.dto';
import type {
  ServiceLogConsumedPartDto,
  ServiceLogDto,
  ServiceLogLaborEntryDto,
  ServiceLogListResponse,
  ServiceLogSyncResponse,
  ServiceLogTotalsDto,
} from './dto/service-log-response.dto';

type ServiceLogWithRelations = Prisma.ServiceLogGetPayload<{
  include: {
    laborEntries: true;
    consumedParts: true;
  };
}>;

@Injectable()
export class ServiceLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    jobId?: string,
    page?: number,
    pageSize?: number,
  ): Promise<ServiceLogListResponse> {
    const pagination = this.normalizePagination(page, pageSize);

    const where: Prisma.ServiceLogWhereInput = {
      isDeleted: false,
    };

    if (jobId) {
      where.jobId = jobId;
    }

    if (user.role === UserRole.TECHNICIAN) {
      where.job = {
        technicianId: user.sub,
        isDeleted: false,
      };
    }

    const total = await this.prisma.serviceLog.count({ where });
    const items = await this.prisma.serviceLog.findMany({
      where,
      include: {
        laborEntries: { where: { isDeleted: false } },
        consumedParts: { where: { isDeleted: false } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return {
      items: items.map((log) => this.mapServiceLog(log)),
      meta: pagination.withTotal(total),
    };
  }

  async getById(user: AuthenticatedUser, id: string): Promise<ServiceLogDto> {
    const log = await this.findAccessibleLog(user, id);
    if (!log) {
      throw new NotFoundException('Service log not found');
    }
    return this.mapServiceLog(log);
  }

  async create(user: AuthenticatedUser, dto: CreateServiceLogDto): Promise<ServiceLogDto> {
    if (!dto?.jobId || typeof dto.jobId !== 'string') {
      throw new BadRequestException('jobId is required');
    }

    await this.ensureJobAccess(user, dto.jobId);

    const laborEntries = dto.laborEntries ?? [];
    const consumedParts = dto.consumedParts ?? [];

    this.validateLaborEntries(laborEntries);
    await this.validateConsumedParts(consumedParts);

    const log = await this.prisma.serviceLog.create({
      data: {
        jobId: dto.jobId,
        summary: dto.summary,
        notes: dto.notes,
        skippedValidation: dto.skippedValidation ?? false,
        laborEntries: laborEntries.length
          ? { create: laborEntries.map((entry) => this.toLaborEntryCreate(entry)) }
          : undefined,
        consumedParts: consumedParts.length
          ? { create: consumedParts.map((part) => this.toConsumedPartCreate(part)) }
          : undefined,
      },
      include: {
        laborEntries: { where: { isDeleted: false } },
        consumedParts: { where: { isDeleted: false } },
      },
    });

    return this.mapServiceLog(log);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateServiceLogDto,
  ): Promise<ServiceLogDto> {
    const existing = await this.findAccessibleLog(user, id);
    if (!existing) {
      throw new NotFoundException('Service log not found');
    }

    const laborEntries = dto.laborEntries ?? null;
    const consumedParts = dto.consumedParts ?? null;

    if (laborEntries) {
      this.validateLaborEntries(laborEntries);
    }

    if (consumedParts) {
      await this.validateConsumedParts(consumedParts);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.serviceLog.update({
        where: { id },
        data: {
          summary: dto.summary,
          notes: dto.notes,
          skippedValidation: dto.skippedValidation ?? undefined,
        },
      });

      if (laborEntries) {
        await tx.laborEntry.deleteMany({ where: { serviceLogId: id } });
        if (laborEntries.length > 0) {
          await tx.laborEntry.createMany({
            data: laborEntries.map((entry) => ({
              serviceLogId: id,
              ...this.toLaborEntryCreate(entry),
            })),
          });
        }
      }

      if (consumedParts) {
        await tx.consumedPart.deleteMany({ where: { serviceLogId: id } });
        if (consumedParts.length > 0) {
          await tx.consumedPart.createMany({
            data: consumedParts.map((part) => ({
              serviceLogId: id,
              ...this.toConsumedPartCreate(part),
            })),
          });
        }
      }

      return tx.serviceLog.findUnique({
        where: { id },
        include: {
          laborEntries: { where: { isDeleted: false } },
          consumedParts: { where: { isDeleted: false } },
        },
      });
    });

    if (!updated) {
      throw new NotFoundException('Service log not found');
    }

    return this.mapServiceLog(updated);
  }

  async sync(
    user: AuthenticatedUser,
    id: string,
    dto: SyncServiceLogDto,
  ): Promise<ServiceLogSyncResponse> {
    if (!dto?.idempotencyKey || typeof dto.idempotencyKey !== 'string') {
      throw new BadRequestException('idempotencyKey is required');
    }

    if (!dto?.jobId || typeof dto.jobId !== 'string') {
      throw new BadRequestException('jobId is required');
    }

    const existingSync = await this.prisma.serviceLogSync.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: {
        serviceLog: {
          include: {
            laborEntries: { where: { isDeleted: false } },
            consumedParts: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (existingSync) {
      return {
        status: existingSync.result,
        duplicate: true,
        serviceLog: this.mapServiceLog(existingSync.serviceLog),
      };
    }

    await this.ensureJobAccess(user, dto.jobId);

    const laborEntries = dto.laborEntries ?? [];
    const consumedParts = dto.consumedParts ?? [];

    this.validateLaborEntries(laborEntries);
    await this.validateConsumedParts(consumedParts);

    const payload: Prisma.InputJsonValue = {
      id,
      jobId: dto.jobId,
      summary: dto.summary ?? null,
      notes: dto.notes ?? null,
      laborEntries,
      consumedParts,
    };

    const synced = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceLog.findUnique({ where: { id } });
      if (
        current?.status === ServiceLogStatus.SYNCED &&
        (dto.laborEntries !== undefined || dto.consumedParts !== undefined)
      ) {
        throw new BadRequestException('Synced logs cannot change labor or parts');
      }

      const now = new Date();
      await tx.serviceLog.upsert({
        where: { id },
        update: {
          jobId: dto.jobId,
          summary: dto.summary,
          notes: dto.notes,
          skippedValidation: dto.skippedValidation ?? undefined,
          status: ServiceLogStatus.SYNCED,
          syncedAt: now,
        },
        create: {
          id,
          jobId: dto.jobId,
          summary: dto.summary,
          notes: dto.notes,
          skippedValidation: dto.skippedValidation ?? false,
          status: ServiceLogStatus.SYNCED,
          syncedAt: now,
        },
      });

      await tx.laborEntry.deleteMany({ where: { serviceLogId: id } });
      if (laborEntries.length > 0) {
        await tx.laborEntry.createMany({
          data: laborEntries.map((entry) => ({
            serviceLogId: id,
            ...this.toLaborEntryCreate(entry),
          })),
        });
      }

      await tx.consumedPart.deleteMany({ where: { serviceLogId: id } });
      if (consumedParts.length > 0) {
        await tx.consumedPart.createMany({
          data: consumedParts.map((part) => ({
            serviceLogId: id,
            ...this.toConsumedPartCreate(part),
          })),
        });
      }

      const updated = await tx.serviceLog.findUnique({
        where: { id },
        include: {
          laborEntries: { where: { isDeleted: false } },
          consumedParts: { where: { isDeleted: false } },
        },
      });

      if (!updated) {
        throw new NotFoundException('Service log not found');
      }

      await tx.serviceLogSync.create({
        data: {
          serviceLogId: id,
          jobId: dto.jobId,
          idempotencyKey: dto.idempotencyKey,
          result: SyncResult.SUCCESS,
          payload,
        },
      });

      return updated;
    });

    return {
      status: SyncResult.SUCCESS,
      duplicate: false,
      serviceLog: this.mapServiceLog(synced),
    };
  }

  private async findAccessibleLog(user: AuthenticatedUser, id: string) {
    const where: Prisma.ServiceLogWhereInput = {
      id,
      isDeleted: false,
    };

    if (user.role === UserRole.TECHNICIAN) {
      where.job = {
        technicianId: user.sub,
        isDeleted: false,
      };
    }

    return this.prisma.serviceLog.findFirst({
      where,
      include: {
        job: true,
        laborEntries: { where: { isDeleted: false } },
        consumedParts: { where: { isDeleted: false } },
      },
    });
  }

  private async ensureJobAccess(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        isDeleted: false,
        ...(user.role === UserRole.TECHNICIAN ? { technicianId: user.sub } : {}),
      },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }
  }

  private validateLaborEntries(entries: LaborEntryInputDto[]) {
    entries.forEach((entry, index) => {
      if (entry.hours === undefined || !Number.isFinite(entry.hours) || entry.hours <= 0) {
        throw new BadRequestException(`laborEntries[${index}].hours must be positive`);
      }
      if (
        entry.hourlyRate === undefined ||
        !Number.isFinite(entry.hourlyRate) ||
        entry.hourlyRate < 0
      ) {
        throw new BadRequestException(`laborEntries[${index}].hourlyRate must be zero or positive`);
      }
    });
  }

  private async validateConsumedParts(entries: ConsumedPartInputDto[]) {
    const partIds = entries.map((entry, index) => {
      if (!entry.partId || typeof entry.partId !== 'string') {
        throw new BadRequestException(`consumedParts[${index}].partId is required`);
      }
      if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
        throw new BadRequestException(`consumedParts[${index}].quantity must be a positive integer`);
      }
      if (entry.unitPrice !== undefined && (!Number.isFinite(entry.unitPrice) || entry.unitPrice < 0)) {
        throw new BadRequestException(`consumedParts[${index}].unitPrice must be zero or positive`);
      }
      return entry.partId;
    });

    const uniqueIds = [...new Set(partIds)];
    if (uniqueIds.length === 0) {
      return;
    }

    const existing = await this.prisma.part.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    if (existing.length !== uniqueIds.length) {
      throw new BadRequestException('consumedParts contains unknown partId');
    }
  }

  private toLaborEntryCreate(entry: LaborEntryInputDto) {
    return {
      hours: entry.hours,
      hourlyRate: new Prisma.Decimal(entry.hourlyRate),
      description: entry.description,
    };
  }

  private toConsumedPartCreate(entry: ConsumedPartInputDto) {
    return {
      partId: entry.partId,
      quantity: entry.quantity,
      unitPrice: entry.unitPrice !== undefined ? new Prisma.Decimal(entry.unitPrice) : undefined,
      notes: entry.notes,
    };
  }

  private mapServiceLog(log: ServiceLogWithRelations): ServiceLogDto {
    const laborEntries = log.laborEntries.map((entry) => this.mapLaborEntry(entry));
    const consumedParts = log.consumedParts.map((part) => this.mapConsumedPart(part));
    const totals = this.calculateTotals(log);

    return {
      id: log.id,
      jobId: log.jobId,
      status: log.status,
      summary: log.summary ?? null,
      notes: log.notes ?? null,
      skippedValidation: log.skippedValidation ?? false,
      syncedAt: log.syncedAt ? log.syncedAt.toISOString() : null,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
      laborEntries,
      consumedParts,
      totals,
    };
  }

  private mapLaborEntry(entry: ServiceLogWithRelations['laborEntries'][number]): ServiceLogLaborEntryDto {
    return {
      id: entry.id,
      hours: entry.hours,
      hourlyRate: entry.hourlyRate.toFixed(2),
      description: entry.description ?? null,
    };
  }

  private mapConsumedPart(part: ServiceLogWithRelations['consumedParts'][number]): ServiceLogConsumedPartDto {
    return {
      id: part.id,
      partId: part.partId,
      quantity: part.quantity,
      unitPrice: part.unitPrice ? part.unitPrice.toFixed(2) : null,
      notes: part.notes ?? null,
    };
  }

  private calculateTotals(log: ServiceLogWithRelations): ServiceLogTotalsDto {
    const laborTotal = log.laborEntries.reduce(
      (acc, entry) => acc.plus(entry.hourlyRate.mul(entry.hours)),
      new Prisma.Decimal(0),
    );

    const partsTotal = log.consumedParts.reduce((acc, part) => {
      if (!part.unitPrice) {
        return acc;
      }
      return acc.plus(part.unitPrice.mul(part.quantity));
    }, new Prisma.Decimal(0));

    const totalCost = laborTotal.plus(partsTotal);

    return {
      laborTotal: laborTotal.toFixed(2),
      partsTotal: partsTotal.toFixed(2),
      totalCost: totalCost.toFixed(2),
    };
  }

  private normalizePagination(page?: number, pageSize?: number) {
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
