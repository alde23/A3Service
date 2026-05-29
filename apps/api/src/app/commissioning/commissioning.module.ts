import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommissioningController } from './commissioning.controller';
import { CommissioningService } from './commissioning.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommissioningController],
  providers: [CommissioningService],
  exports: [CommissioningService],
})
export class CommissioningModule {}
