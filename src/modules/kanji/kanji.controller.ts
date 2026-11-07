import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('kanji')
export class KanjiController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAllKanji(@Query('limit') limitStr?: string) {
    const limitPerLevel = limitStr ? parseInt(limitStr) : 50;
    const [n5, n4, n3] = await Promise.all([
      this.prisma.systemKanji.findMany({ where: { level: 'N5' }, take: limitPerLevel, orderBy: { kanji: 'asc' } }),
      this.prisma.systemKanji.findMany({ where: { level: 'N4' }, take: limitPerLevel, orderBy: { kanji: 'asc' } }),
      this.prisma.systemKanji.findMany({ where: { level: 'N3' }, take: limitPerLevel, orderBy: { kanji: 'asc' } }),
    ]);
    return [...n5, ...n4, ...n3];
  }

  @Get('custom')
  @UseGuards(JwtAuthGuard)
  async getUserKanji(@Req() req: any) {
    return this.prisma.userKanji.findMany({
      where: { userId: req.user.id, isDeleted: false }
    });
  }

  @Post('custom')
  @UseGuards(JwtAuthGuard)
  async createUserKanji(@Req() req: any, @Body() data: any) {
    const userId = req.user.id;
    const existing = await this.prisma.userKanji.findUnique({
      where: { userId_kanji: { userId, kanji: data.kanji } }
    });
    if (existing) {
      return this.prisma.userKanji.update({
        where: { id: existing.id },
        data: { hanViet: data.hanViet || '', meaningVi: data.meaningVi, onyomi: data.onyomi || '', kunyomi: data.kunyomi || '' }
      });
    }
    return this.prisma.userKanji.create({
      data: { userId, kanji: data.kanji, hanViet: data.hanViet || '', meaningVi: data.meaningVi, onyomi: data.onyomi || '', kunyomi: data.kunyomi || '', level: 'N5' }
    });
  }
}