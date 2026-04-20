import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [PrismaModule, SchedulingModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
