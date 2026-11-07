import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Truyền `tx` để ghi cùng transaction với thay đổi trạng thái. */
  log(
    db: Prisma.TransactionClient,
    userId: string,
    type: ActivityType,
    label: string,
    refId?: string,
  ) {
    return db.activityLog.create({ data: { userId, type, label, refId } });
  }
}