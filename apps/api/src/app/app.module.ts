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
import { ServiceLogsModule } from './service-logs/service-logs.module';

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
    ServiceLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}