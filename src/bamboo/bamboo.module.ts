import { Module } from '@nestjs/common';
import { BambooService } from './bamboo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BambooService],
  exports: [BambooService], // Quan trọng: Phải export thì KanjiModule mới dùng được
})
export class BambooModule {}