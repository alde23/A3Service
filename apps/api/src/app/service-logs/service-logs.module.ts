import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceLogsController } from './service-logs.controller';
import { ServiceLogService } from './service-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceLogsController],
  providers: [ServiceLogService],
  exports: [ServiceLogService],
})
export class ServiceLogsModule {}
