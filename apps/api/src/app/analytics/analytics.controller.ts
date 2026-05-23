import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { UserRole } from '../../generated/prisma/client';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles(UserRole.MANAGER)
  summary(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSummary(query);
  }

  @Get('earnings')
  @Roles(UserRole.MANAGER)
  earnings(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEarnings(query);
  }

  @Get('expenses')
  @Roles(UserRole.MANAGER)
  expenses(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getExpenses(query);
  }

  @Get('profitability')
  @Roles(UserRole.MANAGER)
  profitability(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getProfitability(query);
  }
}
