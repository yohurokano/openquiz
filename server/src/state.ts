import { customAlphabet } from "nanoid";
import type { Player, Quiz, RoomCode } from "./protocol";

const roomCodeGen = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export type RoomPhase = "lobby" | "question" | "results" | "ended";

export type PlayerAnswer = {
  choiceId?: string;
  typedAnswer?: string;
  answeredAt: number;
};

export type Room = {
  roomCode: RoomCode;
  hostSocketId: string;
  players: Map<string, Player>; // key = socket.id
  phase: RoomPhase;
  quiz?: Quiz;
  questionIndex: number;
  answersByQuestionId: Map<string, Map<string, PlayerAnswer>>; // questionId -> (socketId -> answer)
  questionStartedAt?: number;
  revealedQuestionId?: string;
  timerIntervalId?: ReturnType<typeof setInterval>;
  autoAdvance: boolean;
  autoAdvanceDelay: number; // ms to wait before auto-advancing to next question
  playerStreaks: Map<string, number>; // socketId -> current streak count
  previousRanks: Map<string, number>; // socketId -> previous rank (for rank change display)
  isPaused: boolean;
};

const rooms = new Map<RoomCode, Room>();

export function createRoom(hostSocketId: string, quiz?: Quiz): Room {
  let roomCode = roomCodeGen();
  while (rooms.has(roomCode)) roomCode = roomCodeGen();

  const room: Room = {
    roomCode,
    hostSocketId,
    players: new Map(),
    phase: "lobby",
    quiz,
    questionIndex: 0,
    answersByQuestionId: new Map(),
    autoAdvance: false,
    autoAdvanceDelay: 5000,
    playerStreaks: new Map(),
    previousRanks: new Map(),
    isPaused: false
  };

  rooms.set(roomCode, room);
  return room;
}

export function getRoom(roomCode: RoomCode): Room | undefined {
  return rooms.get(roomCode);
}

export function removeRoom(roomCode: RoomCode): void {
  rooms.delete(roomCode);
}

export function addPlayer(room: Room, socketId: string, nickname: string): Player {
  const player: Player = { id: socketId, nickname, score: 0 };
  room.players.set(socketId, player);
  return player;
}

export function removePlayer(room: Room, socketId: string): void {
  room.players.delete(socketId);
}

export function publicPlayers(room: Room): Array<{ nickname: string; score: number }> {
  return Array.from(room.players.values())
    .map((p) => ({ nickname: p.nickname, score: p.score }))
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
}
