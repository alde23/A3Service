import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SyncConflictsController } from './sync-conflicts.controller';
import { SyncConflictsService } from './sync-conflicts.service';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [SyncController, SyncConflictsController],
  providers: [SyncService, SyncConflictsService],
  exports: [SyncService, SyncConflictsService],
})
export class SyncModule {}
