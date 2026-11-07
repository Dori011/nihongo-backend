import { Module } from '@nestjs/common';
import { KanjiController } from './kanji.controller';
import { KanjiProgressService } from './kanji-progress.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BambooModule } from '../../bamboo/bamboo.module';

@Module({
  imports: [PrismaModule, BambooModule],
  controllers: [KanjiController],
  providers: [KanjiProgressService],
  exports: [KanjiProgressService],
})
export class KanjiModule {}