import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../lib/roomStore';
import { Check, X, Clock, Trophy, Loader2, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import TimerRing from '../components/TimerRing';
import Avatar from '../components/Avatar';
import Confetti from '../components/Confetti';
import { sounds } from '../lib/utils';

const LETTERS = ['A', 'B', 'C', 'D'];
const COLORS = ['color1', 'color2', 'color3', 'color4'];

export default function PlayRoom() {
  const { roomCode } = useParams();
  const code = useMemo(() => (roomCode ?? '').toUpperCase(), [roomCode]);
  const { socket, roomState, timeRemaining, error, clearError } = useRoomStore();
  const nav = useNavigate();

  const [answering, setAnswering] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPoints, setShowPoints] = useState(false);

  const nickname = localStorage.getItem('openquiz.nickname') || '';
  const myPlayer = roomState?.players?.find(p => p.nickname === nickname);
  const timeSeconds = timeRemaining !== null ? Math.ceil(timeRemaining / 1000) : null;
  const totalTime = roomState?.question?.timeLimitMs ? Math.ceil(roomState.question.timeLimitMs / 1000) : 20;
  const myRank = roomState?.players?.findIndex(p => p.nickname === nickname) ?? -1;

  useEffect(() => {
    setAnswering(null);
    setTypedAnswer('');
  }, [roomState?.question?.id, roomState?.phase]);

  // Sound effects for timer countdown
  useEffect(() => {
    if (timeSeconds !== null && timeSeconds <= 5 && timeSeconds > 0 && roomState?.phase === 'question') {
      sounds.countdown();
    }
  }, [timeSeconds, roomState?.phase]);

  // Sound and confetti for correct answer
  useEffect(() => {
    if (roomState?.phase === 'results' && roomState.results?.playerCorrect) {
      sounds.correct();
      setShowConfetti(true);
      setShowPoints(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setTimeout(() => setShowPoints(false), 1000);
    } else if (roomState?.phase === 'results' && roomState.results?.playerCorrect === false) {
      sounds.wrong();
    }
  }, [roomState?.phase, roomState?.results?.playerCorrect]);

  // Victory sound at end
  useEffect(() => {
    if (roomState?.phase === 'ended' && myRank === 0) {
      sounds.victory();
      setShowConfetti(true);
    }
  }, [roomState?.phase, myRank]);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>Exit</button>
        <div className="brand">{roomState?.quizTitle || `Room ${code}`}</div>
        <div className="chip" style={{ fontSize: '13px' }}>{myPlayer?.score ?? 0} pts</div>
      </header>

      <main className="card wide">
        {error ? (
          <div className="alert" onClick={clearError} role="button" tabIndex={0}>
            {error}
          </div>
        ) : null}

        {/* LOBBY */}
        {roomState?.phase === 'lobby' && (
          <div className="waitingState">
            <div className="waitingSpinner" />
            <h2 className="waitingText">Waiting for host to start...</h2>
            <p style={{ color: '#9ca3af', marginTop: '12px' }}>
              {roomState.players.length} player{roomState.players.length !== 1 ? 's' : ''} joined
            </p>
          </div>
        )}

        {/* QUESTION PHASE */}
        {roomState?.phase === 'question' && roomState.question && (
          <div className="questionCard animateIn">
            {/* Timer Ring */}
            <TimerRing 
              seconds={timeSeconds ?? totalTime} 
              totalSeconds={totalTime} 
              urgent={timeSeconds !== null && timeSeconds <= 5} 
            />

            <h2 className="questionText">{roomState.question.text}</h2>

            {/* Already answered - waiting */}
            {answering ? (
              <div className="waitingState" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Clock size={48} style={{ color: 'var(--primary)' }} />
                </div>
                <p className="waitingText">Answer submitted!</p>
                <p style={{ color: '#9ca3af', marginTop: '8px' }}>Waiting for time to run out...</p>
              </div>
            ) : (
              <>
                {/* Multiple choice or True/False */}
                {(roomState.question.type === 'multiple' || roomState.question.type === 'truefalse' || !roomState.question.type) && (
                  <div className="answerGrid">
                    {roomState.question.choices.map((c, idx) => (
                      <button
                        key={c.id}
                        className={`answerBtn ${COLORS[idx % 4]}`}
                        onClick={() => {
                          setAnswering(c.id);
                          socket.emit(
                            'player:answer',
                            { roomCode: code, questionId: roomState.question!.id, choiceId: c.id },
                            () => {}
                          );
                        }}
                      >
                        <span className="answerLetter">{LETTERS[idx]}</span>
                        <span className="answerText">{c.text}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Type answer */}
                {roomState.question.type === 'type' && (
                  <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <input
                      type="text"
                      className="typeAnswerInput"
                      placeholder="Type your answer..."
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn primary large"
                      style={{ width: '100%', marginTop: '16px' }}
                      disabled={!typedAnswer.trim()}
                      onClick={() => {
                        setAnswering('typed');
                        socket.emit(
                          'player:answer',
                          { roomCode: code, questionId: roomState.question!.id, typedAnswer: typedAnswer.trim() },
                          () => {}
                        );
                      }}
                    >
                      Submit Answer
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* RESULTS PHASE */}
        {roomState?.phase === 'results' && roomState.results && (
          <div className="resultFeedback animateIn" style={{ position: 'relative' }}>
            <Confetti active={showConfetti} />
            
            {/* Points popup animation */}
            {showPoints && roomState.results.pointsEarned && (
              <div className="pointsPopup">+{roomState.results.pointsEarned}</div>
            )}

            {/* Show if player was correct or wrong */}
            {roomState.results.playerCorrect !== undefined ? (
              <>
                <div className={`resultIcon ${roomState.results.playerCorrect ? 'correct animatePop' : 'wrong animateShake'}`}>
                  {roomState.results.playerCorrect ? <Check size={48} /> : <X size={48} />}
                </div>
                <h2 className="resultTitle">
                  {roomState.results.playerCorrect ? 'Correct!' : 'Wrong!'}
                </h2>
                {roomState.results.playerCorrect && roomState.results.pointsEarned && (
                  <p className="resultPoints">+{roomState.results.pointsEarned} points</p>
                )}
                {/* Streak badge */}
                {roomState.results.streak && roomState.results.streak > 1 && (
                  <div className="streakBadge">
                    <Flame size={14} /> {roomState.results.streak} streak!
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="resultIcon correct">
                  <Check size={48} />
                </div>
                <h2 className="resultTitle">Time's Up!</h2>
              </>
            )}

            {/* Show correct answer */}
            <div className="correctAnswer">
              <p className="correctAnswerLabel">Correct Answer</p>
              <p className="correctAnswerText">
                {roomState.results.questionType === 'type' 
                  ? roomState.results.correctAnswer
                  : roomState.question?.choices.find(c => c.id === roomState.results?.correctChoiceId)?.text
                }
              </p>
            </div>

            {/* Your rank */}
            {myRank >= 0 && (
              <div style={{ margin: '20px 0', padding: '12px 20px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Your Rank: #{myRank + 1}</span>
                {myPlayer?.rankChange !== undefined && myPlayer.rankChange !== 0 && (
                  <span className={`rankChange ${myPlayer.rankChange > 0 ? 'up' : 'down'}`} style={{ marginLeft: '10px' }}>
                    {myPlayer.rankChange > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(myPlayer.rankChange)}
                  </span>
                )}
              </div>
            )}

            {/* Mini leaderboard */}
            <div style={{ marginTop: '24px' }}>
              <h3 className="leaderboardTitle" style={{ fontSize: '18px', marginBottom: '16px' }}>
                Leaderboard
              </h3>
              <div className="leaderboardList">
                {(roomState.players ?? []).slice(0, 5).map((p, idx) => (
                  <div key={`${p.nickname}-${idx}`} className="leaderboardRow animateIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="leaderboardRank">{idx + 1}</div>
                    <Avatar name={p.nickname} size="small" />
                    <div className="leaderboardName">
                      {p.nickname}
                      {p.streak && p.streak > 1 && (
                        <span className="streakBadge" style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '11px' }}>
                          <Flame size={10} /> {p.streak}
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
            </div>

            <p style={{ color: '#9ca3af', marginTop: '24px' }}>
              <Loader2 size={16} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
              Waiting for next question...
            </p>
          </div>
        )}

        {/* GAME ENDED */}
        {roomState?.phase === 'ended' && (
          <div className="endedCard animateIn">
            <Confetti active={showConfetti} />
            
            <div className="endedIcon animatePop">
              <Trophy size={80} />
            </div>
            <h2 className="endedTitle">Game Over!</h2>
            <p className="endedSubtitle">
              {myRank === 0 ? 'You won!' : myRank >= 0 ? `You finished #${myRank + 1}` : 'Great game everyone!'}
            </p>

            {/* Podium for top 3 */}
            {roomState.players && roomState.players.length >= 1 && (
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
            {roomState.players && roomState.players.length > 3 && (
              <div className="leaderboardList">
                {roomState.players.slice(3, 10).map((p, idx) => (
                  <div key={`${p.nickname}-${idx}`} className="leaderboardRow animateIn" style={{ animationDelay: `${(idx + 3) * 0.1}s` }}>
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

        {!roomState && (
          <div className="waitingState">
            <div className="waitingSpinner" />
            <p className="waitingText">Connecting...</p>
          </div>
        )}
      </main>
    </div>
  );
}
