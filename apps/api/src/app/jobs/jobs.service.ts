import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/jwt.types';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulingService: SchedulingService,
  ) {}

  private isManager(user: AuthenticatedUser) {
    return user.role === UserRole.MANAGER;
  }

  async create(dto: CreateJobDto) {
    const scheduledDate = new Date(dto.scheduledDate);
    if (!dto.scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('scheduledDate must be a valid date string');
    }

    if (
      dto.estimatedDuration !== undefined &&
      (!Number.isInteger(dto.estimatedDuration) || dto.estimatedDuration <= 0)
    ) {
      throw new BadRequestException('estimatedDuration must be a positive integer');
    }

    if (!dto.technicianId || typeof dto.technicianId !== 'string') {
      throw new BadRequestException('technicianId is required');
    }

    if (!dto.siteId || typeof dto.siteId !== 'string') {
      throw new BadRequestException('siteId is required');
    }

    if (dto.status && !Object.values(JobStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    if (dto.estimatedDuration) {
      const conflict = await this.schedulingService.hasConflict(
        dto.technicianId,
        scheduledDate,
        dto.estimatedDuration,
      );
      if (conflict) {
        throw new BadRequestException('Job conflicts with existing schedule');
      }
    }

    return this.prisma.job.create({
      data: {
        scheduledDate,
        estimatedDuration: dto.estimatedDuration,
        status: dto.status,
        priority: dto.priority,
        notes: dto.notes,
        technicianId: dto.technicianId,
        managerId: dto.managerId,
        siteId: dto.siteId,
        rawAddress: dto.rawAddress,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.job.findMany({
      where: { isDeleted: false },
      include: { site: true },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const job = this.isManager(user)
      ? await this.prisma.job.findFirst({ where: { id, isDeleted: false } })
      : await this.prisma.job.findFirst({
          where: { id, technicianId: user.sub, isDeleted: false },
        });

    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async update(id: string, dto: UpdateJobDto, user: AuthenticatedUser) {
    let scheduledDate: Date | undefined;
    if (dto.scheduledDate !== undefined) {
      const parsed = new Date(dto.scheduledDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('scheduledDate must be a valid date string');
      }
      scheduledDate = parsed;
    }

    if (
      dto.estimatedDuration !== undefined &&
      (!Number.isInteger(dto.estimatedDuration) || dto.estimatedDuration <= 0)
    ) {
      throw new BadRequestException('estimatedDuration must be a positive integer');
    }

    if (dto.status && !Object.values(JobStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    if (!this.isManager(user)) {
      const canSee = await this.prisma.job.findFirst({
        where: { id, technicianId: user.sub, isDeleted: false },
        select: { id: true },
      });
      if (!canSee) {
        throw new NotFoundException('Job not found');
      }

      return this.prisma.job.update({
        where: { id },
        data: {
          scheduledDate,
          estimatedDuration: dto.estimatedDuration,
          status: dto.status,
          priority: dto.priority,
          notes: dto.notes,
          technicianId: dto.technicianId,
          managerId: dto.managerId,
          siteId: dto.siteId,
          rawAddress: dto.rawAddress,
        },
      });
    }

    try {
      return await this.prisma.job.update({
        where: { id },
        data: {
          scheduledDate,
          estimatedDuration: dto.estimatedDuration,
          status: dto.status,
          priority: dto.priority,
          notes: dto.notes,
          technicianId: dto.technicianId,
          managerId: dto.managerId,
          siteId: dto.siteId,
          rawAddress: dto.rawAddress,
        },
      });
    } catch {
      throw new NotFoundException('Job not found');
    }
  }

  async updateStatus(id: string, dto: UpdateJobStatusDto, user: AuthenticatedUser) {
    if (!dto?.status || !Object.values(JobStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    const job = this.isManager(user)
      ? await this.prisma.job.findFirst({ where: { id, isDeleted: false } })
      : await this.prisma.job.findFirst({
          where: { id, technicianId: user.sub, isDeleted: false },
        });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.update({
      where: { id: job.id },
      data: { status: dto.status },
    });
  }

  async remove(id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}