import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityType,
  ContentProgressStatus,
  Prisma,
  SelfReview,
  TestAttemptStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from './activity.service';
import {
  ProgressKind,
  effectiveTestStatus,
  nextStatusOnEvent,
} from './progress.utils';

type Tx = Prisma.TransactionClient;

export interface ItemProgress {
  status: ContentProgressStatus;
  selfReview: SelfReview;
}

interface ProgressPatch {
  status?: ContentProgressStatus;
  selfReview?: SelfReview;
  reviewedAt?: Date | null;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  lastViewedAt?: Date;
  completedAt?: Date | null;
}

const ROW_SELECT = {
  status: true,
  selfReview: true,
  firstOpenedAt: true,
} as const;

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  // ------------------------------------------------------------------
  // Kanji / Từ vựng
  // ------------------------------------------------------------------

  /** Trả về { [itemId]: { status, selfReview } } để trang danh sách tô trạng thái. */
  async getStatusMap(userId: string, kind: ProgressKind) {
    const rows = await this.listRows(userId, kind);
    return Object.fromEntries(
      rows.map((r) => [
        r.itemId,
        { status: r.status, selfReview: r.selfReview },
      ]),
    ) as Record<string, ItemProgress>;
  }

  recordOpen(userId: string, kind: ProgressKind, itemId: string) {
    return this.run(() => this.applyEvent(userId, kind, itemId, 'open'));
  }

  recordRead(userId: string, kind: ProgressKind, itemId: string) {
    return this.run(() => this.applyEvent(userId, kind, itemId, 'read'));
  }

  /**
   * UNDERSTOOD   -> COMPLETED  (Đã hoàn thành)
   * NEEDS_REVIEW -> INCOMPLETE (Chưa hoàn thành)
   * UNRATED      -> VIEWING    (quay về Đã đọc)
   */
  setReview(
    userId: string,
    kind: ProgressKind,
    itemId: string,
    value: SelfReview,
  ) {
    return this.run(() =>
      this.prisma.$transaction(async (tx): Promise<ItemProgress> => {
        const label = await this.getLabel(tx, kind, userId, itemId);
        const row = await this.findRow(tx, kind, userId, itemId);
        const now = new Date();
        const noun = kind === 'vocab' ? 'từ' : 'chữ';

        const status =
          value === SelfReview.UNDERSTOOD
            ? ContentProgressStatus.COMPLETED
            : value === SelfReview.NEEDS_REVIEW
              ? ContentProgressStatus.INCOMPLETE
              : ContentProgressStatus.VIEWING;

        const saved = await this.saveRow(tx, kind, userId, itemId, {
          status,
          selfReview: value,
          reviewedAt: value === SelfReview.UNRATED ? null : now,
          completedAt: value === SelfReview.UNDERSTOOD ? now : null,
          firstOpenedAt: row?.firstOpenedAt ?? now,
          lastOpenedAt: now,
        });

        const before = row?.selfReview ?? SelfReview.UNRATED;
        if (value !== before) {
          if (value === SelfReview.UNDERSTOOD) {
            await this.activity.log(
              tx,
              userId,
              kind === 'vocab'
                ? ActivityType.COMPLETE_VOCAB
                : ActivityType.COMPLETE_KANJI,
              `Đã nắm ${noun} ${label}`,
              itemId,
            );
          } else if (value === SelfReview.NEEDS_REVIEW) {
            await this.activity.log(
              tx,
              userId,
              ActivityType.REVIEW_MARK,
              `Đánh dấu cần xem lại ${noun} ${label}`,
              itemId,
            );
          }
        }
        return { status: saved.status, selfReview: saved.selfReview };
      }),
    );
  }

  private applyEvent(
    userId: string,
    kind: ProgressKind,
    itemId: string,
    event: 'open' | 'read',
  ) {
    return this.prisma.$transaction(async (tx): Promise<ItemProgress> => {
      const label = await this.getLabel(tx, kind, userId, itemId);
      const row = await this.findRow(tx, kind, userId, itemId);
      const current = row?.status ?? ContentProgressStatus.NOT_VIEWED;
      const now = new Date();

      const saved = await this.saveRow(tx, kind, userId, itemId, {
        status: nextStatusOnEvent(current, event),
        firstOpenedAt: row?.firstOpenedAt ?? now,
        lastOpenedAt: now,
        ...(event === 'read' ? { lastViewedAt: now } : {}),
      });

      // Chỉ ghi nhật ký lần xem đầu tiên, tránh spam
      if (current === ContentProgressStatus.NOT_VIEWED) {
        await this.activity.log(
          tx,
          userId,
          kind === 'vocab' ? ActivityType.OPEN_VOCAB : ActivityType.OPEN_KANJI,
          `Đã xem ${kind === 'vocab' ? 'từ' : 'chữ'} ${label}`,
          itemId,
        );
      }
      return { status: saved.status, selfReview: saved.selfReview };
    });
  }

  /** 2 request song song cùng tạo 1 dòng (vd React StrictMode) -> thử lại 1 lần. */
  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return fn();
      }
      throw e;
    }
  }

  private async getLabel(
    tx: Tx,
    kind: ProgressKind,
    userId: string,
    id: string,
  ): Promise<string> {
    switch (kind) {
      case 'kanji': {
        const k = await tx.systemKanji.findUnique({
          where: { id },
          select: { kanji: true },
        });
        if (!k) throw new NotFoundException('Không tìm thấy chữ Kanji.');
        return k.kanji;
      }
      case 'custom-kanji': {
        const k = await tx.userKanji.findFirst({
          where: { id, userId, isDeleted: false },
          select: { kanji: true },
        });
        if (!k) throw new NotFoundException('Không tìm thấy chữ Kanji.');
        return k.kanji;
      }
      case 'vocab': {
        const v = await tx.vocabulary.findUnique({
          where: { id },
          select: { kanji: true, hiragana: true },
        });
        if (!v) throw new NotFoundException('Không tìm thấy từ vựng.');
        return v.kanji ?? v.hiragana;
      }
    }
  }

  private findRow(tx: Tx, kind: ProgressKind, userId: string, id: string) {
    switch (kind) {
      case 'kanji':
        return tx.userKanjiProgress.findUnique({
          where: { userId_kanjiId: { userId, kanjiId: id } },
          select: ROW_SELECT,
        });
      case 'custom-kanji':
        return tx.userCustomKanjiProgress.findUnique({
          where: { userId_userKanjiId: { userId, userKanjiId: id } },
          select: ROW_SELECT,
        });
      case 'vocab':
        return tx.userVocabProgress.findUnique({
          where: { userId_vocabId: { userId, vocabId: id } },
          select: ROW_SELECT,
        });
    }
  }

  private saveRow(
    tx: Tx,
    kind: ProgressKind,
    userId: string,
    id: string,
    data: ProgressPatch,
  ) {
    switch (kind) {
      case 'kanji':
        return tx.userKanjiProgress.upsert({
          where: { userId_kanjiId: { userId, kanjiId: id } },
          create: { userId, kanjiId: id, ...data },
          update: data,
        });
      case 'custom-kanji':
        return tx.userCustomKanjiProgress.upsert({
          where: { userId_userKanjiId: { userId, userKanjiId: id } },
          create: { userId, userKanjiId: id, ...data },
          update: data,
        });
      case 'vocab':
        return tx.userVocabProgress.upsert({
          where: { userId_vocabId: { userId, vocabId: id } },
          create: { userId, vocabId: id, ...data },
          update: data,
        });
    }
  }

  private async listRows(
    userId: string,
    kind: ProgressKind,
  ): Promise<Array<{ itemId: string } & ItemProgress>> {
    switch (kind) {
      case 'kanji': {
        const rows = await this.prisma.userKanjiProgress.findMany({
          where: { userId },
          select: { kanjiId: true, status: true, selfReview: true },
        });
        return rows.map((r) => ({
          itemId: r.kanjiId,
          status: r.status,
          selfReview: r.selfReview,
        }));
      }
      case 'custom-kanji': {
        const rows = await this.prisma.userCustomKanjiProgress.findMany({
          where: { userId },
          select: { userKanjiId: true, status: true, selfReview: true },
        });
        return rows.map((r) => ({
          itemId: r.userKanjiId,
          status: r.status,
          selfReview: r.selfReview,
        }));
      }
      case 'vocab': {
        const rows = await this.prisma.userVocabProgress.findMany({
          where: { userId },
          select: { vocabId: true, status: true, selfReview: true },
        });
        return rows.map((r) => ({
          itemId: r.vocabId,
          status: r.status,
          selfReview: r.selfReview,
        }));
      }
    }
  }

  // ------------------------------------------------------------------
  // Test
  // ------------------------------------------------------------------

  /**
   * Mỗi đề test một trạng thái:
   * đã từng hoàn thành thì luôn là COMPLETED (kèm điểm cao nhất),
   * chưa thì lấy lần làm gần nhất, chưa làm lần nào thì NOT_OPENED.
   */
  async getTestStatuses(userId: string) {
    const tests = await this.prisma.test.findMany({
      where: { isPublished: true },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, type: true, level: true, maxScore: true },
    });

    const attempts = await this.prisma.testAttempt.findMany({
      where: { userId, testId: { in: tests.map((t) => t.id) } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        testId: true,
        status: true,
        scoreTotal: true,
        submittedAt: true,
        expiresAt: true,
      },
    });

    type Attempt = (typeof attempts)[number];
    const latest = new Map<string, Attempt>();
    const bestDone = new Map<string, Attempt>();
    for (const a of attempts) {
      if (!latest.has(a.testId)) latest.set(a.testId, a);
      if (a.status === TestAttemptStatus.COMPLETED) {
        const best = bestDone.get(a.testId);
        if (!best || a.scoreTotal > best.scoreTotal) bestDone.set(a.testId, a);
      }
    }

    return tests.map((t) => {
      const a = bestDone.get(t.id) ?? latest.get(t.id);
      return {
        testId: t.id,
        title: t.title,
        type: t.type,
        level: t.level,
        maxScore: t.maxScore,
        attemptId: a?.id ?? null,
        status: a
          ? effectiveTestStatus(a.status, a.expiresAt)
          : TestAttemptStatus.NOT_OPENED,
        score: a?.status === TestAttemptStatus.COMPLETED ? a.scoreTotal : null,
        submittedAt: a?.submittedAt ?? null,
      };
    });
  }

  /** Gọi khi user mở trang đề: tạo lượt làm ở trạng thái OPENED nếu chưa có lượt đang dở. */
  async openTest(userId: string, testId: string) {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, isPublished: true },
      select: { title: true },
    });
    if (!test) throw new NotFoundException('Không tìm thấy bài test.');

    const active = await this.prisma.testAttempt.findFirst({
      where: {
        userId,
        testId,
        status: {
          in: [
            TestAttemptStatus.NOT_OPENED,
            TestAttemptStatus.OPENED,
            TestAttemptStatus.IN_PROGRESS,
          ],
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, status: true },
    });
    if (active) return { attemptId: active.id, status: active.status };

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.testAttempt.create({
        data: { userId, testId, status: TestAttemptStatus.OPENED },
        select: { id: true, status: true },
      });
      await this.activity.log(
        tx,
        userId,
        ActivityType.OPEN_TEST,
        `Đã mở bài test “${test.title}”`,
        testId,
      );
      return { attemptId: created.id, status: created.status };
    });
  }
}