import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SelfReview } from '@prisma/client';
import { CurrentUserId, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { ProgressService } from './progress.service';
import { PROGRESS_KINDS, ProgressKind } from './progress.utils';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly dashboard: DashboardService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUserId() userId: string) {
    return this.dashboard.getDashboard(userId);
  }

  // Route của Test phải khai báo TRƯỚC các route ':kind'
  @Get('progress/tests')
  listTests(@CurrentUserId() userId: string) {
    return this.progress.getTestStatuses(userId);
  }

  @Post('progress/tests/:testId/open')
  openTest(@CurrentUserId() userId: string, @Param('testId') testId: string) {
    return this.progress.openTest(userId, testId);
  }

  @Get('progress/:kind')
  list(
    @CurrentUserId() userId: string,
    @Param('kind', new ParseEnumPipe(PROGRESS_KINDS)) kind: ProgressKind,
  ) {
    return this.progress.getStatusMap(userId, kind);
  }

  @Post('progress/:kind/:itemId/open')
  open(
    @CurrentUserId() userId: string,
    @Param('kind', new ParseEnumPipe(PROGRESS_KINDS)) kind: ProgressKind,
    @Param('itemId') itemId: string,
  ) {
    return this.progress.recordOpen(userId, kind, itemId);
  }

  @Post('progress/:kind/:itemId/read')
  read(
    @CurrentUserId() userId: string,
    @Param('kind', new ParseEnumPipe(PROGRESS_KINDS)) kind: ProgressKind,
    @Param('itemId') itemId: string,
  ) {
    return this.progress.recordRead(userId, kind, itemId);
  }

  @Patch('progress/:kind/:itemId/review')
  review(
    @CurrentUserId() userId: string,
    @Param('kind', new ParseEnumPipe(PROGRESS_KINDS)) kind: ProgressKind,
    @Param('itemId') itemId: string,
    @Body() body: { value?: string },
  ) {
    const value = body?.value as SelfReview;
    if (!Object.values(SelfReview).includes(value)) {
      throw new BadRequestException('Giá trị đánh giá không hợp lệ.');
    }
    return this.progress.setReview(userId, kind, itemId, value);
  }
}