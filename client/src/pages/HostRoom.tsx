import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../lib/roomStore';
import { Users, Trophy, Check, ArrowRight, Play, Pause, SkipForward, Eye, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import TimerRing from '../components/TimerRing';
import Avatar from '../components/Avatar';
import Confetti from '../components/Confetti';
import { percentage } from '../lib/utils';

const LETTERS = ['A', 'B', 'C', 'D'];
const COLORS = ['color1', 'color2', 'color3', 'color4'];
const BG_COLORS = ['var(--red)', 'var(--blue)', 'var(--yellow)', 'var(--green)'];

export default function HostRoom() {
  const { roomCode } = useParams();
  const code = useMemo(() => (roomCode ?? '').toUpperCase(), [roomCode]);
  const { socket, roomState, timeRemaining } = useRoomStore();
  const nav = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const phase = roomState?.phase ?? 'lobby';
  const playerCount = roomState?.players?.length ?? 0;
  const questionIndex = roomState?.questionIndex ?? 0;
  const totalQuestions = roomState?.totalQuestions ?? 0;
  const timeSeconds = timeRemaining !== null ? Math.ceil(timeRemaining / 1000) : null;
  const totalTime = roomState?.question?.timeLimitMs ? Math.ceil(roomState.question.timeLimitMs / 1000) : 20;
  const answeredCount = roomState?.answeredCount ?? 0;
  const isPaused = roomState?.isPaused ?? false;

  return (
    <div className="shell">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>Exit</button>
        <div className="brand">{roomState?.quizTitle || 'Quiz'}</div>
        {phase !== 'lobby' && (
          <div className="chip" style={{ fontSize: '13px' }}>
            Q{questionIndex + 1}/{totalQuestions}
          </div>
        )}
      </header>

      <main className="card wide">
        {/* LOBBY */}
        {phase === 'lobby' && (
          <div className="hostRoomCard">
            <div className="lobbyHeader">
              <p className="lobbyLabel">Game PIN</p>
              <div className="roomCodeDisplay">{code}</div>
              <p className="lobbyHint">Players join at this website with the PIN above</p>
            </div>

            <div className="playerGrid">
              {playerCount === 0 ? (
                <div className="waitingPlayers">
                  <div className="waitingIcon"><Users size={48} /></div>
                  <p>Waiting for players to join...</p>
                </div>
              ) : (
                <>
                  <div className="playerCount">{playerCount} player{playerCount !== 1 ? 's' : ''} joined</div>
                  <div className="playerChips">
                    {(roomState?.players ?? []).slice(0, 50).map((p, i) => (
                      <div key={`${p.nickname}-${i}`} className="playerChip">{p.nickname}</div>
                    ))}
                    {playerCount > 50 && <div className="playerChip">+{playerCount - 50} more</div>}
                  </div>
                </>
              )}
            </div>

            {error && <div className="alert">{error}</div>}

            {/* Auto-advance toggle */}
            <label className="autoAdvanceToggle">
              <input
                type="checkbox"
                checked={roomState?.autoAdvance ?? false}
                onChange={(e) => {
                  socket.emit('host:setAutoAdvance', { roomCode: code, autoAdvance: e.target.checked }, () => {});
                }}
              />
              <span>Auto-advance questions (5s delay after results)</span>
            </label>

            <button
              className="btn primary large"
              style={{ minWidth: '200px' }}
              disabled={busy || playerCount === 0}
              onClick={() => {
                setBusy(true);
                setError(null);
                socket.emit('host:start', { roomCode: code }, (res) => {
                  setBusy(false);
                  if (!res.ok) setError(res.error);
                });
              }}
            >
              <Play size={20} style={{ marginRight: '8px' }} />
              {busy ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        )}

        {/* QUESTION */}
        {phase === 'question' && roomState?.question && (
          <div className="questionCard animateIn">
            {/* Timer Ring */}
            <TimerRing 
              seconds={timeSeconds ?? totalTime} 
              totalSeconds={totalTime} 
              urgent={timeSeconds !== null && timeSeconds <= 5} 
            />

            {/* Answered counter */}
            <div className="answeredCounter">
              <Eye size={18} />
              {answeredCount} / {playerCount} answered
            </div>

            <h2 className="questionText">{roomState.question.text}</h2>

            {/* Answer options display */}
            {roomState.question.choices.length > 0 && (
              <div className="answerGrid">
                {roomState.question.choices.map((c, idx) => (
                  <div key={c.id} className={`answerBtn ${COLORS[idx % 4]} animateIn`} style={{ cursor: 'default', animationDelay: `${idx * 0.1}s` }}>
                    <span className="answerLetter">{LETTERS[idx]}</span>
                    <span className="answerText">{c.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Type question hint */}
            {roomState.question.type === 'type' && (
              <div className="panel" style={{ textAlign: 'center', marginTop: '24px' }}>
                <p style={{ fontSize: '18px', color: '#6b7280' }}>Players are typing their answers...</p>
              </div>
            )}

            {error && <div className="alert">{error}</div>}

            {/* Host controls */}
            <div className="hostControls">
              <button
                className="btn warning large"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  socket.emit('host:reveal', { roomCode: code }, (res) => {
                    setBusy(false);
                    if (!res.ok) setError(res.error);
                  });
                }}
              >
                <Check size={20} style={{ marginRight: '8px' }} />
                {busy ? 'Revealing...' : 'Reveal Answer'}
              </button>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => {
                  socket.emit('host:skip', { roomCode: code }, () => {});
                }}
              >
                <SkipForward size={18} style={{ marginRight: '6px' }} />
                Skip
              </button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {phase === 'results' && (
          <div className="leaderboardCard animateIn">
            {/* Answer distribution */}
            {roomState?.results && roomState?.question && roomState.question.choices.length > 0 && (
              <div className="answerDistribution" style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-light)' }}>Answer Distribution</h3>
                {roomState.question.choices.map((c, idx) => {
                  const count = roomState.results?.answerCounts[c.id] ?? 0;
                  const total = Object.values(roomState.results?.answerCounts ?? {}).reduce((a, b) => a + b, 0);
                  const pct = percentage(count, total);
                  const isCorrect = c.id === roomState.results?.correctChoiceId;
                  return (
                    <div key={c.id} className="distributionBar">
                      <div className="distributionLabel" style={{ background: BG_COLORS[idx % 4] }}>{LETTERS[idx]}</div>
                      <div className="distributionTrack">
                        <div 
                          className={`distributionFill ${isCorrect ? 'correct' : ''}`} 
                          style={{ width: `${Math.max(pct, 5)}%`, background: isCorrect ? 'var(--success)' : BG_COLORS[idx % 4] }}
                        >
                          {pct > 15 && <span className="distributionCount">{count}</span>}
                        </div>
                        {pct <= 15 && <span className="distributionCountOutside">{count}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show correct answer for type questions */}
            {roomState?.results && roomState?.question?.type === 'type' && (
              <div className="correctAnswer" style={{ marginBottom: '32px' }}>
                <p className="correctAnswerLabel">Correct Answer</p>
                <p className="correctAnswerText">{roomState.results.correctAnswer}</p>
              </div>
            )}

            <h2 className="leaderboardTitle">Leaderboard</h2>
            
            {/* Top 3 podium */}
            {roomState?.players && roomState.players.length >= 1 && (
              <div className="podiumSection">
                {roomState.players.slice(0, 3).map((p, idx) => (
                  <div key={`${p.nickname}-${idx}`} className={`podiumPlace ${idx === 0 ? 'first' : idx === 1 ? 'second' : 'third'} animateIn`} style={{ animationDelay: `${idx * 0.15}s` }}>
                    <Avatar name={p.nickname} size="large" />
                    <div className="podiumName">
                      {p.nickname}
                      {p.streak && p.streak > 1 && (
                        <span className="streakBadge" style={{ marginLeft: '6px', padding: '2px 6px', fontSize: '10px' }}>
                          <Flame size={10} /> {p.streak}
                        </span>
                      )}
                    </div>
                    <div className="podiumScore">{p.score} pts</div>
                    {p.rankChange !== undefined && p.rankChange !== 0 && (
                      <span className={`rankChange ${p.rankChange > 0 ? 'up' : 'down'}`}>
                        {p.rankChange > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        {Math.abs(p.rankChange)}
                      </span>
                    )}
                    <div className="podiumBar" />
                  </div>
                ))}
              </div>
            )}

            {/* Rest of leaderboard */}
            {roomState?.players && roomState.players.length > 3 && (
              <div className="leaderboardList">
                {roomState.players.slice(3, 10).map((p, idx) => (
                  <div key={`${p.nickname}-${idx}`} className="leaderboardRow animateIn" style={{ animationDelay: `${(idx + 3) * 0.05}s` }}>
                    <div className="leaderboardRank">{idx + 4}</div>
                    <Avatar name={p.nickname} size="small" />
                    <div className="leaderboardName">
                      {p.nickname}
                      {p.streak && p.streak > 1 && (
                        <span className="streakBadge" style={{ marginLeft: '6px', padding: '2px 4px', fontSize: '10px' }}>
                          <Flame size={8} /> {p.streak}
                        </span>
                      )}
                    </div>
                    <div className="leaderboardScore">
                      {p.score}
                      {p.rankChange !== undefined && p.rankChange !== 0 && (
                        <span className={`rankChange ${p.rankChange > 0 ? 'up' : 'down'}`} style={{ marginLeft: '6px' }}>
                          {p.rankChange > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="alert">{error}</div>}

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button
                className="btn primary large"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  socket.emit('host:next', { roomCode: code }, (res) => {
                    setBusy(false);
                    if (!res.ok) setError(res.error);
                  });
                }}
              >
                {busy ? 'Loading...' : 'Next Question'}
                <ArrowRight size={20} style={{ marginLeft: '8px' }} />
              </button>
            </div>
          </div>
        )}

        {/* GAME ENDED */}
        {phase === 'ended' && (
          <div className="endedCard animateIn">
            <Confetti active={showConfetti || phase === 'ended'} />
            
            <div className="endedIcon animatePop">
              <Trophy size={80} />
            </div>
            <h2 className="endedTitle">Game Over!</h2>
            <p className="endedSubtitle">Thanks for playing!</p>

            {/* Podium for top 3 */}
            {roomState?.players && roomState.players.length >= 1 && (
              <div className="podiumSection">
                {roomState.players.slice(0, 3).map((p, idx) => (
                  <div key={`${p.nickname}-${idx}`} className={`podiumPlace ${idx === 0 ? 'first' : idx === 1 ? 'second' : 'third'} animateIn`} style={{ animationDelay: `${idx * 0.2}s` }}>
                    <Avatar name={p.nickname} size="large" />
                    <div className="podiumName">{p.nickname}</div>
                    <div className="podiumScore">{p.score} pts</div>
                    <div className="podiumBar" />
                  </div>
                ))}
              </div>
            )}

            {/* Rest of leaderboard */}
            {roomState?.players && roomState.players.length > 3 && (
              <div className="leaderboardList">
                {roomState.players.slice(3, 15).map((p, idx) => (
                  <div key={`${p.nickname}-${idx}`} className="leaderboardRow animateIn" style={{ animationDelay: `${(idx + 3) * 0.05}s` }}>
                    <div className="leaderboardRank">{idx + 4}</div>
                    <Avatar name={p.nickname} size="small" />
                    <div className="leaderboardName">{p.nickname}</div>
                    <div className="leaderboardScore">{p.score}<span className="leaderboardPoints"> pts</span></div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn primary large" style={{ marginTop: '32px' }} onClick={() => nav('/')}>
              Back to Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
