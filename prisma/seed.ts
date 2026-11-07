// prisma/seed.ts
import { PrismaClient, Role, JLPTLevel } from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- BẮT ĐẦU SEED DỮ LIỆU ---');

  // 1. Seed Whitelist & Admin
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

  const adminPass = await argon2.hash('Admin@Bakery2026', { type: argon2.argon2id });
  await prisma.user.upsert({
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

  // 2. Hàm đọc file JSON
  const loadKanjiFromFile = (fileName: string, level: JLPTLevel) => {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Không tìm thấy file ${fileName}, bỏ qua.`);
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(data);
    
    return json.map((item: any) => {
      // Xử lý mảng âm Onyomi/Kunyomi thành chuỗi (VD: ["A", "B"] -> "A, B")
      const onyomiStr = Array.isArray(item.onyomi) ? item.onyomi.join(', ') : (item.onyomi || '');
      const kunyomiStr = Array.isArray(item.kunyomi) ? item.kunyomi.join(', ') : (item.kunyomi || '');

      return {
        kanji: item.character || item.kanji,
        hanViet: item.hanViet || 'Đang cập nhật', // JSON của bạn thiếu trường này
        meaningVi: item.meaningVi || item.meaning || 'Đang cập nhật',
        onyomi: onyomiStr,
        kunyomi: kunyomiStr,
        strokeCount: item.strokes || item.strokeCount || 0,
        radical: item.radical || '',
        compounds: item.compounds || [],
        exampleJa: item.exampleJa || '',
        exampleVi: item.exampleVi || '',
        level: level,
      };
    });
  };

  const n5Kanji = loadKanjiFromFile('n5.json', JLPTLevel.N5);
  const n4Kanji = loadKanjiFromFile('n4.json', JLPTLevel.N4);
  const n3Kanji = loadKanjiFromFile('n3.json', JLPTLevel.N3);

  const allKanji = [...n5Kanji, ...n4Kanji, ...n3Kanji];
  console.log(`Tìm thấy tổng cộng ${allKanji.length} chữ Kanji từ file JSON.`);

  // 3. Nạp vào Database
  let count = 0;
  for (const k of allKanji) {
    if (!k.kanji) continue; // Bỏ qua nếu không có chữ Kanji

    try {
      await prisma.systemKanji.upsert({
        where: { kanji: k.kanji },
        update: {}, // Nếu đã có thì không ghi đè
        create: {
          kanji: k.kanji,
          hanViet: k.hanViet,
          meaningVi: k.meaningVi,
          onyomi: k.onyomi,
          kunyomi: k.kunyomi,
          strokeCount: k.strokeCount,
          radical: k.radical,
          readings: '[]',
          compounds: k.compounds,
          exampleJa: k.exampleJa,
          exampleVi: k.exampleVi,
          level: k.level,
        },
      });
      count++;
    } catch (error) {
      console.log(`Lỗi khi nạp chữ ${k.kanji}:`, error);
    }
  }

  console.log(`--- HOÀN TẤT! Đã nạp ${count} chữ Kanji vào Database. ---`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());