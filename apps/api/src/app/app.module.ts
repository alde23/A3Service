import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature Modules snatched from api-jobs
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
  imports: [
    // Ensure Prisma is loaded first so other services can use it
    PrismaModule,
    AuthModule,
    JobsModule,
    SchedulingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}