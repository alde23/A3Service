import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../auth/jwt.types';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly schedulingService: SchedulingService,
  ) {}

  @Get('suggestions')
  @Roles(Role.MANAGER, Role.TECHNICIAN)
  async suggestions(
    @Query('technicianId') technicianId: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutesRaw: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!technicianId || typeof technicianId !== 'string') {
      throw new BadRequestException('technicianId is required');
    }
    if (!date || typeof date !== 'string') {
      throw new BadRequestException('date is required');
    }

    const durationMinutes = Number(durationMinutesRaw);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException(
        'durationMinutes must be a positive integer (minutes)',
      );
    }

    // Technicians may only request suggestions for themselves.
    if (req.user.role === Role.TECHNICIAN && technicianId !== req.user.sub) {
      throw new BadRequestException('technicianId must match authenticated user');
    }

    const slots = await this.schedulingService.suggestAvailableTimeSlots({
      technicianId,
      date,
      durationMinutes,
    });

    return slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    }));
  }

  @Post()
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Get()
  @Roles(Role.MANAGER, Role.TECHNICIAN)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.jobsService.findAll(req.user);
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.TECHNICIAN)
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.MANAGER, Role.TECHNICIAN)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateJobDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobsService.remove(id);
  }
}
