import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware to parse JSON payloads with larger limits for high-resolution images
app.use(express.json({ limit: "20mb" }));

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;

// Fail-safe init for GoogleGenAI
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
  }
} else {
  console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to educator emulation mode.");
}

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "https://yldzstygskozpcohuekg.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase Client initialized successfully with URL:", supabaseUrl);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
  }
} else {
  console.warn("Supabase URL or keys are not defined in process.env. Falling back to local replication state.");
}

// In-Memory Backup state if Supabase queries encounter missing relations (42P01)
let backupState = {
  points: 1250,
  overallGameScores: {
    "Toán": 85, "Tiếng Việt": 92, "Khoa Học": 74, "Lịch Sử & Địa Lý": 80, "Tiếng Anh": 65
  },
  scoreLogs: [
    { id: "1", game: "Đấu Trí Toán Học", points: 100, accuracy: 100, date: "10/06" },
    { id: "2", game: "Ghép Từ Tiếng Việt", points: 60, accuracy: 80, date: "09/06" },
    { id: "3", game: "Khám Phá Sấm Sét", points: 80, accuracy: 100, date: "08/06" },
  ],
  handwritingHistory: [] as any[]
};

// REST APIs
app.get("/api/health", async (req, res) => {
  if (!supabase) {
    return res.json({ 
      status: "ok", 
      geminiConfigured: !!apiKey,
      supabaseConfigured: false,
      tablesReady: false
    });
  }
  
  try {
    const { error } = await supabase.from("kidstudy_student_state").select("key").limit(1);
    const tablesReady = !error || error.code !== "42P01";
    res.json({
      status: "ok",
      geminiConfigured: !!apiKey,
      supabaseConfigured: true,
      tablesReady: tablesReady
    });
  } catch (e) {
    res.json({
      status: "ok",
      geminiConfigured: !!apiKey,
      supabaseConfigured: true,
      tablesReady: false
    });
  }
});

// GET Student Full State
app.get("/api/student-state", async (req, res) => {
  if (!supabase) {
    return res.json({
      dbConfigured: false,
      tablesReady: false,
      points: backupState.points,
      overallGameScores: backupState.overallGameScores,
      scoreLogs: backupState.scoreLogs,
      handwritingHistory: backupState.handwritingHistory
    });
  }

  try {
    // 1. Fetch persistent points & overallGameScores
    const { data: settingsData, error: settingsError } = await supabase
      .from("kidstudy_student_state")
      .select("*");

    const { data: logsData, error: logsError } = await supabase
      .from("kidstudy_score_logs")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: hwData, error: hwError } = await supabase
      .from("kidstudy_handwriting")
      .select("*")
      .order("created_at", { ascending: false });

    const isMissingTables = 
      (settingsError && settingsError.code === "42P01") ||
      (logsError && logsError.code === "42P01") ||
      (hwError && hwError.code === "42P01");

    if (isMissingTables) {
      console.warn("Supabase tables not fully provisioned in the remote database.");
      return res.json({
        dbConfigured: true,
        tablesReady: false,
        points: 0,
        overallGameScores: {},
        scoreLogs: [],
        handwritingHistory: [],
        error: "Bảng dữ liệu chưa tồn tại trên Supabase. Vui lòng khởi tạo bằng cách chạy câu lệnh SQL Query."
      });
    }

    // Strict Mode: Only display data that exists in the database
    // Default values if settings table exists but has no records yet
    let points = 0;
    let overallGameScores: Record<string, number> = {
      "Toán": 0, "Tiếng Việt": 0, "Khoa Học": 0, "Lịch Sử & Địa Lý": 0, "Tiếng Anh": 0
    };

    if (settingsData && settingsData.length > 0) {
      const pointsRow = settingsData.find((r: any) => r.key === "points");
      const scoresRow = settingsData.find((r: any) => r.key === "overallGameScores");
      if (pointsRow) points = Number(pointsRow.value);
      if (scoresRow) overallGameScores = scoresRow.value;
    }

    let scoreLogs = [];
    if (logsData) {
      scoreLogs = logsData.map((l: any) => ({
        id: l.id,
        game: l.game,
        points: l.points,
        accuracy: l.accuracy,
        date: l.date
      }));
    }

    let handwritingHistory = [];
    if (hwData) {
      handwritingHistory = hwData;
    }

    res.json({
      dbConfigured: true,
      tablesReady: true,
      points,
      overallGameScores,
      scoreLogs,
      handwritingHistory
    });

  } catch (err: any) {
    console.error("Critical error reading from Supabase:", err);
    res.json({
      dbConfigured: true,
      tablesReady: false,
      points: 0,
      overallGameScores: {},
      scoreLogs: [],
      handwritingHistory: [],
      error: err?.message || "Lỗi truy xuất cơ sở dữ liệu."
    });
  }
});

// POST update points
app.post("/api/student-state/points", async (req, res) => {
  const { points } = req.body;
  backupState.points = points;

  if (!supabase) {
    return res.json({ success: true, points });
  }

  try {
    const { error } = await supabase
      .from("kidstudy_student_state")
      .upsert({ key: "points", value: points }, { onConflict: "key" });

    if (error) {
      console.error("Supabase upsert points error:", error);
      return res.json({ success: false, error: error.message });
    }
    res.json({ success: true, points });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// POST update overall subject scores
app.post("/api/student-state/overall-scores", async (req, res) => {
  const { overallGameScores } = req.body;
  backupState.overallGameScores = overallGameScores;

  if (!supabase) {
    return res.json({ success: true, overallGameScores });
  }

  try {
    const { error } = await supabase
      .from("kidstudy_student_state")
      .upsert({ key: "overallGameScores", value: overallGameScores }, { onConflict: "key" });

    if (error) {
      console.error("Supabase upsert overall-scores error:", error);
      return res.json({ success: false, error: error.message });
    }
    res.json({ success: true, overallGameScores });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// POST add score log
app.post("/api/score-logs", async (req, res) => {
  const { id, game, points, accuracy, date } = req.body;
  const newLog = { id, game, points, accuracy, date };
  backupState.scoreLogs = [newLog, ...backupState.scoreLogs];

  if (!supabase) {
    return res.json({ success: true, log: newLog });
  }

  try {
    const { error } = await supabase
      .from("kidstudy_score_logs")
      .insert({
        id,
        game,
        points,
        accuracy,
        date
      });

    if (error) {
      console.error("Supabase insert score log error:", error);
      return res.json({ success: false, error: error.message });
    }
    res.json({ success: true, log: newLog });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// POST add handwriting analysis
app.post("/api/handwriting", async (req, res) => {
  const { id, score, legibility_comment, structure_comment, errors, encouragement, image_url } = req.body;
  const newHw = {
    id: id || Math.random().toString(),
    score,
    legibility_comment,
    structure_comment,
    errors,
    encouragement,
    image_url,
    created_at: new Date().toISOString()
  };
  backupState.handwritingHistory = [newHw, ...backupState.handwritingHistory];

  if (!supabase) {
    return res.json({ success: true, hw: newHw });
  }

  try {
    const { error } = await supabase
      .from("kidstudy_handwriting")
      .insert({
        id: newHw.id,
        score,
        legibility_comment,
        structure_comment,
        errors,
        encouragement,
        image_url
      });

    if (error) {
      console.error("Supabase insert handwriting error:", error);
      return res.json({ success: false, error: error.message });
    }
    res.json({ success: true, hw: newHw });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// API endpoint to analyze handwriting with Gemini AI
app.post("/api/analyze-handwriting", async (req, res) => {
  const { base64, mimeType, isPreloaded, sampleId } = req.body;

  try {
    // 1. Handle preloaded samples to avoid unnecessary API consumption and ensure instant response
    if (isPreloaded || base64 === "MOCK_SAMPLE_1" || base64 === "MOCK_SAMPLE_2") {
      const isSample2 = sampleId === 2 || base64 === "MOCK_SAMPLE_2";
      if (isSample2) {
        return res.json({
          score: 6.0,
          legibility_comment: "Chữ viết của con còn khá nguệch ngoạc, chưa nằm ngay ngắn trên đường kẻ ô ly. Một số nét khuyết dưới của chữ 'g', 'y' viết hơi ngắn và chưa đều nhau.",
          structure_comment: "Cấu trúc đoạn văn tả con vật tương đối đầy đủ ý. Tuy nhiên, con gặp lỗi lặp từ nhiều lần (từ 'con chó' lặp 4 lần trong 3 câu) và viết câu quá dài thiếu dấu ngắt câu hoặc dấu chấm.",
          errors: [
            "Sai chính tả: viết 'vui vẽ' (Đúng chính tả phải là 'vui vẻ').",
            "Sai chính tả: viết 'trông nhà' thành 'chông nhà'.",
            "Chữ 't' viết thiếu nét gạch ngang nhỏ phía trên.",
            "Thiếu dấu chấm kết thúc đoạn văn miêu tả."
          ],
          encouragement: "Nét chữ là nết người, chỉ cần con chăm chỉ rèn luyện viết chậm lại một chút và chú ý quy tắc sử dụng thanh sắc chính tả, cô tin chắc bài viết sau con sẽ giành được điểm 9, 10 dễ dàng! Cố lên con yêu nhé!"
        });
      } else {
        return res.json({
          score: 9.5,
          legibility_comment: "Nét chữ của con cực kỳ xuất sắc! Chữ viết tròn trịa, nắn nót, đúng độ cao ô ly chuẩn tiểu học và nghiêng đều tăm tắp rất nghệ thuật. Trình bày bài sạch đẹp không tì vết.",
          structure_comment: "Bài văn tả mẹ đong đầy cảm xúc, biết lựa chọn những chi tiết nổi bật như mái tóc, nụ cười hiền hậu để miêu tả. Cách dùng từ gợi tả sáng tạo, bố cục bài mạch lạc 3 phần rõ ràng.",
          errors: [
            "Khoảng cách giữa chữ 'Mẹ' và chữ 'thương' hơi bị sát nhau một chút.",
            "Cần chú ý viết hoa đồng đều tất cả các chữ cái đầu câu."
          ],
          encouragement: "Bài viết của con làm cô vô cùng xúc động! Con viết chữ rất đẹp và có năng khiếu văn chương tốt. Hãy giữ vững nét viết tuyệt đẹp này và tiếp tục phát huy tinh thần hiếu học này nhé!"
        });
      }
    }

    // 2. Real processing via Gemini 3.5 Flash
    if (!ai) {
      // Fallback response if API Key is not set or initialized
      return res.json({
        score: 8.0,
        legibility_comment: "Chữ viết của em tương đối dễ nhìn, thẳng hàng và ngay ngắn. Tuy nhiên, một số nét khuyết trên và dưới chưa căng đều và đúng độ cao ô ly. (Chế độ mô phỏng sư phạm vì chưa cấu hình khóa API)",
        structure_comment: "Ý tưởng đoạn văn tốt, sử dụng nhiều từ láy và từ gợi tả phong phú. Hãy bồi đắp thêm chiều sâu biểu đạt và ngắt câu hợp lý hơn.",
        errors: [
          "Cần nắn nót hơn ở các chữ cái có nét khuyết như 'h', 'g', 'k'.",
          "Chú ý dấu hỏi và dấu ngã ở một số chữ đơn giản."
        ],
        encouragement: "Em đang làm rất tốt đấy! Chỉ cần nắn nót viết chậm lại một chút là nét chữ sẽ cực kỳ tuyệt vời và hoàn hảo luôn. Cố lên em nhé!"
      });
    }

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: "Missing image base64 data or mimeType" });
    }

    const systemPrompt = `Bạn là cô Hà - một giáo viên tiểu học vô cùng dịu dàng, nồng ấm, hành văn ấm áp và có chuyên môn cao tại Việt Nam.
Hãy phân tích hình ảnh chữ viết tay (bài tập làm văn, chính tả, tập viết) của học sinh tiểu học.
Hãy chấm điểm bài viết từ thang điểm 1 đến 10 và trả về kết quả định dạng JSON bằng tiếng Việt với cấu trúc chuẩn xác như sau:
{
  "score": số điểm bài viết (ví dụ: 8.5),
  "legibility_comment": "Nhận xét chi tiết về nét chữ viết tay (độ ngay ngắn, đúng ô ly chuẩn học sinh cấp 1, thẳng hàng, chữ nghiêng/đứng)",
  "structure_comment": "Nhận xét về bố cục bài văn/đoạn văn, cách dùng từ ngữ, ngữ pháp tiếng Việt, ý nghĩa văn học diễn đạt của con",
  "errors": ["Danh sách lỗi sai 1", "Danh sách lỗi sai 2"],
  "encouragement": "Lời nhắn gửi động viên học sinh cực kỳ ấm áp, ngọt ngào để kích thích con chăm chỉ học tập"
}`;

    const userPrompt = "Hãy đọc và chấm điểm bài viết tay học sinh tiểu học Việt Nam này nhé cô Hà.";

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64
      }
    };

    const textPart = {
      text: userPrompt
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            legibility_comment: { type: Type.STRING },
            structure_comment: { type: Type.STRING },
            errors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            encouragement: { type: Type.STRING }
          },
          required: ["score", "legibility_comment", "structure_comment", "errors", "encouragement"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No response received from Gemini");
    }

    const parsedData = JSON.parse(outputText.trim());
    res.json(parsedData);

  } catch (error: any) {
    console.error("Error evaluating handwriting:", error);
    res.status(500).json({
      error: "Không thể nhận diện bài viết do lỗi phân kết nối.",
      details: error?.message || error
    });
  }
});

// Vite Middleware & Static Files integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
