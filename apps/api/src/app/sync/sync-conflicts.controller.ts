import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { ConflictStatus, UserRole } from '../../generated/prisma/client';
import { SyncConflictsService } from './sync-conflicts.service';
import type { ResolveSyncConflictDto } from './dto/conflict.dto';

@Controller('sync/conflicts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncConflictsController {
  constructor(private readonly syncConflictsService: SyncConflictsService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  list(
    @Query('status') statusRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const status = statusRaw && Object.values(ConflictStatus).includes(statusRaw as ConflictStatus)
      ? (statusRaw as ConflictStatus)
      : undefined;

    if (statusRaw && !status) {
      throw new BadRequestException('status is invalid');
    }

    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;

    return this.syncConflictsService.list(status, page, pageSize);
  }

  @Post('resolve')
  @Roles(UserRole.MANAGER)
  resolve(@Body() body: ResolveSyncConflictDto) {
    return this.syncConflictsService.resolve(body);
  }
}
