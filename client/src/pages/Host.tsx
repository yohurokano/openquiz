import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../lib/roomStore';
import { getQuiz, listQuizzes } from '../lib/quizStore';
import { FileText } from 'lucide-react';

export default function Host() {
  const { socket, error: socketError } = useRoomStore();
  const nav = useNavigate();

  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedQuizzes = useMemo(() => listQuizzes(), []);
  const selectedQuiz = useMemo(() => selectedQuizId ? getQuiz(selectedQuizId) : null, [selectedQuizId]);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>← Back</button>
        <div className="brand">Host a Quiz</div>
        <div />
      </header>

      <main className="card">
        <h1 className="title">Select a Quiz</h1>
        <p className="subtitle">Choose a quiz to play with your group</p>

        {savedQuizzes.length === 0 ? (
          <div className="emptyState">
            <div className="emptyIcon"><FileText size={64} /></div>
            <p className="emptyText">No quizzes yet</p>
            <p className="emptyHint">Create your first quiz to get started</p>
            <button className="btn primary" onClick={() => nav('/editor')}>
              Create a Quiz
            </button>
          </div>
        ) : (
          <>
            <div className="quizList">
              {savedQuizzes.map((q) => (
                <button
                  key={q.id}
                  className={`quizCard ${selectedQuizId === q.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQuizId(q.id)}
                >
                  <div className="quizCardTitle">{q.title}</div>
                  <div className="quizCardMeta">{q.questions.length} questions</div>
                </button>
              ))}
            </div>

            <div className="hostActions">
              <button className="btn" onClick={() => nav('/editor')}>
                + New Quiz
              </button>
              <button
                className="btn primary large"
                disabled={busy || !selectedQuiz}
                onClick={() => {
                  if (!selectedQuiz) return;
                  setBusy(true);
                  setError(null);

                  if (!socket.connected) {
                    setBusy(false);
                    setError('Not connected to server. Please check if the backend is running.');
                    return;
                  }

                  socket
                    .timeout(8000)
                    .emit('room:create', { quiz: selectedQuiz }, (err, res) => {
                      setBusy(false);
                      if (err) return setError('Server timeout. Is the backend running?');
                      if (!res.ok) return setError(res.error);
                      nav(`/host/${res.roomCode}`);
                    });
                }}
              >
                {busy ? 'Creating…' : 'Start Game →'}
              </button>
            </div>
          </>
        )}

        {error ? <div className="alert">{error}</div> : null}
        {socketError ? <div className="alert">{socketError}</div> : null}
      </main>
    </div>
  );
}
