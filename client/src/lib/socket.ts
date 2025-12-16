import { io, type Socket } from 'socket.io-client';
import type { Quiz, RoomCode, RoomState } from './protocol';

type ClientToServerEvents = {
  'room:create': (
    payload: { quiz?: Quiz },
    cb: (response: { ok: true; roomCode: RoomCode } | { ok: false; error: string }) => void
  ) => void;
  'room:join': (
    payload: { roomCode: RoomCode; nickname: string },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'host:start': (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  'host:reveal': (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  'host:next': (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'host:setAutoAdvance': (
    payload: { roomCode: RoomCode; autoAdvance: boolean },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'host:pause': (
    payload: { roomCode: RoomCode; paused: boolean },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'host:skip': (
    payload: { roomCode: RoomCode },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'player:answer': (
    payload: { roomCode: RoomCode; questionId: string; choiceId?: string; typedAnswer?: string },
    cb: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;
};

type ServerToClientEvents = {
  'room:state': (payload: RoomState) => void;
  'room:error': (payload: { message: string }) => void;
  'timer:tick': (payload: { timeRemaining: number }) => void;
};

export type KahootAltSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): KahootAltSocket {
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  return io(url, {
    path: '/socket.io',
    withCredentials: true,
    timeout: 8000,
    reconnection: true,
    reconnectionAttempts: 10,
    transports: ['websocket']
  });
}
