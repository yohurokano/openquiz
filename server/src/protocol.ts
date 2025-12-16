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

export type Player = {
  id: string;
  nickname: string;
  score: number;
};

export type ClientToServerEvents = {
  "room:create": (
    payload: { quiz?: Quiz },
    cb: (response: { ok: true; roomCode: RoomCode } | { ok: false; error: string }) => void
  ) => void;

  "room:join": (
    payload: { roomCode: RoomCode; nickname: string },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "host:start": (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "host:reveal": (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "host:next": (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "host:setAutoAdvance": (
    payload: { roomCode: RoomCode; autoAdvance: boolean },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "host:pause": (
    payload: { roomCode: RoomCode; paused: boolean },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "host:skip": (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "player:answer": (
    payload: { roomCode: RoomCode; questionId: string; choiceId?: string; typedAnswer?: string },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
};

export type ServerToClientEvents = {
  "room:state": (payload: {
    roomCode: RoomCode;
    phase: "lobby" | "question" | "results" | "ended";
    quizTitle?: string;
    questionIndex?: number;
    totalQuestions?: number;
    autoAdvance?: boolean;
    isPaused?: boolean;
    answeredCount?: number;
    totalPlayers?: number;
    question?: { id: string; type: QuestionType; text: string; choices: QuizChoice[]; timeLimitMs: number };
    nextQuestion?: { text: string }; // Preview for host
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
  }) => void;

  "room:error": (payload: { message: string }) => void;

  "timer:tick": (payload: { timeRemaining: number }) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  roomCode?: RoomCode;
  role?: "host" | "player";
  playerId?: string;
};
