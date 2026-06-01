import {
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
import { UserRole, WarrantyStatus } from '../../generated/prisma/client';
import { WarrantyService } from './warranty.service';
import { WarrantyCreateDto } from './dto/warranty-create.dto';
import { WarrantyStatusDto } from './dto/warranty-status.dto';

@Controller('warranties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Req() req: AuthenticatedRequest, @Body() body: WarrantyCreateDto) {
    return this.warrantyService.create(req.user, body);
  }

  @Get()
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  list(
    @Req() req: AuthenticatedRequest,
    @Query('status') statusRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;
    const status = statusRaw && Object.values(WarrantyStatus).includes(statusRaw as WarrantyStatus)
      ? (statusRaw as WarrantyStatus)
      : undefined;

    return this.warrantyService.list(req.user, status, page, pageSize);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  getById(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
  ) {
    return this.warrantyService.getById(req.user, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.MANAGER)
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() body: WarrantyStatusDto,
  ) {
    return this.warrantyService.updateStatus(req.user, id, body);
  }
}
