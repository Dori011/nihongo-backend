// prisma/update-kanji.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// EM CHỈ CẦN ĐIỀN VÀO ĐÂY NHỮNG CHỮ CẦN CẬP NHẬT
// Những chữ nào không điền sẽ tự động bỏ qua.
const dataToUpdate = [
  // --- N5 ---
  { kanji: '日', hanViet: 'NHẬT', words: ['日本 (Nhật Bản)', '日曜日 (Chủ nhật)', '毎日 (Mỗi ngày)'] },
  { kanji: '一', hanViet: 'NHẤT', words: ['一つ (Một cái)', '一人 (Một người)', '一月 (Tháng 1)'] },
  { kanji: '国', hanViet: 'QUỐC', words: ['外国 (Nước ngoài)', '国語 (Quốc ngữ)', '国民 (Quốc dân)'] },
  { kanji: '人', hanViet: 'NHÂN', words: ['日本人 (Người Nhật)', '一人 (Một người)', '大人 (Người lớn)'] },
  { kanji: '年', hanViet: 'NIÊN', words: ['今年 (Năm nay)', '来年 (Năm sau)', '毎年 (Mỗi năm)'] },
  { kanji: '大', hanViet: 'ĐẠI', words: ['大学 (Đại học)', '大きい (To lớn)', '大切 (Quan trọng)'] },
  { kanji: '学', hanViet: 'HỌC', words: ['学生 (Học sinh)', '大学 (Đại học)', '学校 (Trường học)'] },
  { kanji: '水', hanViet: 'THỦY', words: ['水曜日 (Thứ 4)', '水道 (Đường ống nước)', '水泳 (Bơi lội)'] },
  { kanji: '火', hanViet: 'HỎA', words: ['火曜日 (Thứ 3)', '火山 (Núi lửa)', '花火 (Pháo hoa)'] },
  { kanji: '山', hanViet: 'SƠN', words: ['富士山 (Núi Phú Sĩ)', '山田 (Tên Yamada)', '登山 (Leo núi)'] },
  { kanji: '川', hanViet: 'XUYÊN', words: ['川口 (Tên Kawaguchi)', '小川 (Dòng suối)'] },
  { kanji: '万', hanViet: 'VẠN', words: ['万年筆 (Bút máy)', '万歳 (Muôn năm)', '万一 (Vạn nhất)'] },
  { kanji: '七', hanViet: 'THẤT', words: ['七夕 (Lễ Thất Tịch)', '七つ (Bảy cái)', '七日 (Ngày mùng 7)'] },
  { kanji: '十', hanViet: 'THẬP', words: ['十分 (10 phút)', '二十歳 (20 tuổi)', '十人 (Mười người)'] },
  { kanji: '二', hanViet: 'NHỊ', words: ['二人 (Hai người)', '二月 (Tháng 2)', '二日 (Ngày mùng 2)'] },
  { kanji: '本', hanViet: 'BẢN', words: ['日本 (Nhật Bản)', '本屋 (Hiệu sách)', '一本 (Một cái)'] },
  { kanji: '中', hanViet: 'TRUNG', words: ['中国 (Trung Quốc)', '中学校 (Cấp 2)', '真ん中 (Ở giữa)'] },
  { kanji: '上', hanViet: 'THƯỢNG', words: ['上手 (Giỏi)', '上着 (Áo khoác)', '以上 (Trở lên)'] },
  { kanji: '長', hanViet: 'TRƯỜNG', words: ['社長 (Giám đốc)', '長い (Dài)', '校長 (Hiệu trưởng)'] },
  { kanji: '出', hanViet: 'XUẤT', words: ['出口 (Cửa ra)', '出す (Lấy ra)', '出席 (Tham dự)'] },
  { kanji: '三', hanViet: 'TAM', words: ['三月 (Tháng 3)', '三つ (Ba cái)', '三日月 (Trăng lưỡi liềm)'] },
  { kanji: '週', hanViet: 'CHU', words: ['週末 (Cuối tuần)', '今週 (Tuần này)', '再来週 (Tuần sau nữa)'] },
  
  // --- N4 ---
  { kanji: '会', hanViet: 'HỘI', words: ['会社 (Công ty)', '会議 (Cuộc họp)', '会話 (Hội thoại)'] },
  { kanji: '同', hanViet: 'ĐỒNG', words: ['同じ (Giống nhau)', '共同 (Cộng đồng)', '同時 (Đồng thời)'] },
  { kanji: '事', hanViet: 'SỰ', words: ['仕事 (Công việc)', '火事 (Hỏa hoạn)', '食事 (Bữa ăn)'] },
  { kanji: '自', hanViet: 'TỰ', words: ['自分 (Bản thân)', '自転車 (Xe đạp)', '自由 (Tự do)'] },
  { kanji: '社', hanViet: 'XÃ', words: ['会社 (Công ty)', '社会 (Xã hội)', '社長 (Giám đốc)'] },
  { kanji: '発', hanViet: 'PHÁT', words: ['出発 (Xuất phát)', '発音 (Phát âm)', '発見 (Phát hiện)'] },
  { kanji: '者', hanViet: 'GIẢ', words: ['医者 (Bác sĩ)', '歯医者 (Nha sĩ)', '学者 (Học giả)'] },
  { kanji: '地', hanViet: 'ĐỊA', words: ['地図 (Bản đồ)', '地下鉄 (Tàu điện ngầm)', '地震 (Động đất)'] },
  { kanji: '業', hanViet: 'NGHIỆP', words: ['授業 (Giờ học)', '工業 (Công nghiệp)', '産業 (Sản xuất)'] },
  { kanji: '方', hanViet: 'PHƯƠNG', words: ['方法 (Phương pháp)', '夕方 (Chiều tối)', '仕方 (Cách làm)'] },
  { kanji: '新', hanViet: 'TÂN', words: ['新聞 (Báo)', '新しい (Mới)', '新幹線 (Tàu cao tốc)'] },
  { kanji: '場', hanViet: 'TRƯỜNG', words: ['会場 (Hội trường)', '工場 (Nhà máy)', '場所 (Địa điểm)'] },
  { kanji: '員', hanViet: 'VIÊN', words: ['店員 (Nhân viên)', '公務員 (Công chức)', '委員 (Ủy viên)'] },
  { kanji: '立', hanViet: 'LẬP', words: ['立つ (Đứng)', '立てる (Dựng lên)', '役に立つ (Có ích)'] },
  { kanji: '開', hanViet: 'KHAI', words: ['開く (Mở)', '開ける (Mở ra)', '開始 (Bắt đầu)'] },
  { kanji: '手', hanViet: 'THỦ', words: ['手 (Tay)', '切手 (Tem)', '上手 (Giỏi)'] },
  { kanji: '力', hanViet: 'LỰC', words: ['力 (Sức mạnh)', '協力 (Hợp tác)', '強力 (Mạnh mẽ)'] },
  { kanji: '問', hanViet: 'VẤN', words: ['質問 (Câu hỏi)', '問題 (Vấn đề)', '学問 (Học vấn)'] },
  { kanji: '代', hanViet: 'ĐẠI', words: ['時代 (Thời đại)', '代わり (Thay thế)', '代表 (Đại diện)'] },
  { kanji: '明', hanViet: 'MINH', words: ['明日 (Ngày mai)', '明るい (Sáng sủa)', '説明 (Giải thích)'] },
  
  // --- N3 ---
  { kanji: '政', hanViet: 'CHÍNH', words: ['政治 (Chính trị)', '政府 (Chính phủ)', '政策 (Chính sách)'] },
  { kanji: '議', hanViet: 'NGHỊ', words: ['会議 (Cuộc họp)', '議員 (Nghị viên)', '議論 (Tranh luận)'] },
  { kanji: '民', hanViet: 'DÂN', words: ['市民 (Công dân)', '国民 (Quốc dân)', '住民 (Cư dân)'] },
  { kanji: '連', hanViet: 'LIÊN', words: ['連絡 (Liên lạc)', '関連 (Liên quan)', '連続 (Liên tục)'] },
  { kanji: '対', hanViet: 'ĐỐI', words: ['反対 (Phản đối)', '対象 (Đối tượng)', '対策 (Đối sách)'] },
  { kanji: '部', hanViet: 'BỘ', words: ['全部 (Tất cả)', '部屋 (Căn phòng)', '部分 (Bộ phận)'] },
  { kanji: '合', hanViet: 'HỢP', words: ['合う (Hợp)', '具合 (Tình trạng)', '試合 (Trận đấu)'] },
  { kanji: '市', hanViet: 'THỊ', words: ['市民 (Công dân)', '市場 (Chợ)', '都市 (Đô thị)'] },
  { kanji: '内', hanViet: 'NỘI', words: ['案内 (Hướng dẫn)', '以内 (Trong vòng)', '内容 (Nội dung)'] },
  { kanji: '相', hanViet: 'TƯƠNG', words: ['相談 (Tư vấn)', '相手 (Đối phương)', '首相 (Thủ tướng)'] },
  { kanji: '定', hanViet: 'ĐỊNH', words: ['予定 (Dự định)', '安定 (Ổn định)', '決定 (Quyết định)'] },
  { kanji: '回', hanViet: 'HỒI', words: ['回る (Xoay)', '今回 (Lần này)', '回復 (Hồi phục)'] },
  { kanji: '選', hanViet: 'TUYỂN', words: ['選ぶ (Chọn)', '選手 (Tuyển thủ)', '選択 (Lựa chọn)'] },
  { kanji: '米', hanViet: 'MỄ', words: ['米 (Gạo)', '欧米 (Âu Mỹ)', '南米 (Nam Mỹ)'] },
  { kanji: '実', hanViet: 'THỰC', words: ['実 (Thực)', '確実 (Chắc chắn)', '現実 (Hiện thực)'] },
];

async function main() {
  console.log('--- BẮT ĐẦU CẬP NHẬT KANJI ---');

  let count = 0;
  for (const item of dataToUpdate) {
    try {
      await prisma.systemKanji.update({
        where: { kanji: item.kanji },
        data: {
          hanViet: item.hanViet,
          compounds: item.words.map(w => ({
            word: w.split(' (')[0],
            meaning: w.split(' (')[1]?.replace(')', '') || ''
          })),
        },
      });
      count++;
    } catch (error) {
      console.log(`Không tìm thấy chữ ${item.kanji} trong DB, bỏ qua.`);
    }
  }

  console.log(`--- HOÀN TẤT! Đã cập nhật ${count} chữ Kanji. ---`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());