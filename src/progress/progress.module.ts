import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ActivityService } from './activity.service';
import { DashboardService } from './dashboard.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProgressController],
  providers: [ProgressService, DashboardService, ActivityService],
  exports: [ProgressService, ActivityService],
})
export class ProgressModule {}