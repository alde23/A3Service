import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { JobManagerService } from './job-manager.service';
import { GeoCodingService } from './geo-coding.service';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulingController],
  providers: [SchedulingService, JobManagerService, GeoCodingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
