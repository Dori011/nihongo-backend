// backend/src/modules/kanji/kanji-progress.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'
import { BambooService } from '../../bamboo/bamboo.service'

const ContentStatus = {
  OPENED: 'OPENED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  INCOMPLETE: 'INCOMPLETE',
} as const;

@Injectable()
export class KanjiProgressService {
  constructor(
    private prisma: PrismaService,
    private bambooService: BambooService,
  ) {}

  /**
   * Khi người dùng nhấn vào Pudding Icon để mở nội dung Kanji
   */
  async recordOpen(userId: string, kanjiId: string) {
    const existing = await this.prisma.userKanjiProgress.findUnique({
      where: { userId_kanjiId: { userId, kanjiId } },
    });

    if (!existing) {
      return await this.prisma.userKanjiProgress.create({
        data: {
          userId,
          kanjiId,
          status: ContentStatus.OPENED,
          firstOpenedAt: new Date(),
          lastOpenedAt: new Date(),
        },
      });
    }

    if (existing.status === ContentStatus.COMPLETED) {
      return existing; // Đã hoàn thành thì giữ nguyên vĩnh viễn
    }

    return await this.prisma.userKanjiProgress.update({
      where: { id: existing.id },
      data: {
        status: ContentStatus.IN_PROGRESS,
        lastOpenedAt: new Date(),
      },
    });
  }

  /**
   * Khi đóng màn hình mà chưa xác nhận hoàn thành
   */
  async recordLeave(userId: string, kanjiId: string) {
    const existing = await this.prisma.userKanjiProgress.findUnique({
      where: { userId_kanjiId: { userId, kanjiId } },
    });

    if (existing && existing.status !== ContentStatus.COMPLETED) {
      return await this.prisma.userKanjiProgress.update({
        where: { id: existing.id },
        data: { status: ContentStatus.INCOMPLETE },
      });
    }
  }

  /**
   * Xác nhận hoàn thành và kích hoạt mốc thưởng 5 System Kanji (+2 Bamboo)
   */
  async confirmComplete(userId: string, kanjiId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const progress = await tx.userKanjiProgress.findUnique({
        where: { userId_kanjiId: { userId, kanjiId } },
      });

      if (progress && progress.status === ContentStatus.COMPLETED) {
        return { message: 'Kanji này đã được hoàn thành trước đó.', progress };
      }

      const updatedProgress = await tx.userKanjiProgress.upsert({
        where: { userId_kanjiId: { userId, kanjiId } },
        create: {
          userId,
          kanjiId,
          status: ContentStatus.COMPLETED,
          firstOpenedAt: new Date(),
          completedAt: new Date(),
          isRewarded: true,
        },
        update: {
          status: ContentStatus.COMPLETED,
          completedAt: new Date(),
          isRewarded: true,
        },
      });

      // Kiểm tra mốc thưởng 5 System Kanji mới
      const totalCompletedSystemKanji = await tx.userKanjiProgress.count({
        where: {
          userId,
          status: ContentStatus.COMPLETED,
          isRewarded: true,
        },
      });

      // Cứ tích lũy đủ bội số của 5 sẽ thưởng +2
      if (totalCompletedSystemKanji > 0 && totalCompletedSystemKanji % 5 === 0) {
        const milestoneKey = `kanji-batch5-${userId}-${totalCompletedSystemKanji}`;
        await this.bambooService.executeTransaction(
          userId,
          2,
          'SYSTEM_KANJI_BATCH_5',
          'KANJI',
          milestoneKey,
          kanjiId,
          tx,
        );
      }

      return { message: 'Đã hoàn thành Kanji thành công', progress: updatedProgress };
    });
  }
}