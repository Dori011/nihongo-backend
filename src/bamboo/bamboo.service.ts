// backend/src/modules/bamboo/bamboo.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TransactionSource, Prisma } from '@prisma/client';

@Injectable()
export class BambooService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Thực thi thay đổi số dư cây trúc đảm bảo tính ACID và chống số dư âm
   */
  async executeTransaction(
    userId: string,
    amount: number,
    type: TransactionType,
    source: TransactionSource,
    idempotencyKey?: string,
    relatedEntityId?: string,
    externalTx?: Prisma.TransactionClient,
  ) {
    const operation = async (tx: Prisma.TransactionClient) => {
      // 1. Kiểm tra Idempotency nếu có (chống trùng lặp)
      if (idempotencyKey) {
        const existingTx = await tx.bambooTransaction.findUnique({
          where: { idempotencyKey },
        });
        if (existingTx) return existingTx;
      }

      // 2. Lock dòng User để kiểm tra số dư nguyên tử (Chống Race Condition)
      const users = await tx.$queryRaw<Array<{ id: string; bambooBalance: number }>>`
        SELECT id, "bambooBalance" FROM "User" WHERE id = ${userId} FOR UPDATE
      `;

      if (!users || users.length === 0) {
        throw new BadRequestException('Người dùng không tồn tại.');
      }

      const currentBalance = users[0].bambooBalance;
      const newBalance = currentBalance + amount;

      // Chặn số dư âm và trả về đúng thông báo nghiệp vụ
      if (newBalance < 0) {
        throw new BadRequestException('hongg có đủ trình ời, học thêm đi');
      }

      // 3. Cập nhật số dư người dùng
      await tx.user.update({
        where: { id: userId },
        data: { bambooBalance: newBalance },
      });

      // 4. Tạo bản ghi giao dịch
      return await tx.bambooTransaction.create({
        data: {
          userId,
          type,
          amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          source,
          idempotencyKey,
          relatedEntityId,
        },
      });
    };

    // Nếu đã có transaction cha truyền vào thì dùng chung, không thì tạo mới
    if (externalTx) {
      return await operation(externalTx);
    }
    return await this.prisma.$transaction(operation);
  }
}