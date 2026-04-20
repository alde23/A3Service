import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/jwt.types';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulingService: SchedulingService,
  ) {}

  private isManager(user: AuthenticatedUser) {
    return user.role === Role.MANAGER;
  }

  async create(dto: CreateJobDto) {
    if (!dto.title || typeof dto.title !== 'string') {
      throw new BadRequestException('title is required');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (!dto.scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid date string');
    }

    if (!Number.isInteger(dto.durationMinutes) || dto.durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be a positive integer');
    }

    if (!dto.technicianId || typeof dto.technicianId !== 'string') {
      throw new BadRequestException('technicianId is required');
    }

    if (!dto.clientId || typeof dto.clientId !== 'string') {
      throw new BadRequestException('clientId is required');
    }

    if (dto.status && !Object.values(JobStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    const conflict = await this.schedulingService.hasConflict(
      dto.technicianId,
      scheduledAt,
      dto.durationMinutes,
    );
    if (conflict) {
      throw new BadRequestException('Job conflicts with existing schedule');
    }

    return this.prisma.job.create({
      data: {
        title: dto.title,
        scheduledAt,
        durationMinutes: dto.durationMinutes,
        status: dto.status,
        notes: dto.notes,
        latitude: dto.latitude,
        longitude: dto.longitude,
        technicianId: dto.technicianId,
        clientId: dto.clientId,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.job.findMany({
      where: this.isManager(user) ? undefined : { technicianId: user.sub },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const job = this.isManager(user)
      ? await this.prisma.job.findUnique({ where: { id } })
      : await this.prisma.job.findFirst({
          where: { id, technicianId: user.sub },
        });

    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async update(id: string, dto: UpdateJobDto, user: AuthenticatedUser) {
    let scheduledAt: Date | undefined;
    if (dto.scheduledAt !== undefined) {
      const parsed = new Date(dto.scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('scheduledAt must be a valid date string');
      }
      scheduledAt = parsed;
    }

    if (
      dto.durationMinutes !== undefined &&
      (!Number.isInteger(dto.durationMinutes) || dto.durationMinutes <= 0)
    ) {
      throw new BadRequestException('durationMinutes must be a positive integer');
    }

    if (dto.status && !Object.values(JobStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    if (!this.isManager(user)) {
      const canSee = await this.prisma.job.findFirst({
        where: { id, technicianId: user.sub },
        select: { id: true },
      });
      if (!canSee) {
        throw new NotFoundException('Job not found');
      }

      // Minimal, production-sensible default: technicians can only update status/notes
      // on their own jobs (prevents reassignment / privilege escalation).
      return this.prisma.job.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes,
        },
      });
    }

    try {
      return await this.prisma.job.update({
        where: { id },
        data: {
          title: dto.title,
          scheduledAt,
          durationMinutes: dto.durationMinutes,
          status: dto.status,
          notes: dto.notes,
          latitude: dto.latitude,
          longitude: dto.longitude,
          technicianId: dto.technicianId,
          clientId: dto.clientId,
        },
      });
    } catch {
      // Prisma throws if record doesn't exist. Keep response clean.
      throw new NotFoundException('Job not found');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.job.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Job not found');
    }
  }
}
