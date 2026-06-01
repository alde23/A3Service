import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { UserRole } from '../../generated/prisma/client';
import { CommissioningService } from './commissioning.service';
import type { CommissioningValidateRequestDto } from './dto/commissioning-validate.dto';

@Controller('commissioning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissioningController {
  constructor(private readonly commissioningService: CommissioningService) {}

  @Post('validate')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  validate(@Body() body: CommissioningValidateRequestDto) {
    return this.commissioningService.validate(body);
  }

  @Get('reference/:modelId')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  getReference(@Param('modelId') modelId: string) {
    return this.commissioningService.getReference(modelId);
  }
}
