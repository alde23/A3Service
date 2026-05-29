import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, WarrantyStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/jwt.types';
import { CommissioningService } from '../commissioning/commissioning.service';
import type { WarrantyCreateDto } from './dto/warranty-create.dto';
import type { WarrantyStatusDto } from './dto/warranty-status.dto';
import type { WarrantyDto, WarrantyListResponse } from './dto/warranty-response.dto';

type WarrantyRecord = Prisma.WarrantyGetPayload<Prisma.WarrantyDefaultArgs>;

@Injectable()
export class WarrantyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissioningService: CommissioningService,
  ) {}

  async list(
    user: AuthenticatedUser,
    status?: WarrantyStatus,
    page?: number,
    pageSize?: number,
  ): Promise<WarrantyListResponse> {
    const pagination = this.normalizePagination(page, pageSize);

    const where: Prisma.WarrantyWhereInput = { isDeleted: false };
    if (status) {
      where.status = status;
    }

    if (user.role === UserRole.TECHNICIAN) {
      where.job = { technicianId: user.sub, isDeleted: false };
    }

    const total = await this.prisma.warranty.count({ where });
    const items = await this.prisma.warranty.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return {
      items: items.map((warranty) => this.mapWarranty(warranty)),
      meta: pagination.withTotal(total),
    };
  }

  async getById(user: AuthenticatedUser, id: string): Promise<WarrantyDto> {
    const warranty = await this.findAccessibleWarranty(user, id);
    if (!warranty) {
      throw new NotFoundException('Warranty not found');
    }
    return this.mapWarranty(warranty);
  }

  async create(user: AuthenticatedUser, dto: WarrantyCreateDto): Promise<WarrantyDto> {
    if (!dto?.jobId || typeof dto.jobId !== 'string') {
      throw new BadRequestException('jobId is required');
    }
    if (!dto?.boilerModelId || typeof dto.boilerModelId !== 'string') {
      throw new BadRequestException('boilerModelId is required');
    }
    if (!Array.isArray(dto.readings) || dto.readings.length === 0) {
      throw new BadRequestException('readings are required');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('startDate must be a valid ISO date string');
    }

    const durationMonths = dto.durationMonths ?? 12;
    if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
      throw new BadRequestException('durationMonths must be a positive integer');
    }

    await this.ensureJobAccess(user, dto.jobId);

    const model = await this.prisma.boilerModel.findFirst({
      where: { id: dto.boilerModelId, isDeleted: false },
      select: { id: true },
    });

    if (!model) {
      throw new NotFoundException('Boiler model not found');
    }

    const validation = await this.commissioningService.validate({
      modelId: dto.boilerModelId,
      readings: dto.readings,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Commissioning validation failed',
        details: validation,
      });
    }

    const expiresAt = this.addMonthsUtc(startDate, durationMonths);
    const status = new Date() > expiresAt ? WarrantyStatus.EXPIRED : WarrantyStatus.ACTIVE;

    const created = await this.prisma.warranty.create({
      data: {
        jobId: dto.jobId,
        boilerModelId: dto.boilerModelId,
        startDate,
        durationMonths,
        expiresAt,
        status,
        notes: dto.notes,
      },
    });

    return this.mapWarranty(created);
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: WarrantyStatusDto,
  ): Promise<WarrantyDto> {
    if (!dto?.status) {
      throw new BadRequestException('status is required');
    }

    const existing = await this.findAccessibleWarranty(user, id);
    if (!existing) {
      throw new NotFoundException('Warranty not found');
    }

    const expiresAt = existing.expiresAt ?? this.addMonthsUtc(existing.startDate, existing.durationMonths);
    const now = new Date();

    if (dto.status === WarrantyStatus.ACTIVE && now > expiresAt) {
      throw new BadRequestException('Cannot activate an արդեն expired warranty');
    }

    if (dto.status === WarrantyStatus.EXPIRED && now < expiresAt) {
      throw new BadRequestException('Cannot expire warranty before expiry date');
    }

    const updated = await this.prisma.warranty.update({
      where: { id },
      data: {
        status: dto.status,
        expiresAt,
      },
    });

    return this.mapWarranty(updated);
  }

  private async findAccessibleWarranty(user: AuthenticatedUser, id: string) {
    const where: Prisma.WarrantyWhereInput = { id, isDeleted: false };

    if (user.role === UserRole.TECHNICIAN) {
      where.job = { technicianId: user.sub, isDeleted: false };
    }

    return this.prisma.warranty.findFirst({ where });
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

  private mapWarranty(warranty: WarrantyRecord): WarrantyDto {
    return {
      id: warranty.id,
      boilerModelId: warranty.boilerModelId,
      jobId: warranty.jobId ?? null,
      startDate: new Date(warranty.startDate).toISOString(),
      durationMonths: warranty.durationMonths,
      expiresAt: warranty.expiresAt ? new Date(warranty.expiresAt).toISOString() : null,
      status: warranty.status as WarrantyStatus,
      notes: warranty.notes ?? null,
      createdAt: new Date(warranty.createdAt).toISOString(),
      updatedAt: new Date(warranty.updatedAt).toISOString(),
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

  private addMonthsUtc(date: Date, months: number) {
    const next = new Date(date.getTime());
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }
}
