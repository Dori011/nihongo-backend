// backend/src/modules/test/test.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'
import { BambooService } from '../../bamboo/bamboo.service'
import { TestAttemptStatus, TestType } from '@prisma/client';

@Injectable()
export class TestService {
  constructor(
    private prisma: PrismaService,
    private bambooService: BambooService,
  ) {}

  async startTest(userId: string, testId: string) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test || !test.isPublished) throw new NotFoundException('Đề thi không tồn tại.');

    const expiresAt = new Date(Date.now() + test.timeLimit * 60 * 1000);
    return await this.prisma.testAttempt.create({
      data: {
        userId,
        testId,
        status: TestAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        expiresAt,
      },
    });
  }

  async submitTest(userId: string, attemptId: string, answers: Array<{ questionId: string; response: string }>) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra tính hợp lệ của Attempt
      const attempt = await tx.testAttempt.findUnique({
        where: { id: attemptId },
        include: { test: { include: { questions: true } } },
      });

      if (!attempt || attempt.userId !== userId) {
        throw new BadRequestException('Lượt thi không tồn tại.');
      }
      if (attempt.status === TestAttemptStatus.COMPLETED) {
        throw new BadRequestException('Bài thi đã nộp trước đó.');
      }
      if (attempt.expiresAt && new Date() > attempt.expiresAt) {
        await tx.testAttempt.update({
          where: { id: attemptId },
          data: { status:TestAttemptStatus.EXPIRED },
        });
        throw new BadRequestException('Bài thi đã hết thời gian quy định.');
      }

      // 2. Chấm điểm tự động dựa trên Server Single Source of Truth
      let totalScore = 0;
      const sectionScores: Record<string, number> = {};

      for (const q of attempt.test.questions) {
        const userAns = answers.find((a) => a.questionId === q.id);
        const userResponseClean = (userAns?.response || '').trim().toLowerCase();

        // Kiểm tra khớp với bất kỳ đáp án hợp lệ nào đã lưu
        const isCorrect = q.correctAnswer.trim().toLowerCase() === userResponseClean;
        const earned = isCorrect ? q.points : 0;

        totalScore += earned;
        sectionScores[q.section] = (sectionScores[q.section] || 0) + earned;

        await tx.testAnswer.create({
          data: {
            attemptId,
            questionId: q.id,
            userResponse: userAns?.response || '',
            isCorrect,
            earnedPoints: earned,
          },
        });
      }

      // 3. Cập nhật kết quả bài thi
      const completedAttempt = await tx.testAttempt.update({
        where: { id: attemptId },
        data: {
          status: TestAttemptStatus.COMPLETED,
          submittedAt: new Date(),
          totalScore,
          sectionScores,
          isRewarded: true,
        },
      });

      // 4. Tính toán thưởng Bamboo Point
      let rewardPoints = 5; // Phần thưởng hoàn thành tiêu chuẩn

      if (attempt.test.type === TestType.JLPT_MOCK) {
        if (totalScore === 180) rewardPoints += 5;
        else if (totalScore >= 150) rewardPoints += 4;
        else if (totalScore >= 120) rewardPoints += 3;
        else if (totalScore >= 90) rewardPoints += 2;
      } else if (
        attempt.test.type === TestType.KANJI_TEST ||
        attempt.test.type === TestType.VOCABULARY_TEST
      ) {
        if (totalScore === 80) rewardPoints += 3;
        else if (totalScore >= 60) rewardPoints += 2;
        else if (totalScore >= 40) rewardPoints += 1;
      }

      // Kích hoạt cộng điểm qua Bamboo Engine có khóa chống nhận trùng
      await this.bambooService.executeTransaction(
        userId,
        rewardPoints,
        'TEST_COMPLETION',
        'TEST',
        `test-reward-${attemptId}`,
        attemptId,
        tx,
      );

      return {
        totalScore,
        sectionScores,
        rewardPoints,
        message: `Nộp bài thành công! Bạn nhận được +${rewardPoints} Cây Trúc.`,
      };
    });
  }
}