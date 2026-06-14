import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { 
  syllabusData, 
  tiengVietDb, 
  khoaHocQuestions, 
  lichSuQuestions, 
  englishQuestions, 
  defaultLeaderboardData 
} from "./data";
import { ScoreLog } from "./types";

// Sound assistant utilizing standard Web Audio API
let audioCtx: AudioContext | null = null;
function playSound(type: 'click' | 'correct' | 'wrong' | 'victory', soundEnabled: boolean) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'victory') {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50];
      notes.forEach((freq, idx) => {
        if (!audioCtx) return;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(freq, audioCtx.currentTime + (idx * 0.07));
        g.gain.setValueAtTime(0.08, audioCtx.currentTime + (idx * 0.07));
        g.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + (idx * 0.07) + 0.25);
        o.start(audioCtx.currentTime + (idx * 0.07));
        o.stop(audioCtx.currentTime + (idx * 0.07) + 0.25);
      });
    }
  } catch (err) {
    console.log("Audio Error:", err);
  }
}

export default function App() {
  // Navigation & Role states
  const [activePage, setActivePage] = useState<string>("home");
  const [currentBlock, setCurrentBlock] = useState<number>(3);
  const [currentSubject, setCurrentSubject] = useState<string>("Toán");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [role, setRole] = useState<string>("admin"); // "admin" | "student"
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [points, setPoints] = useState<number>(1250);
  const [handwritingHistory, setHandwritingHistory] = useState<any[]>([]);
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);
  const [dbTablesReady, setDbTablesReady] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string>("");
  const [showSqlInstructions, setShowSqlInstructions] = useState<boolean>(false);

  // Synchronise points to Supabase
  const syncPoints = async (newPoints: number) => {
    try {
      await fetch("/api/student-state/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: newPoints })
      });
    } catch (err) {
      console.error("Error syncing points to Supabase:", err);
    }
  };

  // Synchronise overall game scores
  const syncOverallScores = async (scores: Record<string, number>) => {
    try {
      await fetch("/api/student-state/overall-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overallGameScores: scores })
      });
    } catch (err) {
      console.error("Error syncing overall scores to Supabase:", err);
    }
  };

  // Push score log
  const syncScoreLog = async (log: ScoreLog) => {
    try {
      await fetch("/api/score-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
    } catch (err) {
      console.error("Error syncing score log to Supabase:", err);
    }
  };

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const res = await fetch("/api/student-state");
        if (res.ok) {
          const data = await res.json();
          if (data.dbConfigured) {
            setDbConfigured(true);
            setDbTablesReady(data.tablesReady);
            if (data.error) {
              setSupabaseError(data.error);
            }
          }
          if (data.tablesReady) {
            if (data.points !== undefined) setPoints(data.points);
            if (data.overallGameScores) setOverallGameScores(data.overallGameScores);
            if (data.scoreLogs) setScoreLogs(data.scoreLogs);
            if (data.handwritingHistory) setHandwritingHistory(data.handwritingHistory);
            addLog("MÁY CHỦ: Đồng bộ hóa toàn bộ cơ sở dữ liệu Supabase thành công!");
          } else if (data.dbConfigured && !data.tablesReady) {
            addLog("MÁY CHỦ: Đã kết nối Supabase, các bảng dữ liệu chưa tồn tại trên remote DB.");
          }
        }
      } catch (err) {
        console.error("Failed to load initial state from Supabase:", err);
        addLog("HỆ THỐNG: Đang chạy ngoại tuyến (Chế độ mô phỏng dự phòng).");
      }
    };

    const checkDbStatus = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setDbConfigured(data.supabaseConfigured);
          setDbTablesReady(data.tablesReady);
        }
      } catch (e) {}
    };

    fetchInitialState();
    checkDbStatus();
  }, []);

  // Authentication states
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Score simulation databases
  const [scoreLogs, setScoreLogs] = useState<ScoreLog[]>([
    { id: "1", game: "Đấu Trí Toán Học", points: 100, accuracy: 100, date: "10/06" },
    { id: "2", game: "Ghép Từ Tiếng Việt", points: 60, accuracy: 80, date: "09/06" },
    { id: "3", game: "Khám Phá Sấm Sét", points: 80, accuracy: 100, date: "08/06" },
  ]);

  // System & Logs monitor
  const [adminLogs, setAdminLogs] = useState<string[]>([
    "SUCCESS: Kết nối thành công Firestore DB node.",
    "API-AUTH: Đã định danh người dùng admin thành công.",
    "SYSTEM: Đã nạp danh sách 6 bài học chính thức."
  ]);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState<boolean>(true);

  // Toast notifier
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  // Interactive Games general state
  const [activeGame, setActiveGame] = useState<string>("");
  const [overallGameScores, setOverallGameScores] = useState<Record<string, number>>({
    "Toán": 85, "Tiếng Việt": 92, "Khoa Học": 74, "Lịch Sử & Địa Lý": 80, "Tiếng Anh": 65
  });

  // GAME 1: MATHS
  const [mathTimer, setMathTimer] = useState<number>(20);
  const [mathScore, setMathScore] = useState<number>(0);
  const [mathCorrect, setMathCorrect] = useState<number>(0);
  const [mathExpr, setMathExpr] = useState<string>("");
  const [mathAns, setMathAns] = useState<number>(0);
  const [mathChoices, setMathChoices] = useState<number[]>([]);
  const mathIntervalRef = useRef<any>(null);

  // GAME 2: VIETNAMESE
  const [tvSentence, setTvSentence] = useState<string>("");
  const [tvCorrectWords, setTvCorrectWords] = useState<string[]>([]);
  const [tvSelectedWords, setTvSelectedWords] = useState<string[]>([]);
  const [tvWordPool, setTvWordPool] = useState<string[]>([]);

  // GAME 3: SCIENCE
  const [khIndex, setKhIndex] = useState<number>(0);
  const [khCorrectCount, setKhCorrectCount] = useState<number>(0);

  // GAME 4: HISTORY RACING
  const [lsIndex, setLsIndex] = useState<number>(0);
  const [lsPlayerPos, setLsPlayerPos] = useState<number>(0);
  const [lsOpponentPos, setLsOpponentPos] = useState<number>(35);
  const [lsScore, setLsScore] = useState<number>(0);

  // GAME 5: ENGLISH SPELLING
  const [eaIndex, setEaIndex] = useState<number>(0);
  const [eaEntered, setEaEntered] = useState<string[]>([]);
  const [eaPool, setEaPool] = useState<string[]>([]);

  // GAME ENDING OVERLAY
  const [showGameModal, setShowGameModal] = useState<boolean>(false);
  const [gameResultTitle, setGameResultTitle] = useState<string>("");
  const [gameResultMessage, setGameResultMessage] = useState<string>("");
  const [gamePointsGained, setGamePointsGained] = useState<number>(0);
  const [gameAccuracy, setGameAccuracy] = useState<number>(100);

  // WRITING ASSESSMENT ASSISTANT
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<any | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Set initial roles from browser URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    if (roleParam === "student") {
      setRole("student");
      setIsLoggedIn(false);
      addLog("Khởi chạy ứng dụng ở chế độ khóa học sinh (?role=student)");
    } else {
      setRole("admin");
      setIsLoggedIn(true);
      addLog("Khởi chạy lớp quản trị KidStudy chủ nhiệm.");
    }
  }, []);

  // System general helper to trigger toasts
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const addLog = (msg: string) => {
    const time = new Date().toTimeString().split(" ")[0];
    setAdminLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const handleNav = (tabId: string) => {
    playSound("click", soundEnabled);
    if (tabId === "admin" && role === "student") {
      triggerToast("Bạn không có quyền truy cập khu vực kỹ thuật!");
      return;
    }
    setActivePage(tabId);
    stopWebcam();
  };

  const handleSelectBlock = (blockNum: number) => {
    playSound("click", soundEnabled);
    setCurrentBlock(blockNum);
    addLog(`Đã chuyển đổi giáo trình ôn luyện sang KHỐI LỚP ${blockNum}`);
    triggerToast(`Đã điều chỉnh sang chương trình Khối lớp ${blockNum}`);
  };

  // SOUND CONTROLLER
  const toggleSound = () => {
    playSound("click", !soundEnabled);
    setSoundEnabled(!soundEnabled);
  };

  // AUTHENTICATION LOGICS
  const handleOpenLogin = () => {
    playSound("click", soundEnabled);
    setUsername("");
    setPassword("");
    setLoginError("");
    setShowLoginModal(true);
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      playSound("victory", soundEnabled);
      setIsLoggedIn(true);
      setRole("admin");
      setShowLoginModal(false);
      triggerToast("Đăng nhập quản trị viên admin/admin thành công!");
      addLog("Đã nâng cấp quyền phiên làm việc thành 'Quản trị viên'.");
    } else {
      playSound("wrong", soundEnabled);
      setLoginError("Tên đăng nhập hoặc mật khẩu quản trị không khớp (admin/admin)!");
    }
  };

  const handleLogout = () => {
    playSound("click", soundEnabled);
    setIsLoggedIn(false);
    setRole("student");
    setShowProfileMenu(false);
    triggerToast("Phiên làm việc đã kết thúc thanh bình.");
    addLog("Quản trị viên đã đăng xuất.");
  };

  // ==========================================
  // GAME END UTILITY TRIGGER
  // ==========================================
  const finishGame = (title: string, message: string, bonusPoints: number, accuracy: number, subjectName: string) => {
    playSound("victory", soundEnabled);
    const nextPoints = points + bonusPoints;
    setPoints(nextPoints);
    setGameResultTitle(title);
    setGameResultMessage(message);
    setGamePointsGained(bonusPoints);
    setGameAccuracy(accuracy);
    setShowGameModal(true);

    // Update charts database dynamically
    let nextScores: Record<string, number> = {};
    setOverallGameScores(prev => {
      const existing = prev[subjectName] || 70;
      const updated = Math.min(100, Math.round((existing + accuracy) / 2));
      nextScores = { ...prev, [subjectName]: updated };
      syncOverallScores(nextScores);
      return nextScores;
    });

    syncPoints(nextPoints);

    // Save logs for graph monitoring
    const newLog: ScoreLog = {
      id: Math.random().toString(),
      game: title,
      points: bonusPoints,
      accuracy: accuracy,
      date: new Date().toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit" })
    };
    setScoreLogs(prev => [newLog, ...prev]);
    syncScoreLog(newLog);

    addLog(`Học sinh vừa hoàn thành ôn luyện ${subjectName} đạt ${accuracy}%. Thưởng +${bonusPoints}đ`);
  };

  // ==========================================
  // 1. GAME TOÁN HỌC LOGIC (ĐẤU TRÍ TOÁN HỌC)
  // ==========================================
  const startMathGame = () => {
    setMathScore(0);
    setMathCorrect(0);
    setMathTimer(20);
    setShowGameModal(false);
    setActiveGame("toan");
    generateMathQuestion(currentBlock);
    addLog("Đã mở phòng game Đấu trí Toán nhẩm nhanh.");

    if (mathIntervalRef.current) clearInterval(mathIntervalRef.current);
    mathIntervalRef.current = setInterval(() => {
      setMathTimer(prev => {
        if (prev <= 1) {
          clearInterval(mathIntervalRef.current);
          const pointsEarned = Math.min(mathScore, 80);
          finishGame(
            "Hết giờ đấu trí!",
            `Em đã nỗ lực hết mình và giành được kết quả khá đáng yêu với các phép toán thử thách!`,
            pointsEarned,
            mathCorrect > 0 ? Math.round((mathCorrect / (mathCorrect + 1)) * 100) : 0,
            "Toán"
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generateMathQuestion = (block: number) => {
    let expr = "";
    let answer = 0;
    if (block === 1) {
      const v1 = Math.floor(Math.random() * 8) + 1;
      const v2 = Math.floor(Math.random() * (10 - v1));
      const sym = Math.random() > 0.5 ? "+" : "-";
      if (sym === "-") {
        const lesser = Math.floor(Math.random() * v1);
        answer = v1 - lesser;
        expr = `${v1} - ${lesser} = ?`;
      } else {
        answer = v1 + v2;
        expr = `${v1} + ${v2} = ?`;
      }
    } else if (block === 2 || block === 3) {
      const v1 = Math.floor(Math.random() * 8) + 2;
      const v2 = Math.floor(Math.random() * 9) + 1;
      answer = v1 * v2;
      expr = `${v1} × ${v2} = ?`;
    } else {
      const v1 = Math.floor(Math.random() * 12) + 5;
      const v2 = Math.floor(Math.random() * 10) + 2;
      const bonus = Math.floor(Math.random() * 20) + 1;
      answer = (v1 * v2) + bonus;
      expr = `(${v1} × ${v2}) + ${bonus} = ?`;
    }

    setMathExpr(expr);
    setMathAns(answer);

    const choicesSet = new Set<number>();
    choicesSet.add(answer);
    while (choicesSet.size < 4) {
      const dist = (Math.floor(Math.random() * 8) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrong = answer + dist;
      if (wrong >= 0) choicesSet.add(wrong);
    }
    setMathChoices(Array.from(choicesSet).sort(() => Math.random() - 0.5));
  };

  const checkMathAnswer = (val: number) => {
    if (val === mathAns) {
      playSound("correct", soundEnabled);
      const nextScore = mathScore + 20;
      setMathScore(nextScore);
      setMathCorrect(prev => prev + 1);
      if (nextScore >= 100) {
        clearInterval(mathIntervalRef.current);
        setTimeout(() => {
          finishGame(
            "Đại thắng đấu toán vương!",
            `Xuất sắc quá! Em đã ghi được 100 điểm tối đa cực kỳ vẻ vang!`,
            50,
            100,
            "Toán"
          );
        }, 300);
      } else {
        generateMathQuestion(currentBlock);
      }
    } else {
      playSound("wrong", soundEnabled);
      triggerToast("Sai rồi, thử biểu thức suy tính kĩ hơn nhóc nhé!");
    }
  };

  // ==========================================
  // 2. GAME TIẾNG VIỆT LOGIC (GHÉP CÂU)
  // ==========================================
  const startTiengVietGame = () => {
    playSound("click", soundEnabled);
    setShowGameModal(false);
    setActiveGame("tiengviet");
    
    const dbItem = tiengVietDb[Math.floor(Math.random() * tiengVietDb.length)];
    setTvSentence(dbItem.full);
    setTvCorrectWords(dbItem.words);
    setTvSelectedWords([]);
    setTvWordPool([...dbItem.words].sort(() => Math.random() - 0.5));
    addLog("Đã khởi động bàn ô câu tiếng Việt kì diệu.");
  };

  const handleSelectTvWord = (w: string, idx: number) => {
    playSound("click", soundEnabled);
    setTvSelectedWords(prev => [...prev, w]);
    setTvWordPool(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReturnTvWord = (w: string, idx: number) => {
    playSound("click", soundEnabled);
    setTvWordPool(prev => [...prev, w]);
    setTvSelectedWords(prev => prev.filter((_, i) => i !== idx));
  };

  const verifyTiengViet = () => {
    const built = tvSelectedWords.join(" ");
    if (built === tvSentence) {
      finishGame(
        "Giải Đố Tiếng Việt xuất thần!",
        `Chúc mừng em đã thấu hiểu cấu trúc ngữ nghĩa câu Tiếng Việt một cách hoàn mĩ: "${built}"`,
        30,
        100,
        "Tiếng Việt"
      );
    } else {
      playSound("wrong", soundEnabled);
      triggerToast("Chưa đúng trật tự câu văn đâu, hãy sắp đặt lại thử nhé!");
    }
  };

  // ==========================================
  // 3. GAME KHOA HỌC (NHẬN BIẾT KHOA HỌC)
  // ==========================================
  const startScienceGame = () => {
    playSound("click", soundEnabled);
    setKhIndex(0);
    setKhCorrectCount(0);
    setShowGameModal(false);
    setActiveGame("khoahoc");
    addLog("Khởi động câu hỏi đố vui Khoa học thế giới tự nhiên.");
  };

  const checkScienceAnswer = (choiceIdx: number) => {
    const currentQ = khoaHocQuestions[khIndex];
    if (choiceIdx === currentQ.a) {
      playSound("correct", soundEnabled);
      const nextCorrect = khCorrectCount + 1;
      setKhCorrectCount(nextCorrect);
      triggerToast("Một câu trả lời đỉnh sắc!");
    } else {
      playSound("wrong", soundEnabled);
      triggerToast(`Ồ chưa đúng. Đáp án chuẩn là: ${currentQ.c[currentQ.a]}`);
    }

    setTimeout(() => {
      if (khIndex < khoaHocQuestions.length - 1) {
        setKhIndex(prev => prev + 1);
      } else {
        const percent = Math.round(((khCorrectCount + (choiceIdx === currentQ.a ? 1 : 0)) / khoaHocQuestions.length) * 100);
        finishGame(
          "Hoàn thành cuộc đố vũ trụ!",
          `Trải nghiệm thật kỳ diệu! Em đã giải mã chính xác các hiện tượng khoa học tự nhiên đáng giá!`,
          40,
          percent,
          "Khoa Học"
        );
      }
    }, 1500);
  };

  // ==========================================
  // 4. GAME ĐUA XE SỬ ĐỊA (LỊCH SỬ VIỆT NAM)
  // ==========================================
  const startHistoryRacingGame = () => {
    playSound("click", soundEnabled);
    setLsIndex(0);
    setLsScore(0);
    setLsPlayerPos(0);
    setLsOpponentPos(35);
    setShowGameModal(false);
    setActiveGame("lichsu");
    addLog("Khởi động cuộc đua xe Sử Địa thăng cấp.");
  };

  const checkHistoryAnswer = (choiceIdx: number) => {
    const currentQ = lichSuQuestions[lsIndex];
    let nextPlayerPos = lsPlayerPos;
    let nextOpponentPos = lsOpponentPos;
    let gainedScore = lsScore;

    if (choiceIdx === currentQ.a) {
      playSound("correct", soundEnabled);
      nextPlayerPos = Math.min(90, nextPlayerPos + 30);
      gainedScore += 30;
      setLsPlayerPos(nextPlayerPos);
      setLsScore(gainedScore);
      triggerToast("Bạn nạp đầy bình xăng chạy vụt!");
    } else {
      playSound("wrong", soundEnabled);
      nextOpponentPos = Math.min(90, nextOpponentPos + 20);
      setLsOpponentPos(nextOpponentPos);
      triggerToast("Xe đối thủ rượt nhanh hơn rồi!");
    }

    setTimeout(() => {
      const nextIndex = lsIndex + 1;
      if (nextPlayerPos >= 90) {
        finishGame(
          "Cán Mốc Quán Quân Đua Xe!",
          "Vượt bậc sử hào khí dân tộc! Em cán đích trước robot AI cứu tinh tự hào!",
          45,
          100,
          "Lịch Sử & Địa Lý"
        );
      } else if (nextOpponentPos >= 90) {
        finishGame(
          "Robot cán đích mất rồi!",
          "Em suýt cán mốc rồi! Đừng ngã lòng, cùng ôn tập chiến thuật và thi triển lại trận đấu phục thù!",
          15,
          60,
          "Lịch Sử & Địa Lý"
        );
      } else if (nextIndex >= lichSuQuestions.length) {
        // Evaluate based on positions
        if (nextPlayerPos > nextOpponentPos) {
          finishGame(
            "Cán đích chiến thắng tuyệt kỹ!",
            "Rất vinh hạnh! Em cán mốc thắng tuyệt kỹ trong thời khắc quyết định!",
            40,
            80,
            "Lịch Sử & Địa Lý"
          );
        } else {
          finishGame(
            "Trận chiến tưng bừng!",
            "Màn so tài kịch tính! Em hoàn thành trọn vẹn giáo trình thi đua Sử Địa đồng đội tốt.",
            20,
            50,
            "Lịch Sử & Địa Lý"
          );
        }
      } else {
        setLsIndex(nextIndex);
      }
    }, 1500);
  };

  // ==========================================
  // 5. ENGLISH SPELLING SPELLER
  // ==========================================
  const startEnglishGame = () => {
    playSound("click", soundEnabled);
    setEaIndex(0);
    setEaEntered([]);
    setShowGameModal(false);
    setActiveGame("tienganh");
    const q = englishQuestions[0];
    setEaPool([...q.pool]);
    addLog("Khởi động đố vui ghép từ Tiếng Anh.");
  };

  const handleSelectEaLetter = (char: string, idx: number) => {
    const q = englishQuestions[eaIndex];
    if (eaEntered.length < q.word.length) {
      playSound("click", soundEnabled);
      const nextEntered = [...eaEntered, char];
      setEaEntered(nextEntered);

      // Verify immediate spelling match if length completed
      if (nextEntered.length === q.word.length) {
        const formatted = nextEntered.join("");
        if (formatted === q.word) {
          playSound("correct", soundEnabled);
          triggerToast("Phát âm chính xác! Wonderful!");
          setTimeout(() => {
            const nextIndex = eaIndex + 1;
            if (nextIndex >= englishQuestions.length) {
              finishGame(
                "Đạt Danh hiệu Hiệp Sĩ Tiếng Anh!",
                "Great job! Em hoành tráng ghép chữ trôi chảy toàn bộ bảng từ vựng tranh ảnh hữu ích ngày hôm nay!",
                40,
                100,
                "Tiếng Anh"
              );
            } else {
              setEaIndex(nextIndex);
              setEaEntered([]);
              setEaPool([...englishQuestions[nextIndex].pool]);
            }
          }, 1500);
        } else {
          playSound("wrong", soundEnabled);
          triggerToast("Ghép chưa chính xác từ, thử gõ lại nhé!");
          setTimeout(() => {
            setEaEntered([]);
          }, 1000);
        }
      }
    }
  };

  // ==========================================
  // WEBCAM DEVICE CAPTURING FUNCTIONS
  // ==========================================
  const startWebcam = async () => {
    playSound("click", soundEnabled);
    setUploadedBase64(null);
    setImageUrl("");
    setAiResponse(null);
    setIsCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      addLog("Không tìm thấy Webcam phần cứng. Đã chuyển đổi sang chế độ camera minh họa thẩm mỹ.");
    }
  };

  const captureFrame = () => {
    playSound("click", soundEnabled);
    if (videoRef.current && videoRef.current.srcObject) {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setUploadedBase64(dataUrl.split(",")[1]);
        setMimeType("image/png");
        setImageUrl(dataUrl);
        stopWebcam();
        triggerToast("Đã chụp hình chụp bài Tập viết thành công!");
      }
    } else {
      // Simulate drawing test sample directly if no webcam stream
      useSampleImage(1);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const useSampleImage = (sampleId: number) => {
    playSound("click", soundEnabled);
    stopWebcam();
    if (sampleId === 1) {
      setImageUrl("https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&auto=format&fit=crop&q=60");
      setUploadedBase64("MOCK_SAMPLE_1");
      setMimeType("image/jpeg");
      triggerToast("Đã chọn viết chữ đẹp mẫu 1");
    } else {
      setImageUrl("https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500&auto=format&fit=crop&q=60");
      setUploadedBase64("MOCK_SAMPLE_2");
      setMimeType("image/jpeg");
      triggerToast("Đã chọn viết lỗi mẫu 2");
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        setUploadedBase64((event.target.result as string).split(",")[1]);
        triggerToast("Tải ảnh bài lên thành công!");
      }
    };
    reader.readAsDataURL(file);
  };

  // call the real server endpoint `/api/analyze-handwriting`
  const submitHandwritingAnalysis = async () => {
    if (!uploadedBase64) return;
    playSound("click", soundEnabled);
    setIsAnalyzing(true);
    setAiResponse(null);

    const targetId = Math.random().toString();
    const mockImgUrl = imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${targetId}`;

    try {
      const response = await fetch("/api/analyze-handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: uploadedBase64,
          mimeType: mimeType || "image/png",
          isPreloaded: uploadedBase64.startsWith("MOCK_SAMPLE_"),
          sampleId: uploadedBase64 === "MOCK_SAMPLE_2" ? 2 : 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data);
        playSound("victory", soundEnabled);
        triggerToast("Cô Hà AI đã hoàn tất chấm điểm văn!");

        // push to Supabase
        try {
          const syncRes = await fetch("/api/handwriting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: targetId,
              score: data.score,
              legibility_comment: data.legibility_comment,
              structure_comment: data.structure_comment,
              errors: data.errors || [],
              encouragement: data.encouragement,
              image_url: mockImgUrl
            })
          });
          if (syncRes.ok) {
            const hwResult = await syncRes.json();
            setHandwritingHistory(prev => [hwResult.hw, ...prev]);
            addLog("MÁY CHỦ: Đã lưu bảng điểm nét bút lên Supabase.");
          }
        } catch (syncErr) {
          console.error("Supabase handwriting save error:", syncErr);
        }
      } else {
        throw new Error("API call error");
      }
    } catch (err) {
      addLog("Lỗi kết nối Gemini API. Đang sử dụng bộ giả lập Sư phạm Hà Nội học đường.");
      // Fallback response inside front-end for complete safety
      const dummyObj = uploadedBase64 === "MOCK_SAMPLE_2" ? {
        score: 6.0,
        legibility_comment: "Chữ viết của con còn khá nguệch ngoạc, chưa nằm ngay ngắn trên đường kẻ ô ly. Một số nét khuyết dưới của chữ 'g', 'y' viết hơi ngắn và chưa đều nhau.",
        structure_comment: "Cấu trúc đoạn văn tả con vật tương đối đầy đủ ý. Tuy nhiên con gặp lỗi lặp từ nhiều lần (từ 'con chó' lặp 4 lần trong 3 câu) và viết câu quá dài thiếu dấu ngắt câu.",
        errors: [
          "Sai chính tả: viết 'vui vẽ' (Đúng phải là 'vui vẻ').",
          "Sai chính tả: viết 'trông nhà' thành 'chông nhà'.",
          "Chữ 't' viết thiếu nét gạch ngang nhỏ.",
          "Thiếu dấu chấm kết thúc đoạn văn miêu tả."
        ],
        encouragement: "Nét chữ là nết người, chỉ cần con chăm chỉ rèn luyện viết chậm lại một chút và chú ý quy tắc chính tả, cô tin chắc bài sau con sẽ giành được điểm 9, 10 dễ dàng! Cố lên con yêu!"
      } : {
        score: 9.5,
        legibility_comment: "Nét chữ của con cực kỳ xuất sắc! Chữ viết tròn trịa, nắn nót, đúng độ cao ô ly và nghiêng đều rất nghệ thuật. Trình bày bài sạch đẹp không tì vết.",
        structure_comment: "Bài văn tả mẹ đong đầy cảm xúc, biết lựa chọn những chi tiết nổi bật như mái tóc, nụ cười hiền hậu. Cách dùng từ gợi tả sáng tạo, bố cục bài mạch lạc.",
        errors: [
          "Khoảng cách giữa chữ 'Mẹ' và chữ 'thương' hơi sát nhau một chút.",
          "Cần uyển chuyển các nét thanh và nét đậm."
        ],
        encouragement: "Bài viết của con làm cô vô cùng xúc động! Con viết chữ rất đẹp và có năng khiếu văn chương lớn. Hãy tiếp tục phát huy tinh thần hiếu học này nhé!"
      };
      setAiResponse(dummyObj);
      playSound("victory", soundEnabled);

      // push fallback and mock to Supabase for premium high-fidelity demo
      try {
        const syncRes = await fetch("/api/handwriting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetId,
            score: dummyObj.score,
            legibility_comment: dummyObj.legibility_comment,
            structure_comment: dummyObj.structure_comment,
            errors: dummyObj.errors,
            encouragement: dummyObj.encouragement,
            image_url: mockImgUrl
          })
        });
        if (syncRes.ok) {
          const hwResult = await syncRes.json();
          setHandwritingHistory(prev => [hwResult.hw, ...prev]);
        }
      } catch (syncErr) {}
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy kid login link dynamically
  const handleCopyLink = () => {
    playSound("click", soundEnabled);
    const finalUrl = `${window.location.origin}${window.location.pathname}?role=student`;
    navigator.clipboard.writeText(finalUrl);
    triggerToast("Đã sao chép đường link chia sẻ sang khay nhớ!");
    addLog("Đã tạo liên kết học sinh chia sẻ: ?role=student");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* Dynamic Header Banner constraint */}
      {role === "student" && (
        <div className="bg-amber-500 text-white font-black py-2 md:py-3 px-4 text-center text-xs md:text-sm shadow-inner flex items-center justify-center space-x-2 animate-pulse">
          <i className="fa-solid fa-graduation-cap text-md"></i>
          <span>Chế độ Học sinh (Chỉ xem & Ôn tập): Bạn đang truy cập qua link chia sẻ. Tính năng quản trị kỹ thuật đã bị ẩn.</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          
          {/* logo & branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNav("home")}>
            <div className="bg-white text-blue-600 p-2 rounded-2xl shadow-md animate-kids-bounce">
              <i className="fa-solid fa-graduation-cap text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-yellow-300 tracking-wider">KIDSTUDY</h1>
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Ôn luyện học đường toàn diện</span>
            </div>
          </div>

          {/* Points & utilities */}
          <div className="flex items-center space-x-3">
            <div className="bg-white/15 px-3 py-1.5 rounded-full flex items-center space-x-1.5 text-xs md:text-sm border border-white/20">
              <span className="text-yellow-300 font-bold"><i className="fa-solid fa-star"></i></span>
              <span className="font-extrabold text-white">{points.toLocaleString()} Điểm</span>
            </div>

            <div className="bg-white/15 px-3 py-1.5 rounded-full space-x-1.5 text-xs font-bold border border-white/20 hidden sm:flex items-center">
              <i className="fa-solid fa-award text-green-300"></i>
              <span className="text-white">Cấp 8: Trí Tuệ</span>
            </div>

            <button 
              onClick={toggleSound}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
              title="Bật/Tắt âm"
            >
              <i className={`fa-solid ${soundEnabled ? "fa-volume-high text-yellow-200" : "fa-volume-xmark text-slate-300"} text-md`} />
            </button>

            {/* Profile trigger */}
            {isLoggedIn ? (
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 hover:bg-white/10 p-1.5 rounded-xl transition cursor-pointer"
                >
                  <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky" className="w-8 h-8 rounded-full bg-amber-100 border border-yellow-300" alt="avatar" />
                  <span className="font-black text-xs hidden md:inline-flex items-center">
                    admin <i className="fa-solid fa-caret-down ml-1 text-yellow-300"></i>
                  </span>
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 animate-gentle">
                    <div className="p-3 bg-slate-50 border-b border-indigo-50">
                      <p className="font-black text-xs">admin</p>
                      <p className="text-[10px] text-slate-400">Tài khoản quản trị</p>
                    </div>
                    <button onClick={() => { handleNav("dashboard"); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center space-x-2">
                      <i className="fa-solid fa-chart-line text-indigo-500"></i> <span>Quản lý học tập</span>
                    </button>
                    <button onClick={() => { handleNav("admin"); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center space-x-2">
                      <i className="fa-solid fa-gears text-purple-500"></i> <span>Hệ thống kỹ thuật</span>
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition border-t border-slate-100 flex items-center space-x-2">
                      <i className="fa-solid fa-right-from-bracket"></i> <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={handleOpenLogin}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs md:text-sm font-black px-4 py-2 rounded-2xl transition shadow-md cursor-pointer"
              >
                Đăng nhập Admin
              </button>
            )}
          </div>
        </div>

        {/* SECONDARY NAVIGATION TABS */}
        <nav className="bg-white text-slate-600 shadow-inner border-b border-indigo-100">
          <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto whitespace-nowrap">
            <button onClick={() => handleNav("home")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "home" ? "border-b-4 border-blue-500 text-blue-600" : "hover:text-blue-500"}`}>
              <i className="fa-solid fa-house"></i> <span>Trang Chủ</span>
            </button>
            <button onClick={() => handleNav("curriculum")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "curriculum" ? "border-b-4 border-blue-500 text-blue-600" : "hover:text-blue-500"}`}>
              <i className="fa-solid fa-book-open text-emerald-500"></i> <span>Lớp học SGK</span>
            </button>
            <button onClick={() => handleNav("games")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "games" ? "border-b-4 border-blue-500 text-blue-600" : "hover:text-blue-500"}`}>
              <i className="fa-solid fa-gamepad text-red-500"></i> <span>Ứng dụng Trò Chơi</span>
            </button>
            <button onClick={() => handleNav("leaderboard")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "leaderboard" ? "border-b-4 border-blue-500 text-blue-600" : "hover:text-blue-500"}`}>
              <i className="fa-solid fa-trophy text-amber-500"></i> <span>Cao thủ học đường</span>
            </button>
            <button onClick={() => handleNav("dashboard")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "dashboard" ? "border-b-4 border-blue-500 text-blue-600" : "hover:text-blue-500"}`}>
              <i className="fa-solid fa-chart-pie text-cyan-500"></i> <span>Vườn học tập (Bố mẹ)</span>
            </button>
            <button onClick={() => handleNav("handwriting")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "handwriting" ? "border-b-4 border-blue-500 text-blue-600" : "hover:text-blue-500"}`}>
              <i className="fa-solid fa-file-signature text-orange-500 animate-pulse"></i> <span>Bài thi viết tay AI</span>
            </button>
            {role === "admin" && (
              <button onClick={() => handleNav("admin")} className={`px-4 py-3.5 font-bold text-xs md:text-sm flex items-center space-x-1.5 transition ${activePage === "admin" ? "border-b-4 border-purple-500 text-purple-600 font-extrabold" : "hover:text-purple-600"}`}>
                <i className="fa-solid fa-gears"></i> <span>Bảng lập trình kỹ thuật</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* MAIN APPLICATION CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* GLOBAL BLOCK SELECTION CAROUSEL BAR */}
        <section className="bg-white rounded-3xl p-4 mb-6 shadow-sm border border-indigo-50 hover:shadow-md transition">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 text-yellow-600 p-3 rounded-2xl">
                <i className="fa-solid fa-filter text-lg" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Lọc Trình Độ Ôn Tập</h3>
                <p className="text-[11px] text-slate-500">Giáo án học tập sẽ tùy chọn theo nhóm Khối lớp tương ứng.</p>
              </div>
            </div>

            {/* Block list */}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map(b => (
                <button
                  key={b}
                  onClick={() => handleSelectBlock(b)}
                  className={`px-4 py-2 rounded-2xl font-black text-xs md:text-sm transition-all transform hover:scale-105 border-b-4 cursor-pointer ${currentBlock === b ? "border-indigo-600 bg-indigo-500 text-white shadow-md" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  KHỐI LỚP {b}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* VIEW 1: HOME PANEL */}
        {activePage === "home" && (
          <div className="space-y-6">
            
            {/* Action Banner */}
            <div className="bg-gradient-to-r from-teal-400 via-blue-500 to-indigo-600 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden kids-shadow">
              <div className="absolute right-0 bottom-0 select-none opacity-10">
                <i className="fa-solid fa-icons text-9xl"></i>
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-4">
                  <span className="bg-yellow-300 text-yellow-900 font-extrabold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">Phiên bản thông thái mùa hè 2026</span>
                  <h2 className="text-3xl md:text-4xl font-black leading-tight">Chơi Tuyệt Vời,<br />Học Đỉnh Lớn Cùng AI!</h2>
                  <p className="text-blue-100 text-xs md:text-sm leading-relaxed">
                    Sân chơi trí tuệ thiết kế hài hòa gồm 5 chuyên mục trò chơi rực rỡ và Trợ lý cô Hà AI nhận diện chữ ô ly chuẩn sư phạm giúp em vững chắc kiến thức một cách khoa học nhất!
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button onClick={() => { playSound("click", soundEnabled); handleNav("curriculum"); }} className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black px-5 py-3 rounded-2xl border-b-4 border-yellow-600 text-xs transition transform active:scale-95 cursor-pointer shadow">
                      <i className="fa-solid fa-play mr-1"></i> Bắt đầu ôn thi học kỳ
                    </button>
                    <button onClick={() => { playSound("click", soundEnabled); handleNav("games"); }} className="bg-white hover:bg-slate-50 text-blue-600 font-black px-5 py-3 rounded-2xl border-b-4 border-slate-300 text-xs transition transform active:scale-95 cursor-pointer">
                      <i className="fa-solid fa-gamepad mr-1"></i> Chiến đấu mini-game
                    </button>
                  </div>
                </div>
                <div className="hidden md:flex justify-center">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=KidSchool" className="w-40 h-40 animate-kids-bounce bg-white/20 p-2 rounded-full" alt="mascot" />
                </div>
              </div>
            </div>

            {/* Subject cards list */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-black text-slate-800">Chọn môn học để thi đua:</h2>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">Sách giáo khoa 2026</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: "Toán", icon: "fa-calculator", desc: "Tính nhẩm thần tốc", color: "red", gameRoute: "toan" },
                  { name: "Tiếng Việt", icon: "fa-font", desc: "Đúng ngữ nghĩa từ mới", color: "amber", gameRoute: "tiengviet" },
                  { name: "Khoa Học", icon: "fa-flask-vial", desc: "Kinh ngạc thiên nhiên", color: "green", gameRoute: "khoahoc" },
                  { name: "Lịch Sử & Địa Lý", icon: "fa-earth-americas", desc: "K hào sông nước", color: "blue", gameRoute: "lichsu" },
                  { name: "Tiếng Anh", icon: "fa-flag-usa", desc: "Spelling vocabulary", color: "purple", gameRoute: "tienganh" }
                ].map((sub, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      playSound("click", soundEnabled);
                      setCurrentSubject(sub.name);
                      handleNav("curriculum");
                    }}
                    className="bg-white hover:shadow-lg rounded-3xl p-4 border border-slate-100 cursor-pointer transition text-center hover:-translate-y-1 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition shadow-inner bg-${sub.color}-50 text-${sub.color}-500 group-hover:scale-105`}>
                      <i className={`fa-solid ${sub.icon} text-xl`}></i>
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">{sub.name.toUpperCase()}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">{sub.desc}</p>
                    <div className="mt-3 inline-flex items-center space-x-1 text-[10px] font-extrabold text-slate-600 hover:text-indigo-600 bg-slate-50 px-2 py-1 rounded-full">
                      <span>Ôn lý thuyết</span> <i className="fa-solid fa-chevron-right text-[8px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges system */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:col-span-2">
                <h3 className="font-extrabold text-slate-800 text-sm mb-4">Các huy hiệu em đạt được:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-yellow-50 p-3 rounded-2xl text-center border border-yellow-100">
                    <span className="text-2xl">🔥</span>
                    <h4 className="font-extrabold text-slate-800 text-xs mt-1">Chăm Chỉ</h4>
                    <p className="text-[9px] text-slate-400">Chuỗi học ngoan 5 ngày</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-2xl text-center border border-green-100">
                    <span className="text-2xl">⚡</span>
                    <h4 className="font-extrabold text-slate-800 text-xs mt-1">Sấm Sét</h4>
                    <p className="text-[9px] text-slate-400">Đua tốc giải toán nhanh</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl text-center border border-blue-100">
                    <span className="text-2xl">🏅</span>
                    <h4 className="font-extrabold text-slate-800 text-xs mt-1">Hào Khí Việt</h4>
                    <p className="text-[9px] text-slate-400">Thi đua Sử lý mượt mà</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-2xl text-center border border-purple-100 opacity-60">
                    <span className="text-2xl">👑</span>
                    <h4 className="font-extrabold text-slate-800 text-xs mt-1">Khai Trí</h4>
                    <p className="text-[9px] text-slate-400">Cần thi đua 5 bộ môn</p>
                  </div>
                </div>
              </div>

              {/* Day limit & progress banner */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">Thử thách hôm nay</span>
                  <p className="font-black text-base mt-2">Đấu Sĩ Học Đường</p>
                  <p className="text-[10px] text-amber-50 mt-1">Đạt tối thiểu 100 điểm rinh phần thưởng rương vàng!</p>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span>Đạt: 60/100đ</span>
                    <span>60%</span>
                  </div>
                  <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-yellow-300 h-full rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: CURRICULUM LEVEL */}
        {activePage === "curriculum" && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-800">Cẩm Nang Sách Giáo Khoa Toàn Tập</h2>
                <p className="text-slate-500 text-xs">Vừa đọc lý thuyết vừa thực thi bài tập rèn luyện nhạy bén.</p>
              </div>

              {/* Subject switcher bar */}
              <div className="bg-slate-100 p-1 rounded-2xl flex space-x-1">
                {["Toán", "Tiếng Việt", "Khoa Học", "Lịch Sử & Địa Lý", "Tiếng Anh"].map(sub => (
                  <button
                    key={sub}
                    onClick={() => { playSound("click", soundEnabled); setCurrentSubject(sub); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${currentSubject === sub ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Curriculum grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
                <div className="text-sm font-extrabold text-slate-800 flex items-center space-x-2 border-b border-indigo-50 pb-3">
                  <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-xs"><i className="fa-solid fa-book"></i></span>
                  <span>Chương trình: {currentSubject} - Khối lớp {currentBlock}</span>
                </div>

                <div className="space-y-3">
                  {(syllabusData[currentBlock]?.[currentSubject] || []).map((topic, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition duration-150 flex justify-between items-center">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-800 text-sm md:text-md">{topic.title}</h4>
                        <p className="text-[11px] text-slate-500">{topic.desc}</p>
                      </div>
                      <button 
                        onClick={() => {
                          playSound("click", soundEnabled);
                          handleNav("games");
                        }}
                        className="bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-3 py-1.5 rounded-lg shrink-0 hover:bg-indigo-200 transition cursor-pointer"
                      >
                        Thực hành Game
                      </button>
                    </div>
                  ))}
                  {(syllabusData[currentBlock]?.[currentSubject] || []).length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <p className="text-xs">Chương trình giáo trình chủ đề này đang được ban kỹ thuật số hóa cập nhật thêm!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress panel on side */}
              <div className="space-y-6">
                
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase mb-3 text-indigo-600">Trạng thái ôn đợt học kỳ:</h3>
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="font-bold flex justify-between mb-1 text-slate-600">Lý thuyết đọc hiểu <span>80%</span></span>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: "80%" }}></div>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold flex justify-between mb-1 text-slate-600">Bài thi trắc nghiệm game <span>45%</span></span>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: "45%" }}></div>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold flex justify-between mb-1 text-slate-600">Vòng đấu tranh vương <span>20%</span></span>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-400 h-full rounded-full" style={{ width: "20%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-3xl text-center space-y-4">
                  <span className="text-4xl block animate-kids-bounce">🎮</span>
                  <p className="font-black text-sm">Học xong lý thuyết rồi ? Thử thách tranh vương ngay!</p>
                  <p className="text-[10px] text-indigo-100">Mọi màn chơi mini-game sẽ tự động nẹp cấu hình theo bài tập vừa lướt trên.</p>
                  <button 
                    onClick={() => handleNav("games")}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-extrabold py-2.5 rounded-xl border-b-4 border-yellow-600 text-xs cursor-pointer shadow"
                  >
                    VÀO SÂN GAME THI ĐẤU
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: TRÒ CHƠI ÔN LUYỆN */}
        {activePage === "games" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800">Đấu Trường Trí Tuệ Sắc Màu</h2>
              <p className="text-slate-500 text-xs">Vừa giải lao vừa ghi nhớ bài học xuất sắc qua các màn so trí sáng tạo!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Selector Sidebar */}
              <div className="space-y-3 shrink-0">
                
                <button 
                  onClick={startMathGame}
                  className={`w-full p-4 rounded-3xl border-2 text-left transition flex items-center space-x-3 cursor-pointer ${activeGame === "toan" ? "border-red-500 bg-red-50/50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center text-lg shadow-inner shrink-0">
                    <i className="fa-solid fa-calculator" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">Đấu trí Toán học</h4>
                    <span className="text-[9px] text-slate-400">Đáp án biểu thức khối {currentBlock}</span>
                  </div>
                </button>

                <button 
                  onClick={startTiengVietGame}
                  className={`w-full p-4 rounded-3xl border-2 text-left transition flex items-center space-x-3 cursor-pointer ${activeGame === "tiengviet" ? "border-amber-500 bg-amber-50/50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center text-lg shadow-inner shrink-0">
                    <i className="fa-solid fa-font" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">Ghép Câu Tiếng Việt</h4>
                    <span className="text-[9px] text-slate-400">Trật tự từ ngữ thông minh</span>
                  </div>
                </button>

                <button 
                  onClick={startScienceGame}
                  className={`w-full p-4 rounded-3xl border-2 text-left transition flex items-center space-x-3 cursor-pointer ${activeGame === "khoahoc" ? "border-green-500 bg-green-50/50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-500 flex items-center justify-center text-lg shadow-inner shrink-0">
                    <i className="fa-solid fa-flask-vial" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">Nêu đúng Khoa Học</h4>
                    <span className="text-[9px] text-slate-400">Trắc nghiệm vũ trụ mây mưa</span>
                  </div>
                </button>

                <button 
                  onClick={startHistoryRacingGame}
                  className={`w-full p-4 rounded-3xl border-2 text-left transition flex items-center space-x-3 cursor-pointer ${activeGame === "lichsu" ? "border-blue-500 bg-blue-50/50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center text-lg shadow-inner shrink-0">
                    <i className="fa-solid fa-earth-americas" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">Đua Xe Sử Địa</h4>
                    <span className="text-[9px] text-slate-400">Lướt nhanh bờ cõi Thăng Long</span>
                  </div>
                </button>

                <button 
                  onClick={startEnglishGame}
                  className={`w-full p-4 rounded-3xl border-2 text-left transition flex items-center space-x-3 cursor-pointer ${activeGame === "tienganh" ? "border-purple-500 bg-purple-50/50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-500 flex items-center justify-center text-lg shadow-inner shrink-0">
                    <i className="fa-solid fa-flag-usa" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">English Spelling Quiz</h4>
                    <span className="text-[9px] text-slate-400">Học từ mới qua hội họa</span>
                  </div>
                </button>

              </div>

              {/* Game Playboard Stage */}
              <div className="lg:col-span-3 bg-white border-4 border-indigo-100 rounded-3xl p-6 min-h-[400px] flex flex-col justify-between relative shadow-sm">
                
                {/* DEFAULT NO GAME PLANNED */}
                {!activeGame && (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 my-auto">
                    <span className="text-5xl animate-kids-bounce">🏆</span>
                    <div>
                      <h3 className="font-black text-slate-800 text-md">Đã bật Sân Chơi Học Tập!</h3>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">Con hãy nhấn chọn một hạng mục game đọ trí ở tủ bảng bên trái để bắt đầu lập chiến công nòng nàn điểm thưởng nhé!</p>
                    </div>
                    <button onClick={startMathGame} className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-extrabold px-6 py-2.5 rounded-xl border-b-4 border-yellow-600 text-xs shadow-sm cursor-pointer">
                      Đấu Trí Toán Ngay
                    </button>
                  </div>
                )}

                {/* GAME 1: MATH ACTIVE SCREEN */}
                {activeGame === "toan" && (
                  <div className="flex flex-col justify-between h-full space-y-6 flex-grow">
                    <div className="flex justify-between items-center bg-red-50 p-3 rounded-2xl border border-red-100 text-xs font-bold text-red-600">
                      <span><i className="fa-solid fa-hourglass mr-1"></i> THỜI GIAN: <span className="text-[13px] font-black">{mathTimer}s</span></span>
                      <span>ĐIỂM GHI ĐƯỢC: {mathScore}/100</span>
                    </div>

                    <div className="text-center py-6">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tính nhanh nhẩm kết quả:</p>
                      <h3 className="text-4xl md:text-5xl font-black text-slate-800 mt-2">{mathExpr}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {mathChoices.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => checkMathAnswer(c)}
                          className="bg-white hover:bg-red-50 border-2 border-slate-200 hover:border-red-400 p-4 rounded-2xl text-md font-black text-slate-700 transition transform active:scale-95 cursor-pointer kids-shadow"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* GAME 2: VIETNAMESE SCRABBLES */}
                {activeGame === "tiengviet" && (
                  <div className="flex flex-col justify-between h-full space-y-6 flex-grow">
                    <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex justify-between items-center text-xs font-bold text-amber-700">
                      <span><i className="fa-solid fa-font" /> Sắp xếp câu đúng chính tả</span>
                      <span>Thưởng: +30 Điểm</span>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] text-center uppercase font-bold text-slate-400">Click chọn ghép câu hoàn chỉnh vào khung sau:</p>
                      <div className="min-h-[80px] bg-slate-50 border-2 border-dashed border-indigo-100 rounded-2xl p-4 flex flex-wrap justify-center items-center gap-2">
                        {tvSelectedWords.map((w, i) => (
                          <span 
                            key={i}
                            onClick={() => handleReturnTvWord(w, i)}
                            className="bg-indigo-500 text-white font-black px-3.5 py-1.5 rounded-xl cursor-pointer hover:bg-red-500 transition shadow-sm text-xs"
                          >
                            {w}
                          </span>
                        ))}
                        {tvSelectedWords.length === 0 && (
                          <span className="text-[10px] text-slate-400 italic">Nhấn chọn các mảnh ghép chữ phía dưới...</span>
                        )}
                      </div>
                    </div>

                    {/* Pools of words */}
                    <div className="bg-amber-50/20 p-4 rounded-2xl flex flex-wrap justify-center gap-2">
                      {tvWordPool.map((w, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectTvWord(w, i)}
                          className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-amber-100 hover:border-amber-400 transition cursor-pointer text-xs shadow-sm"
                        >
                          {w}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                      <button 
                        onClick={startTiengVietGame}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                      >
                        Xóa tất cả làm lại
                      </button>
                      <button 
                        onClick={verifyTiengViet}
                        disabled={tvSelectedWords.length === 0}
                        className="bg-green-500 hover:bg-green-600 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md transition disabled:opacity-55 cursor-pointer"
                      >
                        Nộp Đáp Án
                      </button>
                    </div>

                  </div>
                )}

                {/* GAME 3: SCIENCE QUESTIONS */}
                {activeGame === "khoahoc" && (
                  <div className="flex flex-col justify-between h-full space-y-6 flex-grow">
                    <div className="bg-green-50 p-3 rounded-2xl border border-green-100 flex justify-between items-center text-xs font-bold text-green-700">
                      <span><i className="fa-solid fa-flask-vial" /> ĐỐ VUI BẢN SẮC KHÍ TRỜI</span>
                      <span>Mục hỏi: {khIndex + 1}/{khoaHocQuestions.length}</span>
                    </div>

                    <div className="py-2 text-center space-y-3">
                      <h4 className="text-md md:text-lg font-black text-slate-800 leading-relaxed">
                        {khoaHocQuestions[khIndex]?.q}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {khoaHocQuestions[khIndex]?.c.map((choice, idx) => (
                        <button
                          key={idx}
                          onClick={() => checkScienceAnswer(idx)}
                          className="bg-white hover:bg-green-50 border border-slate-200 hover:border-green-400 p-3.5 rounded-2xl text-left text-xs text-slate-700 font-extrabold transition cursor-pointer shadow-sm flex items-center space-x-2"
                        >
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{choice}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* GAME 4: HISTORY RACING ROAD */}
                {activeGame === "lichsu" && (
                  <div className="flex flex-col justify-between h-full space-y-6 flex-grow">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex justify-between items-center text-xs font-bold text-blue-700">
                      <span><i className="fa-solid fa-earth-americas" /> ĐUA XE SỬ ĐỊA LÀM CHỦĐƯỜNG GIAO</span>
                      <span>Điểm nạp: {lsScore}đ</span>
                    </div>

                    {/* visual race board */}
                    <div className="bg-slate-100 h-24 rounded-2xl border border-slate-200 p-2 relative flex flex-col justify-around overflow-hidden shadow-inner font-bold text-xs">
                      
                      {/* Opponent row */}
                      <div className="relative border-b border-dashed border-slate-300 h-8 flex items-center">
                        <span className="absolute text-[10px] text-slate-400 right-2">ROBOT AI</span>
                        <div className="absolute text-2xl transition-all duration-1000" style={{ left: `${lsOpponentPos}%` }}>
                          🤖
                        </div>
                      </div>

                      {/* Player row */}
                      <div className="relative h-8 flex items-center">
                        <span className="absolute text-[10px] text-slate-400 right-2">EM</span>
                        <div className="absolute text-2xl transition-all duration-1000" style={{ left: `${lsPlayerPos}%` }}>
                          🚗
                        </div>
                      </div>

                      <div className="absolute top-0 bottom-0 right-12 w-1.5 border-r border-dashed border-red-500"></div>
                      <span className="absolute right-3 top-[35%] text-lg">🏁</span>
                    </div>

                    {/* Current question panel */}
                    <div className="space-y-4">
                      <h4 className="text-center font-black text-slate-800 text-sm md:text-md">
                        {lichSuQuestions[lsIndex]?.q}
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        {lichSuQuestions[lsIndex]?.c.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => checkHistoryAnswer(i)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-blue-400 transition cursor-pointer text-xs text-slate-700 font-extrabold shadow-sm"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* GAME 5: ENGLISH SPELLING COMPILER */}
                {activeGame === "tienganh" && (
                  <div className="flex flex-col justify-between h-full space-y-6 flex-grow animate-gentle">
                    <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 flex justify-between items-center text-xs font-bold text-purple-700">
                      <span><i className="fa-solid fa-font" /> SPELL THE ENGLISH WORD</span>
                      <span>Mẹo: {englishQuestions[eaIndex]?.hint}</span>
                    </div>

                    <div className="flex flex-col items-center space-y-4 text-center">
                      <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center text-5xl shadow-inner border border-purple-100 select-none">
                        {englishQuestions[eaIndex]?.emoji}
                      </div>

                      {/* slots indicators */}
                      <div className="flex space-x-1.5 pt-2">
                        {Array.from({ length: englishQuestions[eaIndex]?.word.length || 5 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-9 h-10 border-b-4 flex items-center justify-center text-md font-black rounded-lg ${eaEntered[i] ? "border-purple-500 text-purple-600 bg-purple-50" : "border-slate-300 text-slate-400"}`}
                          >
                            {eaEntered[i] || "_"}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* selection list */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                      {eaPool.map((char, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectEaLetter(char, index)}
                          className="w-10 h-10 bg-white hover:bg-purple-100 text-slate-800 font-black rounded-lg border border-slate-200 hover:border-purple-300 transition text-sm cursor-pointer shadow-xs"
                        >
                          {char}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => setEaEntered([])}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                      >
                        Gõ lại chữ cái
                      </button>
                      <span className="text-[10px] text-slate-400">Chọn lần lượt các kí tự để lắp ráp đúng từ Tiếng Anh mẫu vẽ.</span>
                    </div>
                  </div>
                )}

                {/* OVERLAY GAME VICTORY OR TERMINATION MODAL */}
                {showGameModal && (
                  <div className="absolute inset-0 bg-slate-900/85 rounded-3xl z-30 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
                    <div className="w-16 h-16 bg-yellow-400 text-slate-950 rounded-full flex items-center justify-center text-3xl animate-kids-bounce shadow-lg">
                      <i className="fa-solid fa-trophy" />
                    </div>
                    <h3 className="text-2xl font-black text-yellow-300">{gameResultTitle}</h3>
                    <p className="text-xs text-indigo-50 opacity-90 max-w-sm">{gameResultMessage}</p>

                    <div className="bg-white/10 p-4 rounded-2xl w-full max-w-xs border border-white/10 flex justify-around">
                      <div className="text-center font-bold">
                        <p className="text-[9px] text-slate-300 uppercase tracking-wider">ĐIỂM THƯỞNG</p>
                        <p className="text-xl font-black text-yellow-300">+{gamePointsGained}đ</p>
                      </div>
                      <div className="border-r border-white/20"></div>
                      <div className="text-center font-bold">
                        <p className="text-[9px] text-slate-300 uppercase tracking-wider">TỶ LỆ CHUẨN ĐÚNG</p>
                        <p className="text-xl font-black text-green-300">{gameAccuracy}%</p>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button 
                        onClick={() => { playSound("click", soundEnabled); setActiveGame(""); setShowGameModal(false); }}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Bảng chung
                      </button>
                      <button 
                        onClick={() => {
                          playSound("click", soundEnabled);
                          if (activeGame === "toan") startMathGame();
                          else if (activeGame === "tiengviet") startTiengVietGame();
                          else if (activeGame === "khoahoc") startScienceGame();
                          else if (activeGame === "lichsu") startHistoryRacingGame();
                          else if (activeGame === "tienganh") startEnglishGame();
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-5 py-2 rounded-xl text-xs cursor-pointer shadow"
                      >
                        Chơi Lại Trận
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* VIEW 4: LEADERBOARD HIGHSCORES */}
        {activePage === "leaderboard" && (
          <div className="space-y-6 animate-gentle">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800">Cao Thủ Ôn Tập Học Đường Tuần Này</h2>
              <p className="text-slate-500 text-xs">Cùng vươn tầm thành quả tự học rực rỡ học kì này nhé các con!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Top Podium block */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-6">
                <h3 className="font-extrabold text-slate-700 text-xs text-center uppercase tracking-wide">Ngôi vương cao thủ tranh dũng</h3>

                <div className="flex justify-around items-end pt-12 pb-6 relative min-h-[160px]">
                  {/* Rank 2 */}
                  <div className="flex flex-col items-center space-y-1">
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50" alt="avatar" />
                    <div className="bg-slate-50 border border-slate-200 text-slate-800 font-extrabold px-3 py-1 rounded-t-xl text-center w-16 shadow-xs text-[10px]">
                      <span>#2</span>
                      <p className="truncate font-black">H. Anh</p>
                      <p className="text-blue-600 text-[9px]">1,420đ</p>
                    </div>
                  </div>

                  {/* Rank 1 */}
                  <div className="flex flex-col items-center space-y-1 transform -translate-y-3">
                    <span className="text-sm select-none animate-bounce">👑</span>
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Lily" className="w-14 h-14 rounded-full border-2 border-yellow-400 bg-amber-50 shadow-md" alt="avatar" />
                    <div className="bg-yellow-50 border border-yellow-300 text-slate-900 font-black px-3 py-1.5 rounded-t-xl text-center w-20 shadow-sm text-[11px]">
                      <span className="text-yellow-700 text-[10px]">#1</span>
                      <p className="truncate font-black">Bảo Nam</p>
                      <p className="text-amber-600 text-[9px]">1,680đ</p>
                    </div>
                  </div>

                  {/* Rank 3 */}
                  <div className="flex flex-col items-center space-y-1">
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Jack" className="w-10 h-10 rounded-full border border-orange-300 bg-slate-50" alt="avatar" />
                    <div className="bg-orange-50 border border-orange-200 text-slate-800 font-extrabold px-3 py-1 rounded-t-xl text-center w-16 shadow-xs text-[10px]">
                      <span>#3</span>
                      <p className="truncate font-black">Đ. Kiên</p>
                      <p className="text-blue-600 text-[9px]">1,350đ</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-center text-[10px] font-bold text-slate-600 leading-relaxed">
                  🎁 Trọn gói huy chương thám tử tri thức sẽ tự gửi tặng địa chỉ bưu điện các bạn Top 3 tổng kết tối Chủ Nhật!
                </div>
              </div>

              {/* Table listings */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm mb-4">Danh sách tuyển tập thứ bậc:</h3>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-indigo-50 text-[10px] text-slate-400 uppercase font-black">
                        <th className="py-2.5 px-3">Hạng</th>
                        <th className="py-2.5 px-3">Tên bạn học sinh</th>
                        <th className="py-2.5 px-3 text-center">Yêu thích môn</th>
                        <th className="py-2.5 px-3 text-right">Tổng thành tích</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50 font-extrabold text-slate-700">
                      {defaultLeaderboardData.map((user, index) => {
                        const isUserMe = user.name === "Học Sinh (Bạn)";
                        return (
                          <tr key={index} className={`hover:bg-indigo-50/45 transition-colors ${isUserMe ? "bg-indigo-50/60" : ""}`}>
                            <td className="py-3 px-3 font-black text-slate-800">
                              {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `#${user.rank}`}
                            </td>
                            <td className="py-3 px-3 flex items-center space-x-2">
                              <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user.avatarSeed}`} className="w-7 h-7 rounded-full bg-slate-100" alt="avatar" />
                              <span className={isUserMe ? "text-indigo-600 font-extrabold" : ""}>{isUserMe ? "Học Sinh (Bạn)" : user.name}</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                                {user.favorite}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-blue-600 font-black">{(isUserMe ? points : user.points).toLocaleString()}đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 5: QUẢN LÝ HỌC TẬP / DASHBOARD GRAPH */}
        {activePage === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800">Khu vườn Chăm Sóc Sư Phạm Học Đường</h2>
              <p className="text-slate-500 text-xs">Mọi biểu số ghi nhận bài thi, giờ học toán lướt cụ thể hằng ngày cập nhật tự động cho phụ huynh.</p>
            </div>

            {/* simple layout boards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center space-x-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Giờ rèn lượng</p>
                  <h4 className="font-black text-slate-800 text-sm md:text-base">4.5 Giờ / Tuần</h4>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center space-x-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Hoàn thành bài</p>
                  <h4 className="font-black text-slate-800 text-sm md:text-base">32 Cấu trúc</h4>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center space-x-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Chuỗi ngày</p>
                  <h4 className="font-black text-slate-800 text-sm md:text-base">5 Ngày liên hồi</h4>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center space-x-3">
                <span className="text-2xl">🌠</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Vị trí khối lớp</p>
                  <h4 className="font-black text-slate-800 text-sm md:text-base">Thứ #5 chung cuộc</h4>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Graphic charts */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                <h3 className="font-extrabold text-slate-800 text-sm">Biểu phổ điểm thi đua các khối môn học:</h3>
                
                <div className="space-y-4 font-bold text-xs">
                  {Object.entries(overallGameScores).map(([sub, score], i) => {
                    const barColor = i === 0 ? "bg-red-500" : i === 1 ? "bg-amber-500" : i === 2 ? "bg-green-500" : i === 3 ? "bg-blue-500" : "bg-purple-500";
                    return (
                      <div key={sub} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">{sub}</span>
                          <span className="text-slate-900">{score} điểm</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className={`${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${score}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedbacks insights */}
              <div className="bg-white p-6 rounded-3xl border border-indigo-50/50 space-y-4">
                <h3 className="font-extrabold text-slate-800 text-sm">Lời nhắc từ Cô Hà & Robot Trí Tuệ:</h3>

                <div className="space-y-3 font-bold text-[11px] leading-relaxed">
                  
                  <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-2">
                    <span className="text-red-500 text-md shrink-0">⚠️</span>
                    <div className="text-red-900">
                      <p className="font-black">Điểm cần chú ý: Spelling</p>
                      <p className="text-slate-500 font-normal mt-1">Con còn hơi chậm trong ghép từ vựng Tiếng Anh. Hãy tương tác game spelling 10 phút đêm nay.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-100 rounded-2xl flex items-start space-x-2">
                    <span className="text-green-500 text-md shrink-0">✅</span>
                    <div className="text-green-900">
                      <p className="font-black">Vượt trội: Tiếng Việt dạt dào</p>
                      <p className="text-slate-500 font-normal mt-1">Cấu trúc ghép câu vô cùng rành mạch và trôi chảy. Nối dài nấc b thang Top 5% bạn học sinh.</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 6: TRỢ LÝ VIẾT TAY AI (CORRECTING HOMEWORK) */}
        {activePage === "handwriting" && (
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-800">Trợ Lý Nhận Biểu Chữ Đẹp Trí Tuệ AI</h2>
                <p className="text-slate-500 text-xs">Mở Camera chụp sát vở ô ly tập viết tập làm văn để cô Hà AI chấm định chuẩn xác!</p>
              </div>
              <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center animate-gentle gap-1">
                <i className="fa-solid fa-wand-magic-sparkles animate-pulse" /> Sư phạm Gemini 3.5 Flash
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: upload controls */}
              <div className="lg:col-span-5 space-y-4">
                
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase text-orange-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <i className="fa-solid fa-camera"></i>
                    <span>Tải hình bài của con</span>
                  </h3>

                  {/* drops & display box */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50 rounded-2xl p-6 text-center transition cursor-pointer relative"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                    />

                    {isCameraActive ? (
                      <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex flex-col justify-end p-2 border border-slate-800">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
                        <div className="relative z-10 flex justify-center space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); captureFrame(); }} 
                            className="bg-orange-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs cursor-pointer shadow hover:bg-orange-600"
                          >
                            Bấm Chụp
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); stopWebcam(); }} 
                            className="bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : imageUrl ? (
                      <div className="relative rounded-xl overflow-hidden max-h-48 flex justify-center items-center bg-white border border-slate-100">
                        <img src={imageUrl} className="max-h-48 object-contain" alt="handwriting" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedBase64(null);
                            setImageUrl("");
                            setAiResponse(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:scale-105 transition cursor-pointer shadow-md"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto text-slate-400">
                          <i className="fa-solid fa-cloud-arrow-up text-xl" />
                        </div>
                        <p className="text-xs font-extrabold text-slate-600">Chọn ảnh bài Tập Làm Văn / Chụp ảnh tập</p>
                        <p className="text-[10px] text-slate-400">Chấp nhận PNG, JPG dung lượng dưới 10MB</p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={startWebcam}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 rounded-xl text-xs flex justify-center items-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                    >
                      <i className="fa-solid fa-video text-slate-400" />
                      <span>Sử dụng Webcam Web</span>
                    </button>
                  </div>

                  {/* demo links bar */}
                  <div className="relative flex items-center py-2 text-[10px] uppercase font-bold text-slate-400">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="mx-3 shrink-0">Không có ảnh ? Nhấp mẫu nhanh</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <button 
                      onClick={() => useSampleImage(1)} 
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition cursor-pointer"
                    >
                      <p className="text-xs font-black text-emerald-800">Mẫu 1: Đẹp chuẩn ô ly</p>
                      <p className="text-[10px] text-emerald-600 mt-1">Con viết tròn trịa đầy ý tứ.</p>
                    </button>
                    <button 
                      onClick={() => useSampleImage(2)} 
                      className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition cursor-pointer"
                    >
                      <p className="text-xs font-black text-rose-800">Mẫu 2: Nguệch ngoạc lỗi sai</p>
                      <p className="text-[10px] text-rose-600 mt-1">Sai khoảng cách chính tả.</p>
                    </button>
                  </div>

                  <button 
                    onClick={submitHandwritingAnalysis}
                    disabled={!uploadedBase64 || isAnalyzing}
                    className="w-full bg-orange-500 hover:bg-orange-600 font-black py-3 rounded-2xl text-xs text-white border-b-4 border-orange-700 transition cursor-pointer disabled:opacity-55 shadow"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center justify-center gap-1">
                        <i className="fa-solid fa-circle-notch animate-spin" /> Cô Hà đang đọc chấm con nhé...
                      </span>
                    ) : (
                      "BẮT ĐẦU CHẤM ĐIỂM SƯ PHẠM"
                    )}
                  </button>

                </div>
              </div>

              {/* Right Column: results feedbacks */}
              <div className="lg:col-span-7 flex flex-col">
                
                {/* waiting mode */}
                {!imageUrl && !isAnalyzing && !aiResponse && (
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 flex flex-col items-center justify-center my-auto min-h-[350px]">
                    <span className="text-4xl animate-gentle block">✍️</span>
                    <h4 className="font-extrabold text-slate-700 text-sm mt-3">Đang Chờ Bài Vở Học Cụ</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">Lắp ảnh vở nghiêng thẳng rơ camera nới lướt giáo dục Cô Hà nhàn rỗi chấm ngay tức khắc.</p>
                  </div>
                )}

                {/* Loading state spinner */}
                {isAnalyzing && (
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 flex flex-col items-center justify-center my-auto min-h-[350px] space-y-3">
                    <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-xl animate-spin mx-auto">
                      <i className="fa-solid fa-spinner" />
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Cô Hà Đang Đọc Soi Nét Chữ...</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">Hệ thống phân tích ô ly chữ nghiêng và liên kết văn phong tiếng Việt chuẩn chỉnh tiểu học khoa học.</p>
                  </div>
                )}

                {/* final AI result cards display */}
                {aiResponse && !isAnalyzing && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                    <div className="bg-orange-50/50 p-4 rounded-3xl border border-orange-100 flex justify-between items-center flex-wrap gap-3">
                      <div className="flex items-center space-x-3">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=TeacherAI" className="w-12 h-12 bg-orange-100 rounded-xl" alt="AI teacher" />
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">Cô Hà (Mascot Giáo viên Tiểu học)</h4>
                          <span className="text-[10px] text-slate-500">Học viện kỹ xảo trực quan KidStudy</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">ĐIỂM CHỮ viết:</span>
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md">
                          {aiResponse.score}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <h5 className="font-black text-slate-800 flex items-center gap-1.5 mb-1.5">
                          <i className="fa-solid fa-feather text-blue-500"></i> Nét Chữ Trình Bày
                        </h5>
                        <p className="text-slate-500 leading-relaxed font-semibold">{aiResponse.legibility_comment}</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold">
                        <h5 className="font-black text-slate-800 flex items-center gap-1.5 mb-1.5">
                          <i className="fa-solid fa-paragraph text-green-500"></i> Bố Cục Thơ Văn
                        </h5>
                        <p className="text-slate-500 leading-relaxed font-semibold">{aiResponse.structure_comment}</p>
                      </div>
                    </div>

                    {/* error detail panels */}
                    <div className="space-y-2 text-xs">
                      <h4 className="font-extrabold text-slate-800 mb-1 leading-relaxed text-xs">Các điểm con cần cải tạo nâng nét chính tả:</h4>
                      {aiResponse.errors?.map((err: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-100 p-2.5 rounded-xl font-bold">
                          <i className="fa-solid fa-circle-exclamation text-red-500 text-xs shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                      {(!aiResponse.errors || aiResponse.errors.length === 0) && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl flex items-center gap-2 font-bold">
                          <i className="fa-solid fa-circle-check text-green-500 shrink-0" />
                          <span>Bài văn nét chữ sạch đẹp hoàn chỉnh không có lỗi vặt nào!</span>
                        </div>
                      )}
                    </div>

                    {/* heartwarming quote */}
                    <div className="p-4 bg-yellow-50 border border-yellow-200/50 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
                      <span className="text-2xl animate-kids-bounce">💝</span>
                      <div className="text-slate-600 font-bold">
                        <p className="font-black text-yellow-800 mb-0.5">Lời nhắn ấm mát Cô tặng học sinh:</p>
                        <p className="italic font-normal">{aiResponse.encouragement}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          playSound("click", soundEnabled);
                          triggerToast("Đã lưu điểm bài vở vào bảng quản lý của ba mẹ!");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                      >
                        Lưu vào Dashboard
                      </button>
                    </div>

                  </div>
                )}

                {/* DB status banner & diagnostics */}
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          !dbConfigured ? 'bg-amber-400' :
                          !dbTablesReady ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                        }`} />
                        <span className="text-slate-600">
                          Kết nối Supabase:{' '}
                          <strong className={
                            !dbConfigured ? 'text-amber-600' :
                            !dbTablesReady ? 'text-orange-600' : 'text-emerald-600'
                          }>
                            {!dbConfigured ? 'Giả lập Offline' :
                             !dbTablesReady ? 'Thiếu Bảng Dữ Liệu ⚠️' : 'Kết nối Live và Sẵn sàng! ✅'}
                          </strong>
                        </span>
                      </div>
                      
                      {dbConfigured && (
                        <button
                          onClick={() => {
                            playSound("click", soundEnabled);
                            setShowSqlInstructions(!showSqlInstructions);
                          }}
                          className="text-[10px] cursor-pointer text-indigo-600 hover:text-indigo-800 underline uppercase tracking-wider font-extrabold"
                        >
                          {showSqlInstructions ? 'Ẩn Hướng Dẫn' : 'Xem Mã SQL Bảng'}
                        </button>
                      )}
                    </div>

                    {!dbConfigured && (
                      <p className="text-[10px] text-slate-400 mt-1.5 font-normal">
                        Ứng dụng của bạn chưa được thiết lập biến môi trường SUPABASE_URL hoặc API Keys.
                      </p>
                    )}

                    {dbConfigured && !dbTablesReady && (
                      <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 p-2.5 rounded-xl font-medium">
                        <p className="font-extrabold mb-1">⚠️ LỖI KHỞI TẠO BẢNG:</p>
                        <p className="text-slate-500 leading-relaxed font-normal mb-2">
                          Bạn đã thiết lập URL và API Keys, nhưng các bảng học thức chưa được tạo trên Supabase DB. Hãy click nút "Xem Mã SQL Bảng", copy câu lệnh và dán vào phần SQL Editor của website Supabase của bạn!
                        </p>
                      </div>
                    )}

                    {dbConfigured && dbTablesReady && (
                      <p className="text-[10px] text-slate-400 mt-1.5 font-normal leading-relaxed">
                        🎉 Tuyệt vời! Cấu trúc đã được so khớp và đồng bộ trực tiếp. Mọi điểm thưởng trò chơi, điểm nhận định nét bút của Cô Hà AI đều được ghi vĩnh viễn vào Supabase PostgreSQL của bạn. Chỉ hiển thị dữ liệu thực truyền từ đám mây.
                      </p>
                    )}
                  </div>

                  {/* SQL Instruction Panel */}
                  {showSqlInstructions && dbConfigured && (
                    <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 border border-slate-800 font-mono text-[10px] space-y-2 max-h-[350px] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="text-indigo-400 font-extrabold">CÂU LỆNH SQL KHỞI TẠO BẢNG</span>
                        <button
                          onClick={() => {
                            const sqlText = `-- 1. Tạo bảng cấu hình trạng thái học sinh (điểm số học thức)
CREATE TABLE IF NOT EXISTS kidstudy_student_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng nhật ký ghi điểm trò chơi
CREATE TABLE IF NOT EXISTS kidstudy_score_logs (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    points INT NOT NULL,
    accuracy INT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo bảng lịch sử chấm điểm nét nét viết tay của Cô Hà AI
CREATE TABLE IF NOT EXISTS kidstudy_handwriting (
    id TEXT PRIMARY KEY,
    score NUMERIC NOT NULL,
    legibility_comment TEXT,
    structure_comment TEXT,
    errors JSONB DEFAULT '[]'::jsonb,
    encouragement TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật quyền truy cập chung
ALTER TABLE kidstudy_student_state FORCE ROW LEVEL SECURITY;
ALTER TABLE kidstudy_score_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE kidstudy_handwriting FORCE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON kidstudy_student_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON kidstudy_student_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON kidstudy_student_state FOR UPDATE USING (true);

CREATE POLICY "Allow public select score" ON kidstudy_score_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert score" ON kidstudy_score_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select hw" ON kidstudy_handwriting FOR SELECT USING (true);
CREATE POLICY "Allow public insert hw" ON kidstudy_handwriting FOR INSERT WITH CHECK (true);`;
                            navigator.clipboard.writeText(sqlText);
                            triggerToast("Đã sao chép mã SQL vào khay nhớ tạm!");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-[9px] cursor-pointer font-bold transition"
                        >
                          <i className="fa-regular fa-copy mr-1 text-[9px]" /> Copy SQL
                        </button>
                      </div>
                      <pre className="text-slate-300 leading-normal select-all">
{`-- 1. Tạo bảng lưu trữ trạng thái học tập
CREATE TABLE IF NOT EXISTS kidstudy_student_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng nhật ký điểm ôn tập
CREATE TABLE IF NOT EXISTS kidstudy_score_logs (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    points INT NOT NULL,
    accuracy INT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo lịch sử chấm nét bút của Cô Hà AI
CREATE TABLE IF NOT EXISTS kidstudy_handwriting (
    id TEXT PRIMARY KEY,
    score NUMERIC NOT NULL,
    legibility_comment TEXT,
    structure_comment TEXT,
    errors JSONB DEFAULT '[]'::jsonb,
    encouragement TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                      </pre>
                    </div>
                  )}
                </div>

                {/* History list cards dynamic */}
                {handwritingHistory.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mt-4">
                    <h4 className="font-extrabold text-slate-800 text-xs mb-3 flex items-center space-x-1.5 uppercase tracking-wide">
                      <i className="fa-solid fa-clock-rotate-left text-orange-500" />
                      <span>Lưu trữ nét bút (Từ Supabase DB)</span>
                    </h4>
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {handwritingHistory.map((hw: any, idx) => (
                        <div key={hw.id || idx} className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs transition">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden shrink-0 border border-slate-300">
                              <img 
                                src={hw.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${hw.id || idx}`} 
                                className="w-full h-full object-cover" 
                                alt="review" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-black text-slate-800 text-xs">Điểm văn: {hw.score}/10</span>
                                <span className="text-[9px] text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded-md">Cô Hà</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{hw.legibility_comment}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              playSound("click", soundEnabled);
                              setAiResponse(hw);
                              setImageUrl(hw.image_url || "");
                              triggerToast("Đã nạp lại nét bút lịch sử này!");
                            }} 
                            className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl border border-indigo-100 transition whitespace-nowrap cursor-pointer"
                          >
                            Xem Chi Tiết
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>

            </div>
          </div>
        )}

        {/* VIEW 7: ADMINISTRATIVE TECH PORTAL */}
        {activePage === "admin" && (
          <div className="space-y-6 animate-gentle">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800">Cấu Hình Lập Trình Và Quản Trị Hệ Thống</h2>
              <p className="text-slate-500 text-xs font-semibold uppercase text-purple-600">Tuyệt đối chỉ giành cho Giáo viên chủ nhiệm & Admin!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-slate-300 font-mono">
              
              {/* Firestore layout representation */}
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3">
                <span className="text-yellow-400 font-black block"><i className="fa-solid fa-database" /> FIRESTORE SCHEMA DB</span>
                
                <div className="space-y-2 text-[11px] leading-relaxed select-all">
                  <span className="text-slate-500 block">{"// Collection: học sinh"}</span>
                  <div className="pl-2">
                    <p>"users": {"{"}</p>
                    <p className="pl-3">"student_08": {"{"}</p>
                    <p className="pl-5">"name": "admin",</p>
                    <p className="pl-5">"grade_block": 3,</p>
                    <p className="pl-5">"score_points": {points},</p>
                    <p className="pl-5">"is_ban_control": false</p>
                    <p className="pl-3">{"}"}</p>
                    <p className="pl-1">{"}"}</p>
                  </div>

                  <span className="text-slate-500 block mt-2">{"// Collection: bài tập trắc nghiệm"}</span>
                  <div className="pl-2">
                    <p>"quizzes": {"{"}</p>
                    <p className="pl-3">"maths_q1": {"{"}</p>
                    <p className="pl-5">"expr": "8 x 7 = ?",</p>
                    <p className="pl-5">"ans": 56</p>
                    <p className="pl-3">{"}"}</p>
                    <p className="pl-1">{"}"}</p>
                  </div>
                </div>
              </div>

              {/* simulated logs dashboard table */}
              <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-5 flex flex-col justify-between border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-emerald-400 font-black"><i className="fa-solid fa-terminal" /> CONSOLE logs realtime</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ĐÃ LIÊN KẾT CDN
                  </span>
                </div>

                <div className="bg-black/60 border border-slate-800 rounded-2xl p-3 h-44 overflow-y-auto space-y-1.5 text-[11px] text-slate-300">
                  {adminLogs.map((log, i) => (
                    <p key={i} className="leading-relaxed">{log}</p>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 text-[10px] text-slate-500">
                  <button 
                    onClick={() => {
                      playSound("click", soundEnabled);
                      setAdminLogs([]);
                      triggerToast("Đã dọn dẹp nhật ký lập trình.");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer transition font-bold"
                  >
                    Xóa nhật ký log
                  </button>
                  <span>Chỉ số ping mạng: 14ms cực chuẩn</span>
                </div>
              </div>

            </div>

            {/* backups setting */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
              <h3 className="font-extrabold text-slate-850 text-md">Bảo mật vận trắc thi tuyển & Đồng Bộ Đám Mây</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
                
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                  <p className="text-slate-800 font-black">1. Lưu trữ đồng bộ tuần hoàn</p>
                  <p className="text-[10px] text-slate-400 font-normal leading-relaxed">Tự động truyền dữ liệu thành tích học và chữ viết bé về máy chủ trung tâm mỗi 24 giờ.</p>
                  <button 
                    onClick={() => {
                      playSound("click", soundEnabled);
                      addLog("ĐANG TIẾN HÀNH SAO LƯU SAO CHÉP CHUNG KHỐI...");
                      setTimeout(() => addLog("SUCCESS: Backup hoàn tất rạng rỡ."), 1000);
                      triggerToast("Sao lưu tiến trình hoàn lưu thành công!");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg transition mt-2 cursor-pointer shadow-sm text-[10px]"
                  >
                    Tiến hành Sao lưu ngay
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                  <p className="text-slate-800 font-black">2. Giới hạn giờ chơi (Sức khỏe mắt)</p>
                  <p className="text-[10px] text-slate-400 font-normal leading-relaxed">Khóa ứng dụng tự động khi học sinh ôn tập liên tục vượt hơn 60 phút mỗi ca học.</p>
                  <div className="flex items-center space-x-2 pt-1.5">
                    <input 
                      type="checkbox" 
                      id="lim"
                      checked={timeLimitEnabled}
                      onChange={() => {
                        playSound("click", soundEnabled);
                        setTimeLimitEnabled(!timeLimitEnabled);
                        addLog(`Đã tủy chỉnh giới hạn giờ tự động: ${!timeLimitEnabled}`);
                        triggerToast(`Đã điều phối chế độ hạn giờ chơi.`);
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="lim" className="text-[10px] font-bold text-slate-600 cursor-pointer">Bật giới hạn 60 phút</label>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                  <p className="text-slate-800 font-black">3. Chứng chỉ Bảo Mật Mã hóa</p>
                  <p className="text-[10px] text-slate-400 font-normal leading-relaxed">Bảo vệ mọi thông tin tài liệu và nét chữ qua giao thức an toàn SSL SHA-256 mã hóa đầu cuối.</p>
                  <span className="inline-block bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Kích hoạt an toàn</span>
                </div>

                {/* Secure links division */}
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl space-y-2 text-xs">
                  <p className="text-orange-700 font-black flex items-center gap-1.5"><i className="fa-solid fa-share-nodes" /> 4. Chia sẻ link cho bé học sinh</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-normal">Gửi link sạch này cho con ôn luyện. Chế độ kỹ thuật hệ thống và quản trị viên của ba mẹ sẽ bị tắt khóa chặt chẽ.</p>
                  <button 
                    onClick={handleCopyLink}
                    className="w-full bg-orange-500 hover:bg-orange-600 font-black py-2 rounded-xl text-white mt-1.5 cursor-pointer text-[10px] shadow-sm uppercase tracking-wider"
                  >
                    COPY LINK HỌC SINH
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER GENERAL SECTION */}
      <footer className="bg-slate-800 text-slate-400 py-6 mt-12 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 text-center md:flex md:justify-between md:items-center space-y-4 md:space-y-0 text-xs font-bold text-slate-400">
          <div>
            <p className="font-extrabold text-slate-200">KIDSTUDY © 2026</p>
            <p className="text-[10px] mt-1 text-slate-500">Dự án Web/App hỗ trợ ôn luyện và tự lực học tập thông minh bậc học tiểu học.</p>
          </div>
          <div className="flex justify-center flex-wrap gap-4 text-[10px]">
            <a href="#" className="hover:text-white transition">Chính sách bảo mật trẻ em</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition">Hỗ trợ cha mẹ sư phạm</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition">Đóng góp ý kiến giáo khoa</a>
          </div>
        </div>
      </footer>

      {/* FLOATING SYSTEM TOAST */}
      {toastVisible && (
        <div className="fixed bottom-5 right-5 bg-slate-900 border border-slate-800 text-white font-extrabold text-xs md:text-sm px-4.5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 animate-kids-bounce">
          <i className="fa-solid fa-circle-check text-green-400"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ADMINISTRATIVE SECURITY SIGN-IN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-gentle">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-indigo-50 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-indigo-500"></i>
                <span>Xác thực Quản trị KidStudy</span>
              </h3>
              <button 
                onClick={() => { playSound("click", soundEnabled); setShowLoginModal(false); }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-black uppercase inline-block">Mẹo: sử dụng tài khoản admin / admin</span>
              
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 text-[10px] block">Tên Tài Khoản:</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập (admin)..."
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-3 py-2 text-slate-800 font-extrabold focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 text-[10px] block">Mật Khẩu:</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu kiểm chuẩn (admin)..."
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-indigo-500 transition"
                  required
                />
              </div>

              {loginError && (
                <p className="text-red-500 font-extrabold text-[10px] bg-red-50 p-2 rounded-xl border border-red-100 flex items-center gap-1">
                  <i className="fa-solid fa-circle-exclamation shrink-0" />
                  <span>{loginError}</span>
                </p>
              )}

              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow cursor-pointer transition border-b-4 border-indigo-700"
              >
                Xác thực đăng nhập admin
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
