import http from "node:http";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { Server, type Socket } from "socket.io";
import { z } from "zod";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from "./protocol";
import { addPlayer, createRoom, getRoom, publicPlayers, removePlayer, removeRoom } from "./state";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_URL ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const ALLOWED_ORIGINS = new Set<string>([
  CLIENT_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://openquiz-sigma.vercel.app",
  "https://openquiz.xyz",
  "https://www.openquiz.xyz"
]);

const app = express();
app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      return cb(null, ALLOWED_ORIGINS.has(origin));
    },
    credentials: true
  })
);
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return cb(null, true);
        return cb(null, ALLOWED_ORIGINS.has(origin));
      },
      credentials: true
    }
  }
);

io.engine.on("connection_error", (err: { code?: string; message?: string }) => {
  process.stdout.write(
    `Socket.IO connection_error: code=${err.code ?? ""} message=${err.message ?? ""}\n`
  );
});

function emitRoomState(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;

  const quizTitle = room.quiz?.title;
  const question = room.quiz?.questions?.[room.questionIndex];
  const questionIndex = room.questionIndex;
  const totalQuestions = room.quiz?.questions?.length ?? 0;

  // Build base results object
  let baseResults:
    | {
        questionId: string;
        questionType: "multiple" | "truefalse" | "type";
        correctChoiceId: string;
        correctAnswer?: string;
        answerCounts: Record<string, number>;
      }
    | undefined;

  const revealed = room.phase === "results" && room.quiz && room.revealedQuestionId
    ? room.quiz.questions.find((q) => q.id === room.revealedQuestionId)
    : undefined;
  const answers = room.revealedQuestionId 
    ? room.answersByQuestionId.get(room.revealedQuestionId) 
    : undefined;

  if (revealed && answers) {
    const counts: Record<string, number> = {};
    for (const a of answers.values()) {
      const key = a.choiceId || a.typedAnswer || "_blank";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    baseResults = {
      questionId: revealed.id,
      questionType: revealed.type || "multiple",
      correctChoiceId: revealed.correctChoiceId,
      correctAnswer: revealed.correctAnswer,
      answerCounts: counts
    };
  }

  // Count how many players have answered current question
  const currentAnswers = question ? room.answersByQuestionId.get(question.id) : undefined;
  const answeredCount = currentAnswers?.size ?? 0;
  const totalPlayers = room.players.size;

  // Get next question preview for host
  const nextQuestion = room.quiz?.questions?.[room.questionIndex + 1];

  // Build players array with rank changes and streaks
  const sortedPlayers = publicPlayers(room);
  const playersWithMeta = sortedPlayers.map((p, idx) => {
    const socketId = Array.from(room.players.entries()).find(([, pl]) => pl.nickname === p.nickname)?.[0];
    const prevRank = socketId ? room.previousRanks.get(socketId) : undefined;
    const streak = socketId ? room.playerStreaks.get(socketId) ?? 0 : 0;
    const rankChange = prevRank !== undefined ? prevRank - (idx + 1) : 0;
    return { ...p, rankChange, streak };
  });

  const baseState = {
    roomCode,
    phase: room.phase,
    quizTitle,
    questionIndex,
    totalQuestions,
    autoAdvance: room.autoAdvance,
    isPaused: room.isPaused,
    answeredCount,
    totalPlayers,
    question: question
      ? {
          id: question.id,
          type: question.type || "multiple",
          text: question.text,
          choices: question.choices,
          timeLimitMs: question.timeLimitMs
        }
      : undefined,
    players: playersWithMeta
  };

  // Send to host (no personalized results needed)
  io.to(room.hostSocketId).emit("room:state", {
    ...baseState,
    results: baseResults
  });

  // Send personalized results to each player
  for (const [socketId, player] of room.players.entries()) {
    let playerResults = baseResults ? { ...baseResults } : undefined;
    
    // Add player-specific result info
    if (playerResults && revealed && answers) {
      const playerAnswer = answers.get(socketId);
      if (playerAnswer) {
        let isCorrect = false;
        if (revealed.type === "type") {
          const correct = (revealed.correctAnswer || "").toLowerCase().trim();
          const given = (playerAnswer.typedAnswer || "").toLowerCase().trim();
          isCorrect = correct === given;
        } else {
          isCorrect = playerAnswer.choiceId === revealed.correctChoiceId;
        }
        
        // Calculate points earned (same logic as revealAndScore)
        let pointsEarned = 0;
        if (isCorrect) {
          const startedAt = room.questionStartedAt ?? Date.now();
          const elapsed = Math.max(0, playerAnswer.answeredAt - startedAt);
          const ratio = Math.min(1, elapsed / revealed.timeLimitMs);
          pointsEarned = Math.round(300 + (1 - ratio) * 700);
        }
        
        (playerResults as any).playerCorrect = isCorrect;
        (playerResults as any).pointsEarned = pointsEarned;
      } else {
        // Player didn't answer
        (playerResults as any).playerCorrect = false;
        (playerResults as any).pointsEarned = 0;
      }
    }

    io.to(socketId).emit("room:state", {
      ...baseState,
      results: playerResults
    });
  }
}

function mustBeHost(socketId: string, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return { ok: false as const, error: "Room not found" };
  if (room.hostSocketId !== socketId) return { ok: false as const, error: "Not host" };
  return { ok: true as const, room };
}

function revealAndScore(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room || !room.quiz) return;

  const question = room.quiz.questions[room.questionIndex];
  if (!question) return;

  // Save current ranks before scoring
  const sortedBefore = publicPlayers(room);
  sortedBefore.forEach((p, idx) => {
    const socketId = Array.from(room.players.entries()).find(([, pl]) => pl.nickname === p.nickname)?.[0];
    if (socketId) room.previousRanks.set(socketId, idx + 1);
  });

  const startedAt = room.questionStartedAt ?? Date.now();
  const answers = room.answersByQuestionId.get(question.id);
  
  // Track who answered correctly for streaks
  const correctPlayers = new Set<string>();
  
  if (answers) {
    for (const [playerSocketId, a] of answers.entries()) {
      const player = room.players.get(playerSocketId);
      if (!player) continue;

      let isCorrect = false;
      if (question.type === "type") {
        const correct = (question.correctAnswer || "").toLowerCase().trim();
        const given = (a.typedAnswer || "").toLowerCase().trim();
        isCorrect = correct === given;
      } else {
        isCorrect = a.choiceId === question.correctChoiceId;
      }

      if (isCorrect) {
        correctPlayers.add(playerSocketId);
        
        // Update streak
        const currentStreak = (room.playerStreaks.get(playerSocketId) ?? 0) + 1;
        room.playerStreaks.set(playerSocketId, currentStreak);
        
        // Calculate base points (speed bonus)
        const elapsed = Math.max(0, a.answeredAt - startedAt);
        const ratio = Math.min(1, elapsed / question.timeLimitMs);
        const basePoints = Math.round(300 + (1 - ratio) * 700); // 1000..300
        
        // Streak bonus: +100 per streak level (max +500)
        const streakBonus = Math.min(currentStreak - 1, 5) * 100;
        
        player.score += basePoints + streakBonus;
      }
    }
  }
  
  // Reset streaks for players who got it wrong or didn't answer
  for (const socketId of room.players.keys()) {
    if (!correctPlayers.has(socketId)) {
      room.playerStreaks.set(socketId, 0);
    }
  }

  room.phase = "results";
  room.revealedQuestionId = question.id;

  // Auto-advance to next question if enabled
  if (room.autoAdvance) {
    setTimeout(() => {
      const currentRoom = getRoom(roomCode);
      if (currentRoom && currentRoom.phase === "results") {
        currentRoom.questionIndex += 1;
        startQuestion(roomCode);
        emitRoomState(roomCode);
      }
    }, room.autoAdvanceDelay);
  }
}

function clearRoomTimer(room: { timerIntervalId?: ReturnType<typeof setInterval> }) {
  if (room.timerIntervalId) {
    clearInterval(room.timerIntervalId);
    room.timerIntervalId = undefined;
  }
}

function startQuestion(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room || !room.quiz) return;

  // Clear any existing timer
  clearRoomTimer(room);

  const question = room.quiz.questions[room.questionIndex];
  if (!question) {
    room.phase = "ended";
    return;
  }

  room.phase = "question";
  room.questionStartedAt = Date.now();
  room.revealedQuestionId = undefined;

  // Start countdown timer - emit every second
  const timeLimitMs = question.timeLimitMs;
  
  room.timerIntervalId = setInterval(() => {
    const currentRoom = getRoom(roomCode);
    if (!currentRoom || currentRoom.phase !== "question") {
      clearRoomTimer(room);
      return;
    }

    const elapsed = Date.now() - (currentRoom.questionStartedAt ?? Date.now());
    const remaining = Math.max(0, timeLimitMs - elapsed);

    // Broadcast time remaining
    io.to(roomCode).emit("timer:tick", { timeRemaining: remaining });

    // Auto-reveal when time runs out
    if (remaining <= 0) {
      clearRoomTimer(room);
      revealAndScore(roomCode);
      emitRoomState(roomCode);
    }
  }, 1000);
}

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
  socket.on("room:create", (payload, cb) => {
    try {
      const parsed = z
        .object({
          quiz: z
            .object({
              id: z.string(),
              title: z.string().min(1).max(120),
              questions: z
                .array(
                  z.object({
                    id: z.string(),
                    type: z.enum(["multiple", "truefalse", "type"]).optional().default("multiple"),
                    text: z.string().min(1).max(500),
                    choices: z.array(z.object({ id: z.string(), text: z.string().min(1).max(120) })),
                    correctChoiceId: z.string(),
                    correctAnswer: z.string().optional(),
                    timeLimitMs: z.number().int().min(3000).max(600000)
                  })
                )
                .min(1)
            })
            .optional()
        })
        .parse(payload);

      const room = createRoom(socket.id, parsed.quiz);
      socket.data.role = "host";
      socket.data.roomCode = room.roomCode;
      socket.join(room.roomCode);

      cb({ ok: true, roomCode: room.roomCode });
      emitRoomState(room.roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("room:join", (payload, cb) => {
    try {
      const { roomCode, nickname } = z
        .object({ roomCode: z.string().min(4).max(12), nickname: z.string().min(1).max(24) })
        .parse(payload);

      const room = getRoom(roomCode);
      if (!room) return cb({ ok: false, error: "Room not found" });
      if (room.phase !== "lobby") return cb({ ok: false, error: "Game already started" });

      socket.data.role = "player";
      socket.data.roomCode = roomCode;
      socket.join(roomCode);

      addPlayer(room, socket.id, nickname.trim());

      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("host:start", (payload, cb) => {
    try {
      const { roomCode } = z.object({ roomCode: z.string().min(4).max(12) }).parse(payload);
      const hostCheck = mustBeHost(socket.id, roomCode);
      if (!hostCheck.ok) return cb(hostCheck);
      const room = hostCheck.room;
      if (!room.quiz || room.quiz.questions.length === 0) return cb({ ok: false, error: "No quiz loaded" });

      room.questionIndex = 0;
      startQuestion(roomCode);

      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("host:reveal", (payload, cb) => {
    try {
      const { roomCode } = z.object({ roomCode: z.string().min(4).max(12) }).parse(payload);
      const hostCheck = mustBeHost(socket.id, roomCode);
      if (!hostCheck.ok) return cb(hostCheck);
      const room = hostCheck.room;
      if (room.phase !== "question") return cb({ ok: false, error: "Not in question" });
      if (!room.quiz) return cb({ ok: false, error: "No quiz loaded" });

      revealAndScore(roomCode);
      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("host:next", (payload, cb) => {
    try {
      const { roomCode } = z.object({ roomCode: z.string().min(4).max(12) }).parse(payload);
      const hostCheck = mustBeHost(socket.id, roomCode);
      if (!hostCheck.ok) return cb(hostCheck);
      const room = hostCheck.room;
      if (!room.quiz) return cb({ ok: false, error: "No quiz loaded" });
      if (room.phase !== "results") return cb({ ok: false, error: "Reveal results first" });

      room.questionIndex += 1;
      startQuestion(roomCode);
      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("host:setAutoAdvance", (payload, cb) => {
    try {
      const { roomCode, autoAdvance } = z
        .object({ roomCode: z.string().min(4).max(12), autoAdvance: z.boolean() })
        .parse(payload);
      const hostCheck = mustBeHost(socket.id, roomCode);
      if (!hostCheck.ok) return cb(hostCheck);
      
      hostCheck.room.autoAdvance = autoAdvance;
      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("host:pause", (payload, cb) => {
    try {
      const { roomCode, paused } = z
        .object({ roomCode: z.string().min(4).max(12), paused: z.boolean() })
        .parse(payload);
      const hostCheck = mustBeHost(socket.id, roomCode);
      if (!hostCheck.ok) return cb(hostCheck);
      
      hostCheck.room.isPaused = paused;
      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("host:skip", (payload, cb) => {
    try {
      const { roomCode } = z.object({ roomCode: z.string().min(4).max(12) }).parse(payload);
      const hostCheck = mustBeHost(socket.id, roomCode);
      if (!hostCheck.ok) return cb(hostCheck);
      const room = hostCheck.room;
      if (!room.quiz) return cb({ ok: false, error: "No quiz loaded" });
      if (room.phase !== "question") return cb({ ok: false, error: "Not in question phase" });

      // Skip to next question without scoring
      room.questionIndex += 1;
      startQuestion(roomCode);
      cb({ ok: true });
      emitRoomState(roomCode);
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("player:answer", (payload, cb) => {
    try {
      const { roomCode, questionId, choiceId, typedAnswer } = z
        .object({
          roomCode: z.string().min(4).max(12),
          questionId: z.string(),
          choiceId: z.string().optional(),
          typedAnswer: z.string().optional()
        })
        .parse(payload);

      const room = getRoom(roomCode);
      if (!room) return cb({ ok: false, error: "Room not found" });
      if (room.phase !== "question") return cb({ ok: false, error: "Not accepting answers" });
      if (!room.players.has(socket.id)) return cb({ ok: false, error: "Not a player" });

      const byPlayer = room.answersByQuestionId.get(questionId) ?? new Map<string, { choiceId?: string; typedAnswer?: string; answeredAt: number }>();
      if (byPlayer.has(socket.id)) return cb({ ok: false, error: "Already answered" });

      byPlayer.set(socket.id, { choiceId, typedAnswer, answeredAt: Date.now() });
      room.answersByQuestionId.set(questionId, byPlayer);

      cb({ ok: true });
    } catch (e) {
      cb({ ok: false, error: e instanceof Error ? e.message : "Invalid payload" });
    }
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = getRoom(roomCode);
    if (!room) return;

    if (room.hostSocketId === socket.id) {
      io.to(roomCode).emit("room:error", { message: "Host disconnected. Room closed." });
      removeRoom(roomCode);
      return;
    }

    removePlayer(room, socket.id);
    emitRoomState(roomCode);
  });
});

httpServer.listen(PORT, () => {
  // Intentionally no console.log comment changes requested by user.
  process.stdout.write(`Server listening on :${PORT}\n`);
});
