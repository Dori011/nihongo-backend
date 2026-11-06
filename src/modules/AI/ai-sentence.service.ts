// backend/src/modules/ai/ai-sentence.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BambooService } from '../../bamboo/bamboo.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import { TransactionType, TransactionSource } from '@prisma/client';

@Injectable()
export class AiSentenceService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private bambooService: BambooService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
  }

  // Chuẩn hóa và tính khoảng cách Levenshtein kiểm tra tương đồng
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();
    if (s1 === s2) return 1.0;
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }
    const distance = track[s2.length][s1.length];
    return 1 - distance / Math.max(s1.length, s2.length);
  }

  async checkSentence(userId: string, sentenceText: string, idempotencyKey: string) {
    const rawClean = sentenceText.trim();
    if (rawClean.length < 3 || rawClean.length > 300) {
      throw new BadRequestException('Câu tiếng Nhật phải từ 3 đến 300 ký tự.');
    }

    // 1. Kiểm tra giới hạn 15 lượt gọi mỗi ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyCount = await this.prisma.sentenceSubmission.count({
      where: { userId, createdAt: { gte: today } },
    });
    if (dailyCount >= 15) {
      throw new BadRequestException('Bạn đã dùng hết 15 lượt kiểm tra câu của ngày hôm nay.');
    }

    // 2. Trừ trước 2 Bamboo Point
    await this.bambooService.executeTransaction(
      userId,
      -2,
      TransactionType.AI_SENTENCE_DEDUCT, // Sử dụng Enum chuẩn
      TransactionSource.AI,
      `deduct-${idempotencyKey}`,
    );

    // 3. Chuẩn bị phân tích Anti-Cheat (Content Hash & Similarity)
    const normalizedText = rawClean.replace(/\s+/g, '');
    const contentHash = crypto.createHash('sha256').update(normalizedText).digest('hex');

    // Lưu ý: Schema của bạn không có trường isRewardingEligible, nên ta check qua isRewarded
    const previousRewarded = await this.prisma.sentenceSubmission.findMany({
      where: { userId, isRewarded: true }, // Sửa lại cho khớp schema
      select: { normalizedText: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const isDuplicate = previousRewarded.some((prev) => {
      return this.calculateSimilarity(prev.normalizedText, normalizedText) >= 0.85;
    });

    // 4. Gọi AI với cơ chế Rollback an toàn
    let aiResult: any;
    try {
      const response = await this.openai.chat.completions.create(
        {
          model: this.config.get<string>('AI_MODEL') || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Bạn là Trợ lý Giáo viên Tiếng Nhật N5-N3. Hãy kiểm tra câu tiếng Nhật sau và trả về JSON:
              {
                "isValid": boolean (true nếu câu đúng ngữ pháp, có ý nghĩa giao tiếp),
                "correctedText": string,
                "errors": [{"location": string, "type": "GRAMMAR" | "VOCAB" | "PARTICLE" | "UNNATURAL", "explanation": string}],
                "naturalExpression": string,
                "overallComment": string
              }`,
            },
            { role: 'user', content: rawClean },
          ],
          response_format: { type: 'json_object' },
        },
        {
          timeout: 15000, // ✅ Timeout đã được đưa ra làm tham số thứ 2
        }
      );

      aiResult = JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      // ROLLBACK: Hoàn lại 2 cây trúc khi gặp lỗi
      await this.bambooService.executeTransaction(
        userId,
        2,
        TransactionType.AI_SENTENCE_REFUND,
        TransactionSource.AI,
        `refund-${idempotencyKey}`,
      );
      throw new InternalServerErrorException('AI xử lý gặp sự cố hoặc gián đoạn mạng. Đã hoàn lại 2 Cây Trúc.');
    }

    // 5. Xác định điều kiện nhận thưởng: Hợp lệ + Không trùng lặp
    const isRewardingEligible = aiResult.isValid && !isDuplicate;

    await this.prisma.$transaction(async (tx) => {
      await tx.sentenceSubmission.create({
        data: {
          userId,
          originalText: rawClean,
          normalizedText,
          contentHash,
          idempotencyKey,
          
          // Mapping lại dữ liệu AI trả về cho khớp 100% với Schema
          correctedText: aiResult.correctedText || null,
          errorLocations: aiResult.errors || null, // Schema dùng errorLocations thay vì errorAnalysis
          errorType: aiResult.isValid ? 'NONE' : 'GRAMMAR', // Schema dùng errorType
          naturalVariants: aiResult.naturalExpression ? { expression: aiResult.naturalExpression } : null, // Schema dùng naturalVariants (Json)
          overallReview: aiResult.overallComment || null, // Schema dùng overallReview
          isValidJapanese: aiResult.isValid || false, // Schema dùng isValidJapanese
          isRewarded: isRewardingEligible, // Schema dùng isRewarded
        },
      });

      // Nếu đủ điều kiện, cộng thưởng +4 Cây Trúc (Net +2)
      if (isRewardingEligible) {
        await this.bambooService.executeTransaction(
          userId,
          4,
          TransactionType.AI_SENTENCE_REWARD,
          TransactionSource.AI,
          `reward-${idempotencyKey}`,
          undefined,
          tx,
        );
      }
    });

    return {
      aiEvaluation: aiResult,
      isRewarded: isRewardingEligible,
      rewardMessage: isRewardingEligible
        ? 'Tuyệt vời! Câu của bạn chính xác và nhận được +4 Cây Trúc (Net +2).'
        : isDuplicate
        ? 'Câu chính xác nhưng trùng lặp nội dung đã học trước đó, không cộng thưởng thêm.'
        : 'Câu cần cải thiện thêm, không có thưởng.',
    };
  }
}