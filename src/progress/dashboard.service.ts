import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ContentProgressStatus,
  SelfReview,
  TestAttemptStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';

const VN_TZ = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }); // YYYY-MM-DD
const dayKey = (d: Date) => dayFmt.format(d);

interface GroupRow {
  status: ContentProgressStatus;
  selfReview: SelfReview;
  _count: { _all: number };
}

function buildBucket(rows: GroupRow[], total: number) {
  const byStatus: Partial<Record<ContentProgressStatus, number>> = {};
  let mastered = 0;
  let learning = 0;
  let needsReview = 0;
  let tracked = 0;

  for (const r of rows) {
    const n = r._count._all;
    tracked += n;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + n;
    if (r.selfReview === SelfReview.UNDERSTOOD) mastered += n;
    else if (r.selfReview === SelfReview.NEEDS_REVIEW) needsReview += n;
    else if (r.status !== ContentProgressStatus.NOT_VIEWED) learning += n;
  }

  // Chưa xem = chưa có dòng tiến độ + dòng đang ở NOT_VIEWED
  const notViewed = Math.max(0, total - tracked) + (byStatus.NOT_VIEWED ?? 0);
  byStatus.NOT_VIEWED = notViewed;

  return { total, mastered, learning, needsReview, notViewed, byStatus };
}

function buildStreak(activeDays: Set<string>) {
  const now = Date.now();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(new Date(now - (6 - i) * DAY_MS));
    return { date, active: activeDays.has(date) };
  });

  // Hôm nay chưa học thì chuỗi chưa bị đứt, đếm lùi từ hôm qua
  let offset = activeDays.has(dayKey(new Date(now))) ? 0 : 1;
  let current = 0;
  while (activeDays.has(dayKey(new Date(now - offset * DAY_MS)))) {
    current++;
    offset++;
  }
  return { current, last7 };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async getDashboard(userId: string) {
    const [user, systemKanjiTotal, customKanjiTotal, vocabTotal] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, bambooBalance: true },
        }),
        this.prisma.systemKanji.count(),
        this.prisma.userKanji.count({ where: { userId, isDeleted: false } }),
        this.prisma.vocabulary.count(),
      ]);
    if (!user) throw new NotFoundException('Tài khoản không tồn tại.');

    const [kanjiGroups, customGroups, vocabGroups, testRows, recent, days] =
      await Promise.all([
        this.prisma.userKanjiProgress.groupBy({
          by: ['status', 'selfReview'],
          where: { userId },
          _count: { _all: true },
        }),
        this.prisma.userCustomKanjiProgress.groupBy({
          by: ['status', 'selfReview'],
          where: { userId, userKanji: { isDeleted: false } },
          _count: { _all: true },
        }),
        this.prisma.userVocabProgress.groupBy({
          by: ['status', 'selfReview'],
          where: { userId },
          _count: { _all: true },
        }),
        this.progress.getTestStatuses(userId),
        this.prisma.activityLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, type: true, label: true, createdAt: true },
        }),
        // createdAt là timestamp UTC (không múi giờ) -> đổi sang giờ Việt Nam rồi mới lấy ngày
        this.prisma.$queryRaw<Array<{ day: string }>>`
          SELECT DISTINCT to_char(
            (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
            'YYYY-MM-DD'
          ) AS day
          FROM "ActivityLog"
          WHERE "userId" = ${userId}
            AND "createdAt" >= now() - interval '365 days'
        `,
      ]);

    const byStatus: Partial<Record<TestAttemptStatus, number>> = {};
    for (const t of testRows) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

    const completed = testRows
      .filter((t) => t.status === TestAttemptStatus.COMPLETED)
      .sort(
        (a, b) =>
          (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0),
      );
    const last = completed[0];

    return {
      user,
      streak: buildStreak(new Set(days.map((d) => d.day))),
      kanji: buildBucket(
        [...kanjiGroups, ...customGroups],
        systemKanjiTotal + customKanjiTotal,
      ),
      vocab: buildBucket(vocabGroups, vocabTotal),
      tests: {
        total: testRows.length,
        completed: completed.length,
        byStatus,
        lastCompleted: last
          ? {
              title: last.title,
              score: last.score ?? 0,
              maxScore: last.maxScore,
              submittedAt: last.submittedAt,
            }
          : null,
      },
      recentActivity: recent,
    };
  }
}