import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../lib/roomStore';
import { Gamepad2 } from 'lucide-react';

export default function Join() {
  const { socket } = useRoomStore();
  const nav = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedRoomCode = useMemo(() => roomCode.trim().toUpperCase(), [roomCode]);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>← Back</button>
        <div className="brand">Join Quiz</div>
        <div />
      </header>

      <main className="card joinCard">
        <div className="joinIcon"><Gamepad2 size={56} /></div>
        <h1 className="title centered">Join a Game</h1>

        <div className="joinForm">
          <label className="field">
            <span>Game PIN</span>
            <input
              className="pinInput"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              inputMode="text"
              placeholder="Enter PIN"
              autoCapitalize="characters"
              autoCorrect="off"
              maxLength={8}
            />
          </label>

          <label className="field">
            <span>Nickname</span>
            <input
              className="nicknameInput"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your name"
              maxLength={24}
            />
          </label>

          {error ? <div className="alert">{error}</div> : null}

          <button
            className="btn primary large joinBtn"
            disabled={busy || normalizedRoomCode.length < 4 || nickname.trim().length < 1}
            onClick={() => {
              setBusy(true);
              setError(null);
              const trimmedNickname = nickname.trim();
              localStorage.setItem('openquiz.nickname', trimmedNickname);
              socket.emit(
                'room:join',
                { roomCode: normalizedRoomCode, nickname: trimmedNickname },
                (res) => {
                  setBusy(false);
                  if (!res.ok) return setError(res.error);
                  nav(`/play/${normalizedRoomCode}`);
                }
              );
            }}
          >
            {busy ? 'Joining…' : 'Enter →'}
          </button>
        </div>
      </main>
    </div>
  );
}
