import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Phải có 2 dấu ../ vì file nằm trong modules/kanji
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Phải có 2 dấu ../

@Controller('kanji')
@UseGuards(JwtAuthGuard)
export class KanjiController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAllKanji() {
    return this.prisma.systemKanji.findMany();
  }
}