// src/modules/kanji/kanji.module.ts
import { Module } from '@nestjs/common';
import { KanjiController } from './kanji.controller';
import { KanjiProgressService } from './kanji-progress.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KanjiController],
  providers: [KanjiProgressService],
  exports: [KanjiProgressService],
})
export class KanjiModule {}