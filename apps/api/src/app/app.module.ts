import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { validate } from '../config/env.config';

// Feature Modules snatched from api-jobs
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { HealthModule } from './health/health.module';
import { LibraryModule } from './library/library.module';
import { ServiceLogsModule } from './service-logs/service-logs.module';
import { SyncModule } from './sync/sync.module';
import { CommissioningModule } from './commissioning/commissioning.module';
import { WarrantyModule } from './warranty/warranty.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate, // shorthand for { validate: validate }
    }),
    // Ensure Prisma is loaded first so other services can use it
    PrismaModule,
    AuthModule,
    JobsModule,
    SchedulingModule,
    HealthModule,
    LibraryModule,
    ServiceLogsModule,
    LibraryModule,
    ServiceLogsModule,
    HealthModule,
    SyncModule,
    CommissioningModule,
    WarrantyModule,
    AnalyticsModule,
    AnalyticsModule,
    CommissioningModule,
    WarrantyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}