import { SyllabusItem, KhoaHocQuestion, LichSuQuestion, TienganhQuestion } from "./types";

export const syllabusData: Record<number, Record<string, SyllabusItem[]>> = {
  1: {
    'Toán': [
      { title: "Bài 1: Làm quen với các số từ 1 đến 10", desc: "Giúp học sinh nhận dạng chữ số, viết các số và đếm số lượng vật thể chuẩn xác." },
      { title: "Bài 2: Phép cộng trong phạm vi 10", desc: "Phép cộng đơn giản bằng hình ảnh trực quan sinh động." },
      { title: "Bài 3: Phép trừ trong phạm vi 10", desc: "Các bài tập trừ cơ bản kèm hình ảnh trực quan ngộ nghĩnh." },
      { title: "Bài 4: Nhận biết Hình tròn, Hình tam giác, Hình vuông", desc: "Hình học trực quan ban đầu, phân loại hình dạng trong cuộc sống hằng ngày." }
    ],
    'Tiếng Việt': [
      { title: "Bài 1: Bảng chữ cái tiếng Việt", desc: "Phát âm chuẩn xác các nguyên âm và phụ âm cơ bản A, Ă, Â, B, C, D..." },
      { title: "Bài 2: Học vần cơ bản và ghép âm đơn", desc: "Cách ghép các từ đơn giản gần gũi: ba, ca, mẹ, bé, cá, gà..." }
    ],
    'Khoa Học': [
      { title: "Chủ đề: Cơ thể của em", desc: "Nhận biết các năm giác quan: mắt, tai, mũi, lưỡi, da và cách bảo vệ." },
      { title: "Chủ đề: Thế giới động vật quanh em", desc: "Tìm hiểu đặc điểm, môi trường sống và tiếng kêu của các loài vật nuôi quen thuộc." }
    ],
    'Lịch Sử & Địa Lý': [
      { title: "Địa lý: Ngôi trường đáng yêu của em", desc: "Làm quen với không gian trường học, lớp học và sơ đồ đơn giản." }
    ],
    'Tiếng Anh': [
      { title: "Unit 1: Hello & Goodbye", desc: "Học cách chào hỏi cơ bản: Hello, Hi, Goodbye, Bye-bye." },
      { title: "Unit 2: Colors of the rainbow", desc: "Nhận biết các màu sắc cơ bản: Red, Blue, Green, Yellow, Orange." }
    ]
  },
  2: {
    'Toán': [
      { title: "Bài 1: Phép cộng, phép trừ có nhớ trong phạm vi 100", desc: "Thực hành đặt tính rồi tính, tính nhẩm nhanh phép cộng trừ hai chữ số." },
      { title: "Bài 2: Làm quen với bảng nhân 2 và nhân 5", desc: "Học thuộc lòng bảng nhân hai, bảng nhân năm và áp dụng vào toán đố." }
    ],
    'Tiếng Việt': [
      { title: "Bài 1: Từ chỉ hoạt động và từ chỉ trạng thái", desc: "Nhận biết hoạt động (chạy, nhảy, múa) và trạng thái (buồn, vui, lo lắng)." }
    ],
    'Khoa Học': [
      { title: "Bài 1: Thực vật và động vật sống ở đâu?", desc: "Khám phá môi trường rừng rậm, đại dương, sa mạc của các loài sinh vật." }
    ],
    'Lịch Sử & Địa Lý': [
      { title: "Chủ đề: Gia đình và dòng họ của em", desc: "Hiểu biết về cây gia phả, tổ tiên và truyền thống tốt đẹp của gia đình." }
    ],
    'Tiếng Anh': [
      { title: "Unit 1: Happy family members", desc: "Từ vựng về gia đình thân thương: Father, Mother, Brother, Sister, Baby." }
    ]
  },
  3: {
    'Toán': [
      { title: "Bài 1: Phép nhân và phép chia trong phạm vi 1000", desc: "Thực hành nhân chia số có hai, ba chữ số với số có một chữ số." },
      { title: "Bài 2: Làm quen với biểu thức và tính giá trị biểu thức", desc: "Nắm vững quy tắc ưu tiên: nhân chia trước, cộng trừ sau, trong ngoặc trước." },
      { title: "Bài 3: Đơn vị đo diện tích Xăng-ti-mét vuông (cm²)", desc: "Làm quen khái niệm diện tích ban đầu, ký hiệu cm² và thực hành đo dạc." }
    ],
    'Tiếng Việt': [
      { title: "Bài 1: Từ chỉ đặc điểm và câu kể Ai thế nào?", desc: "Nhận biết các tính từ miêu tả màu sắc, hình dáng, tính cách của người và vật." },
      { title: "Bài 2: Nghệ thuật so sánh tu từ trong câu văn", desc: "Hiếu tác dụng của biện pháp so sánh: Trẻ em như búp măng non, trăng tròn như quả bóng." }
    ],
    'Khoa Học': [
      { title: "Bài 1: Các thành phần của Không khí xung quanh ta", desc: "Vai trò của chất khí ô-xy, nitơ đối với sự sống bách thảo." },
      { title: "Bài 2: Vòng tuần hoàn của Nước trong tự nhiên", desc: "Mô tả vòng khép kín từ bốc hơi nước, ngưng tụ mây tạo thành mưa mát lành." }
    ],
    'Lịch Sử & Địa Lý': [
      { title: "Lịch sử: Đền Hùng vĩ đại và ngày Giỗ Tổ Hùng Vương", desc: "Lịch sử dựng nước đầu tiên của các vua Hùng và nghi lễ dâng hương mùng 10 tháng 3." },
      { title: "Địa lý: Bản đồ Việt Nam mến thương", desc: "Xác định các vùng lãnh thổ biên giới tự nhiên, vùng đất liền và đảo biển nước nhà." }
    ],
    'Tiếng Anh': [
      { title: "Unit 1: School Subjects vocabulary", desc: "Cách phát âm, viết các môn học: Math, Science, Vietnamese, English, History." },
      { title: "Unit 2: What can you do? (Abilities)", desc: "Cấu trúc diễn đạt khả năng: I can swim, I can't fly, Can you draw?" }
    ]
  },
  4: {
    'Toán': [
      { title: "Bài 1: Khái niệm Phân số và phân số bằng nhau", desc: "Làm quen với phân số gồm tử số, mẫu số và ứng dụng quy đồng mẫu số phân số." },
      { title: "Bài 2: Tính diện tích Hình bình hành và hình thoi", desc: "Tìm hiểu đặc tính hình bình hành và công thức tính diện tích đặc trưng." }
    ],
    'Tiếng Việt': [
      { title: "Bài 1: Trạng ngữ trong câu", desc: "Phân biệt trạng ngữ chỉ thời gian, nơi chốn, nguyên nhân và tác dụng mở rộng câu." }
    ],
    'Khoa Học': [
      { title: "Bài 1: Chuỗi thức ăn tuần hoàn trong tự nhiên", desc: "Hiểu sâu sắc sinh vật sản xuất, sinh vật tiêu thụ (cỏ, thỏ, cáo) và vi khuẩn phân hủy." }
    ],
    'Lịch Sử & Địa Lý': [
      { title: "Lịch sử: Chiến thắng Bạch Đằng vẻ vang", desc: "Nghệ thuật quân sự cắm cọc gỗ nhọn đầu của Ngô Quyền tiêu diệt quân Nam Hán." }
    ],
    'Tiếng Anh': [
      { title: "Unit 1: Places in my lovely town", desc: "Từ vựng về thị phố: Supermarket, Hospital, School, Cinema, Bookstore." }
    ]
  },
  5: {
    'Toán': [
      { title: "Bài 1: Số thập phân và các phép toán thập phân", desc: "Nắm vững cộng, trừ, nhân, chia số thập phân nhiều chữ số chuẩn xác." },
      { title: "Bài 2: Hình tròn và diện tích Hình Tròn", desc: "Ứng dụng hằng số Số Pi 3.14 vào thiết lập chu vi và diện tích vòng tròn." }
    ],
    'Tiếng Việt': [
      { title: "Bài 1: Đại từ xưng hô trong Tiếng Việt", desc: "Phân tích cách sử dụng các ngôi xưng khi giao tiếp biểu đạt tình cảm tao nhã." }
    ],
    'Khoa Học': [
      { title: "Bài 1: Sự sinh sản của các loài thực vật có hoa", desc: "Tìm hiểu quá trình thụ phấn, nhụy hoa, nhị hoa nhờ gió hoặc côn trùng." }
    ],
    'Lịch Sử & Địa Lý': [
      { title: "Lịch sử: Chiến dịch Điện Biên Phủ lịch sử", desc: "Mốc sử chói lọi năm 1954 đánh bại thực dân Pháp giành tự do độc lập." }
    ],
    'Tiếng Anh': [
      { title: "Unit 1: Master the Past Simple tense", desc: "Thực hành cấu trúc thì quá khứ đơn, động từ quy tắc và bất quy tắc." }
    ]
  }
};

export const tiengVietDb = [
  { full: "Em đi học đúng giờ", words: ["Em", "đi", "học", "đúng", "giờ"] },
  { full: "Trường học là ngôi nhà thứ hai", words: ["Trường", "học", "là", "ngôi", "nhà", "thứ", "hai"] },
  { full: "Bác Hồ kính yêu vô cùng", words: ["Bác", "Hồ", "kính", "yêu", "vô", "cùng"] },
  { full: "Non sông Việt Nam tươi đẹp", words: ["Non", "sông", "Việt", "Nam", "tươi", "đẹp"] },
  { full: "Học tập tốt lao động tốt", words: ["Học", "tập", "tốt", "lao", "động", "tốt"] }
];

export const khoaHocQuestions: KhoaHocQuestion[] = [
  {
    q: "Loài thực vật nào dưới đây thường sống ở vùng sa mạc khô hạn chứa nhiều cát?",
    c: ["Cây lúa nước", "Cây xương rồng", "Cây cỏ sen", "Cây bách thông"],
    a: 1
  },
  {
    q: "Trái Đất xinh đẹp mất bao lâu để hoàn thành một vòng quay quanh Mặt Trời ấm áp?",
    c: ["24 giờ", "1 tháng", "365 ngày (1 năm)", "12 giờ"],
    a: 2
  },
  {
    q: "Nước nguyên chất bắt đầu sôi và bốc hơi mạnh ở nhiệt độ bao nhiêu?",
    c: ["50 độ C", "100 độ C", "0 độ C", "200 độ C"],
    a: 1
  },
  {
    q: "Chất khí nào dồi dào dạt nhất trong bầu không khí tự nhiên bao quanh Trái Đất?",
    c: ["Khí Oxy", "Khí Nitrogen (Nitơ)", "Khí Carbon dioxide", "Khí Hydrogen"],
    a: 1
  },
  {
    q: "Em bé cần bảo vệ hàm răng của mình như thế nào?",
    c: ["Ăn thật nhiều kẹo dẻo đêm muộn", "Đánh răng ít nhất 2 lần mỗi ngày buổi sáng và tối", "Không bao giờ đi nha sĩ khám răng", "Uống nhiều nước đá lạnh"],
    a: 1
  }
];

export const lichSuQuestions: LichSuQuestion[] = [
  {
    q: "Ai là vị vua tôn quý khai sinh ra triều đại nhà Lý và dời kinh đô về Thăng Long xưa?",
    c: ["Lý Thái Tổ (Lý Công Uẩn)", "Lý Nhân Tông", "Đinh Bộ Lĩnh", "Ngô Quyền dũng mãnh"],
    a: 0
  },
  {
    q: "Vùng đất hình chữ S Việt Nam có đặc điểm địa hình gì nổi bật nhất?",
    c: ["Ba phần tư diện tích là đồi núi trập trùng", "Không tiếp giáp biển lớn nào", "Chỉ toàn là các hoang mạc khô cằn", "Tất cả vùng bờ biển đều là cát vàng"],
    a: 0
  },
  {
    q: "Danh tướng nào đã phát động cắm cọc nhọn dũng mãnh trên sông Bạch Đằng tiêu diệt giặc ngoại xâm?",
    c: ["Trịnh Đình Hà", "Lý Thường Kiệt", "Ngô Quyền", "Hai Bà Trưng"],
    a: 2
  },
  {
    q: "Hà Nội - Cao nguyên sông Hồng hay thuộc miền nào của Việt Nam ta?",
    c: ["Miền Nam ấm áp", "Miền Trung nắng gió", "Miền Bắc mến yêu", "Vùng cực Tây đất nước"],
    a: 2
  },
  {
    q: "Chủ tịch Hồ Chí Minh đã đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam dân chủ cộng hòa vào ngày nào?",
    c: ["Ngày 30 tháng 4 năm 1975", "Ngày 2 tháng 9 năm 1945", "Ngày 19 tháng 8 năm 1945", "Ngày 10 tháng 10 năm 1954"],
    a: 1
  }
];

export const englishQuestions: TienganhQuestion[] = [
  { word: "APPLE", hint: "Quả táo màu đỏ ngọt ngào", emoji: "🍎", pool: ["P", "A", "P", "E", "L", "T", "O", "B"] },
  { word: "CAT", hint: "Chú mèo kêu gâu gâu đùa nghịch", emoji: "🐱", pool: ["C", "A", "T", "M", "E", "O", "Z", "W"] },
  { word: "SUN", hint: "Ông mặt trời tỏa nắng rực rỡ buổi minh", emoji: "☀️", pool: ["S", "U", "N", "H", "A", "G", "X", "Y"] },
  { word: "DOG", hint: "Chú chó trung thành thông thái canh gác ngôi nhà", emoji: "🐶", pool: ["D", "O", "G", "S", "L", "K", "A", "B"] },
  { word: "FISH", hint: "Bạn cá bơi lội nhảy sóng dưới đại dương xanh", emoji: "🐟", pool: ["F", "I", "S", "H", "Y", "U", "R", "N"] },
  { word: "BOOK", hint: "Quyển sách chứa ngàn tri thức mới", emoji: "📖", pool: ["B", "O", "O", "K", "T", "S", "W", "M"] }
];

export const defaultLeaderboardData = [
  { rank: 1, name: "Bảo Nam", block: 3, favorite: "Toán", points: 1680, avatarSeed: "BaoNam" },
  { rank: 2, name: "Hồng Anh", block: 3, favorite: "Tiếng Việt", points: 1420, avatarSeed: "HongAnh" },
  { rank: 3, name: "Đức Kiên", block: 3, favorite: "Khoa Học", points: 1350, avatarSeed: "DucKien" },
  { rank: 4, name: "Khánh Huyền", block: 3, favorite: "Tiếng Anh", points: 1290, avatarSeed: "KhanhHuyen" },
  { rank: 5, name: "Học Sinh (Bạn)", block: 1, favorite: "Toán", points: 1250, isCurrent: true, avatarSeed: "MinhQuan" },
  { rank: 6, name: "Tùng Dương", block: 3, favorite: "Lịch Sử", points: 1100, avatarSeed: "TungDuong" },
  { rank: 7, name: "Thu Trang", block: 3, favorite: "Tiếng Việt", points: 980, avatarSeed: "ThuTrang" }
];
