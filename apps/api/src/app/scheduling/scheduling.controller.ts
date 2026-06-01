import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  @Get('agenda')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  getAgenda() {
    // TODO(scheduling): implement with real travel-time matrix.
    // Input: date range or technician scope.
    // Output: ordered jobs plus ETA per stop.
    // Missing dependency: GeoCodingService.travelMatrix().
    // Validation test: agenda order is deterministic for the same input.
    throw new NotImplementedException('Scheduling agenda is not implemented yet');
  }

  @Post('reorder')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  reorder(@Body() body: Record<string, unknown>) {
    void body;
    // TODO(scheduling): implement with real travel-time matrix.
    // Input: ordered jobs with site coordinates.
    // Output: reordered jobs plus ETA per stop.
    // Missing dependency: GeoCodingService.travelMatrix().
    // Validation test: optimized route should reduce total travel time.
    throw new NotImplementedException('Scheduling reorder is not implemented yet');
  }

  @Post('eta')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  eta(@Body() body: Record<string, unknown>) {
    void body;
    // TODO(scheduling): implement with real travel-time matrix.
    // Input: origin/destination coordinates.
    // Output: estimated travel time between stops.
    // Missing dependency: GeoCodingService.travelMatrix().
    // Validation test: ETA response includes duration in minutes.
    throw new NotImplementedException('Scheduling ETA is not implemented yet');
  }

  @Post('optimize-route')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  optimizeRoute(@Body() body: Record<string, unknown>) {
    void body;
    // TODO(scheduling): implement with real travel-time matrix.
    // Input: ordered jobs with site coordinates.
    // Output: reordered jobs plus ETA per stop.
    // Missing dependency: GeoCodingService.travelMatrix().
    // Validation test: optimized route should reduce total travel time.
    throw new NotImplementedException('Route optimization is not implemented yet');
  }
}
