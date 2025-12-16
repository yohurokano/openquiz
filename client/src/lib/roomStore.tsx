import { createContext, useContext, useEffect, useState } from 'react';
import { createSocket, type KahootAltSocket } from './socket';
import type { RoomState } from './protocol';

type RoomStore = {
  socket: KahootAltSocket;
  roomState: RoomState | null;
  timeRemaining: number | null;
  error: string | null;
  clearError: () => void;
};

const RoomStoreContext = createContext<RoomStore | null>(null);

const socketSingleton: KahootAltSocket = createSocket();

export function RoomStoreProvider({ children }: { children: React.ReactNode }) {
  const socket = socketSingleton;
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onState = (payload: RoomState) => {
      setRoomState(payload);
      // Reset timer when not in question phase
      if (payload.phase !== 'question') {
        setTimeRemaining(null);
      }
    };
    const onError = (payload: { message: string }) => setError(payload.message);
    const onTimerTick = (payload: { timeRemaining: number }) => {
      setTimeRemaining(payload.timeRemaining);
    };
    const onConnectError = (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Connection error';
      setError(`Socket connect_error: ${msg}`);
    };
    const onDisconnect = (reason: string) => {
      setError(`Socket disconnected: ${reason}`);
    };

    socket.on('room:state', onState);
    socket.on('room:error', onError);
    socket.on('timer:tick', onTimerTick);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('room:state', onState);
      socket.off('room:error', onError);
      socket.off('timer:tick', onTimerTick);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  return (
    <RoomStoreContext.Provider
      value={{
        socket,
        roomState,
        timeRemaining,
        error,
        clearError: () => setError(null)
      }}
    >
      {children}
    </RoomStoreContext.Provider>
  );
}

export function useRoomStore(): RoomStore {
  const ctx = useContext(RoomStoreContext);
  if (!ctx) throw new Error('RoomStoreProvider missing');
  return ctx;
}
