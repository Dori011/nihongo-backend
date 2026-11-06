// backend/prisma/seed.ts
import { PrismaClient, Role, JLPTLevel } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('--- KHỞI TẠO SEED DỮ LIỆU CHUẨN ---');

  // 1. Tạo Whitelist mẫu
  await prisma.whitelist.upsert({
    where: { identifier: 'admin@pastelbakery.com' },
    update: {},
    create: { identifier: 'admin@pastelbakery.com', isUsed: true },
  });

  await prisma.whitelist.upsert({
    where: { identifier: 'student@pastelbakery.com' },
    update: {},
    create: { identifier: 'student@pastelbakery.com', isUsed: false },
  });

  // 2. Tạo Tài khoản Admin
  const adminPass = await argon2.hash('Admin@Bakery2026', { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pastelbakery.com' },
    update: {},
    create: {
      username: 'master_chef',
      email: 'admin@pastelbakery.com',
      passwordHash: adminPass,
      role: Role.ADMIN,
      bambooBalance: 100,
    },
  });

  // 3. Seed Dữ liệu Kanji N5 Cơ bản
  const sampleKanji = [
    {
      kanji: '日',
      hanViet: 'NHẬT',
      meaningVi: 'Ngày, mặt trời',
      onyomi: 'ニチ, ジツ',
      kunyomi: 'ひ, -び, -か',
      strokeCount: 4,
      radical: '日',
      readings: 'ニチ, ジツ / ひ, -び, -か', // Thêm trường bắt buộc
      compounds: [{ word: '日曜日', reading: 'にちようび', meaning: 'Chủ nhật' }],
      exampleJa: 'きょうは日曜日です。', // Sửa tên trường
      exampleVi: 'Hôm nay là Chủ nhật.', // Sửa tên trường
      level: JLPTLevel.N5,
    },
    {
      kanji: '本',
      hanViet: 'BẢN',
      meaningVi: 'Sách, gốc rễ',
      onyomi: 'ホン',
      kunyomi: 'もと',
      strokeCount: 5,
      radical: '木',
      readings: 'ホン / もと', // Thêm trường bắt buộc
      compounds: [{ word: '日本', reading: 'にほん', meaning: 'Nhật Bản' }],
      exampleJa: 'これは日本語の本です。', // Sửa tên trường
      exampleVi: 'Đây là sách tiếng Nhật.', // Sửa tên trường
      level: JLPTLevel.N5,
    },
  ];

  for (const k of sampleKanji) {
    // Sửa prisma.kanji thành prisma.systemKanji
    await prisma.systemKanji.upsert({
      where: { kanji: k.kanji },
      update: {},
      create: k,
    });
  }

  console.log('Seed dữ liệu hoàn tất!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());