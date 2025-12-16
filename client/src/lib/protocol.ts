export type RoomCode = string;

export type QuestionType = 'multiple' | 'truefalse' | 'type';

export type QuizChoice = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  choices: QuizChoice[];
  correctChoiceId: string;
  correctAnswer?: string; // For 'type' questions
  timeLimitMs: number;
};

export type Quiz = {
  id: string;
  title: string;
  questions: QuizQuestion[];
};

export type RoomPhase = 'lobby' | 'question' | 'results' | 'ended';

export type RoomState = {
  roomCode: RoomCode;
  phase: RoomPhase;
  quizTitle?: string;
  questionIndex?: number;
  totalQuestions?: number;
  autoAdvance?: boolean;
  isPaused?: boolean;
  answeredCount?: number;
  totalPlayers?: number;
  question?: { id: string; type: QuestionType; text: string; choices: QuizChoice[]; timeLimitMs: number };
  nextQuestion?: { text: string };
  results?: {
    questionId: string;
    questionType: QuestionType;
    correctChoiceId: string;
    correctAnswer?: string;
    answerCounts: Record<string, number>;
    playerCorrect?: boolean;
    pointsEarned?: number;
    streak?: number;
    streakBonus?: number;
  };
  players: Array<{ nickname: string; score: number; rankChange?: number; streak?: number }>;
};
