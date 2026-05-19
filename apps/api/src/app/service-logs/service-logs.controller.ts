import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../auth/jwt.types';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { UserRole } from '../../generated/prisma/client';
import { ServiceLogService } from './service-logs.service';
import { CreateServiceLogDto } from './dto/create-service-log.dto';
import { UpdateServiceLogDto } from './dto/update-service-log.dto';
import { SyncServiceLogDto } from './dto/sync-service-log.dto';

@Controller('service-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceLogsController {
  constructor(private readonly serviceLogService: ServiceLogService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('jobId') jobId?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    if (jobId !== undefined && (typeof jobId !== 'string' || jobId.length === 0)) {
      throw new BadRequestException('jobId must be a non-empty string');
    }

    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;

    return this.serviceLogService.list(req.user, jobId, page, pageSize);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
  ) {
    return this.serviceLogService.getById(req.user, id);
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateServiceLogDto,
  ) {
    return this.serviceLogService.create(req.user, body);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() body: UpdateServiceLogDto,
  ) {
    return this.serviceLogService.update(req.user, id, body);
  }

  @Post(':id/sync')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async sync(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() body: SyncServiceLogDto,
  ) {
    return this.serviceLogService.sync(req.user, id, body);
  }
}
