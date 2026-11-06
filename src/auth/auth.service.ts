import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  // API Đăng ký (Có kiểm tra Whitelist)
  async register(email: string, username: string, password: string) {
    // 1. Kiểm tra email có trong Whitelist không
    const whitelist = await this.prisma.whitelist.findUnique({ where: { identifier: email } });
    if (!whitelist || whitelist.isUsed) {
      throw new BadRequestException('Email không có trong danh sách được phép đăng ký!');
    }

    // 2. Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Tạo user mới
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, username, passwordHash },
      });
      // Đánh dấu whitelist đã dùng
      await tx.whitelist.update({
        where: { id: whitelist.id },
        data: { isUsed: true },
      });
      return user;
    });

    return { message: 'Đăng ký thành công', userId: newUser.id };
  }

  // API Đăng nhập
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    return { message: 'Đăng nhập thành công', user: { id: user.id, username: user.username, bamboo: user.bambooBalance } };
  }
}