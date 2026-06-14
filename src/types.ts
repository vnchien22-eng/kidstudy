export interface ScoreLog {
  id: string;
  game: string;
  points: number;
  accuracy: number;
  date: string;
}

export interface Student {
  name: string;
  avatarSeed: string;
  points: number;
  level: string;
  streak: number;
  completedTasks: number;
  studyTimeHours: number;
}

export interface SyllabusItem {
  title: string;
  desc: string;
}

export interface HandwritingResult {
  score: number;
  legibility_comment: string;
  structure_comment: string;
  errors: string[];
  encouragement: string;
}

export interface MathGameState {
  timer: number;
  score: number;
  numCorrect: number;
  numWrong: number;
  currentQuestion: string;
  currentAnswer: number;
  choices: number[];
}

export interface TiengVietGameState {
  correctSentence: string;
  correctWords: string[];
  selectedWords: string[];
  shuffledWords: string[];
}

export interface KhoaHocQuestion {
  q: string;
  c: string[];
  a: number; // index of correct answer
}

export interface KhoaHocGameState {
  index: number;
  questions: KhoaHocQuestion[];
  score: number;
}

export interface LichSuQuestion {
  q: string;
  c: string[];
  a: number;
}

export interface LichSuGameState {
  index: number;
  score: number;
  playerPos: number;
  opponentPos: number;
  questions: LichSuQuestion[];
}

export interface TienganhQuestion {
  word: string;
  hint: string;
  emoji: string;
  pool: string[];
}

export interface TiengAnhGameState {
  currentQuestionIndex: number;
  questions: TienganhQuestion[];
  enteredLetters: string[];
  points: number;
}
