import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { UserRole, SyncAction, SyncResult } from '../../generated/prisma/client';
import { SyncService } from './sync.service';
import type { ReconcileDto, ReconcileItemDto } from './dto/reconcile.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async status(@Query('jobId') jobId?: string) {
    if (jobId !== undefined && (typeof jobId !== 'string' || jobId.length === 0)) {
      throw new BadRequestException('jobId must be a non-empty string');
    }

    return this.syncService.getStatus(jobId);
  }

  @Post('reconcile')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async reconcile(@Body() body: ReconcileDto) {
    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items is required');
    }

    const items = body.items.map((item, index) =>
      this.validateItem(item, index),
    );

    return this.syncService.reconcile(items);
  }

  private validateItem(item: ReconcileItemDto, index: number): ReconcileItemDto {
    if (!item?.idempotencyKey || typeof item.idempotencyKey !== 'string') {
      throw new BadRequestException(`items[${index}].idempotencyKey is required`);
    }

    if (!item?.affectedEntity || typeof item.affectedEntity !== 'string') {
      throw new BadRequestException(`items[${index}].affectedEntity is required`);
    }

    if (!item?.affectedId || typeof item.affectedId !== 'string') {
      throw new BadRequestException(`items[${index}].affectedId is required`);
    }

    if (!item?.action || !Object.values(SyncAction).includes(item.action)) {
      throw new BadRequestException(`items[${index}].action is invalid`);
    }

    if (item.jobId !== undefined && typeof item.jobId !== 'string') {
      throw new BadRequestException(`items[${index}].jobId must be a string`);
    }

    if (item.result !== undefined && !Object.values(SyncResult).includes(item.result)) {
      throw new BadRequestException(`items[${index}].result is invalid`);
    }

    if (
      item.payload !== undefined &&
      (typeof item.payload !== 'object' || Array.isArray(item.payload))
    ) {
      throw new BadRequestException(`items[${index}].payload must be an object`);
    }

    return item;
  }
}
