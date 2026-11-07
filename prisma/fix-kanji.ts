import { PrismaClient, JLPTLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Từ điển Anh - Việt cơ bản cho các từ thông dụng
const dictionary: Record<string, string> = {
  'day': 'Ngày', 'sun': 'Mặt trời', 'one': 'Một', 'two': 'Hai', 'three': 'Ba', 'four': 'Bốn', 'five': 'Năm',
  'six': 'Sáu', 'seven': 'Bảy', 'eight': 'Tám', 'nine': 'Chín', 'ten': 'Mười', 'hundred': 'Trăm', 'thousand': 'Ngàn',
  'person': 'Người', 'country': 'Quốc gia', 'year': 'Năm', 'large': 'Lớn', 'big': 'To', 'small': 'Nhỏ', 'little': 'Bé',
  'book': 'Sách', 'origin': 'Nguồn gốc', 'in': 'Trong', 'inside': 'Bên trong', 'middle': 'Giữa', 'center': 'Trung tâm',
  'long': 'Dài', 'leader': 'Lãnh đạo', 'exit': 'Lối ra', 'leave': 'Rời đi', 'go out': 'Đi ra', 'time': 'Thời gian',
  'hour': 'Giờ', 'going': 'Đi', 'journey': 'Hành trình', 'see': 'Nhìn', 'look': 'Xem', 'month': 'Tháng', 'moon': 'Mặt trăng',
  'part': 'Phần', 'minute': 'Phút', 'behind': 'Phía sau', 'back': 'Lưng', 'later': 'Sau', 'front': 'Phía trước',
  'before': 'Trước', 'life': 'Cuộc sống', 'birth': 'Sinh ra', 'interval': 'Khoảng', 'space': 'Không gian',
  'above': 'Trên', 'up': 'Lên', 'east': 'Đông', 'now': 'Bây giờ', 'gold': 'Vàng', 'enter': 'Vào', 'insert': 'Chèn',
  'study': 'Học', 'learning': 'Học tập', 'tall': 'Cao', 'high': 'Cao', 'expensive': 'Đắt', 'circle': 'Vòng tròn',
  'yen': 'Yên', 'round': 'Tròn', 'child': 'Đứa trẻ', 'outside': 'Bên ngoài', 'below': 'Dưới', 'down': 'Xuống',
  'come': 'Đến', 'due': 'Đến hạn', 'next': 'Tiếp theo', 'spirit': 'Tinh thần', 'air': 'Không khí', 'mountain': 'Núi',
  'tale': 'Câu chuyện', 'talk': 'Nói chuyện', 'woman': 'Phụ nữ', 'female': 'Nữ', 'north': 'Bắc', 'noon': 'Buổi trưa',
  'write': 'Viết', 'read': 'Đọc', 'friend': 'Bạn bè', 'left': 'Trái', 'right': 'Phải', 'rest': 'Nghỉ ngơi',
  'father': 'Cha', 'mother': 'Mẹ', 'rain': 'Mưa', 'fire': 'Lửa', 'water': 'Nước', 'tree': 'Cây', 'wood': 'Gỗ',
  'eat': 'Ăn', 'food': 'Thức ăn', 'car': 'Xe hơi', 'what': 'Cái gì', 'south': 'Nam', 'every': 'Mỗi', 'white': 'Trắng',
  'heavens': 'Trời', 'sky': 'Bầu trời', 'school': 'Trường học', 'exam': 'Kỳ thi', 'word': 'Từ', 'speech': 'Lời nói',
  'language': 'Ngôn ngữ', 'soil': 'Đất', 'earth': 'Trái đất', 'ground': 'Mặt đất', 'hear': 'Nghe', 'ask': 'Hỏi',
  'listen': 'Lắng nghe', 'electricity': 'Điện', 'nothingness': 'Hư vô', 'none': 'Không có', 'nothing': 'Không có gì',
};

// Hàm dịch cơ bản (nếu không có trong từ điển thì trả về nguyên bản tiếng Anh)
function translateToVietnamese(englishMeaning: string): string {
  const lower = englishMeaning.toLowerCase();
  return dictionary[lower] || englishMeaning;
}

async function main() {
  console.log('--- BẮT ĐẦU CẬP NHẬT NGHĨA TIẾNG VIỆT ---');

  const loadKanji = (file: string, level: JLPTLevel) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.map((item: any) => ({ ...item, level }));
  };

  const allKanji = [
    ...loadKanji('n5.json', JLPTLevel.N5),
    ...loadKanji('n4.json', JLPTLevel.N4),
    ...loadKanji('n3.json', JLPTLevel.N3),
  ];

  let count = 0;
  for (const k of allKanji) {
    const char = k.character || k.kanji;
    if (!char) continue;

    const englishMeanings = k.meanings || [];
    const vietnameseMeaning = englishMeanings.map(translateToVietnamese).join(', ');

    // Cập nhật lại vào Database
    await prisma.systemKanji.updateMany({
      where: { kanji: char },
      data: {
        meaningVi: vietnameseMeaning || 'Đang cập nhật',
        hanViet: k.nanori ? k.nanori[0].toUpperCase() : 'Đang cập nhật', // Tạm lấy Nanori làm Hán Việt
      },
    });
    count++;
  }

  console.log(`--- HOÀN TẤT! Đã cập nhật ${count} chữ Kanji ---`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());