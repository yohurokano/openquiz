import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Quiz, QuizQuestion, QuestionType } from '../lib/protocol';
import { createChristmasQuiz, createEmptyQuiz, deleteQuiz, listQuizzes, saveQuiz } from '../lib/quizStore';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export default function Editor() {
  const nav = useNavigate();

  const [selectedId, setSelectedId] = useState<string>('');
  const [quiz, setQuiz] = useState<Quiz>(() => createEmptyQuiz());
  const [message, setMessage] = useState<string | null>(null);

  const quizzes = useMemo(() => listQuizzes(), [message]);

  function setQuestion(partial: Partial<QuizQuestion> & { id: string }) {
    setQuiz((prev) => {
      const next = clone(prev);
      const idx = next.questions.findIndex((q) => q.id === partial.id);
      if (idx < 0) return prev;
      next.questions[idx] = { ...next.questions[idx], ...partial };
      return next;
    });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>Home</button>
        <div className="brand">Quiz editor</div>
        <div />
      </header>

      <main className="card wide">
        <div className="rowBetween">
          <h1 className="title">Create quizzes</h1>
          <div className="actions">
            <button
              className="btn"
              onClick={() => {
                const q = createEmptyQuiz();
                setSelectedId('');
                setQuiz(q);
                setMessage(null);
              }}
            >
              New
            </button>
            <button
              className="btn"
              onClick={() => {
                const xmas = createChristmasQuiz();
                xmas.id = crypto.randomUUID();
                setSelectedId('');
                setQuiz(xmas);
                setMessage('Loaded Christmas Quiz - click Save to keep it');
              }}
            >
              Sample Quiz
            </button>
            <button
              className="btn primary"
              onClick={() => {
                saveQuiz(quiz);
                setSelectedId(quiz.id);
                setMessage('Saved');
                setTimeout(() => setMessage(null), 1200);
              }}
            >
              Save
            </button>
          </div>
        </div>

        {message ? <div className="toast">{message}</div> : null}

        <div className="section">
          <div className="sectionTitle">Saved quizzes</div>
          <div className="actions">
            <select
              className="select"
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedId(id);
                const found = quizzes.find((q) => q.id === id);
                if (found) setQuiz(clone(found));
              }}
            >
              <option value="">(select)</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>

            <button
              className="btn"
              disabled={!selectedId}
              onClick={() => {
                if (!selectedId) return;
                deleteQuiz(selectedId);
                setSelectedId('');
                setQuiz(createEmptyQuiz());
                setMessage('Deleted');
                setTimeout(() => setMessage(null), 1200);
              }}
            >
              Delete
            </button>

            <button
              className="btn"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(quiz, null, 2));
                setMessage('Copied JSON');
                setTimeout(() => setMessage(null), 1200);
              }}
            >
              Copy JSON
            </button>
          </div>
        </div>

        <label className="field">
          <span>Quiz title</span>
          <input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} />
        </label>

        <div className="section">
          <div className="sectionTitle">Questions</div>

          <div className="stack">
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="panel">
                <div className="rowBetween">
                  <div className="chip">Q{idx + 1}</div>
                  <button
                    className="btn danger"
                    disabled={quiz.questions.length <= 1}
                    onClick={() => {
                      setQuiz((prev) => {
                        const next = clone(prev);
                        next.questions = next.questions.filter((qq) => qq.id !== q.id);
                        return next;
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>

                <label className="field">
                  <span>Question type</span>
                  <select
                    value={q.type || 'multiple'}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      setQuiz((prev) => {
                        const next = clone(prev);
                        const qi = next.questions.findIndex((qq) => qq.id === q.id);
                        if (qi < 0) return prev;
                        next.questions[qi].type = newType;
                        // Set up default choices for true/false
                        if (newType === 'truefalse') {
                          const trueId = crypto.randomUUID();
                          const falseId = crypto.randomUUID();
                          next.questions[qi].choices = [
                            { id: trueId, text: 'True' },
                            { id: falseId, text: 'False' }
                          ];
                          next.questions[qi].correctChoiceId = trueId;
                        } else if (newType === 'type') {
                          next.questions[qi].choices = [];
                          next.questions[qi].correctAnswer = next.questions[qi].correctAnswer || '';
                        }
                        return next;
                      });
                    }}
                  >
                    <option value="multiple">Multiple Choice</option>
                    <option value="truefalse">True / False</option>
                    <option value="type">Type Answer</option>
                  </select>
                </label>

                <label className="field">
                  <span>Question</span>
                  <input value={q.text} onChange={(e) => setQuestion({ id: q.id, text: e.target.value })} />
                </label>

                <label className="field">
                  <span>Time limit (seconds)</span>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={Math.round(q.timeLimitMs / 1000)}
                    onChange={(e) => {
                      const sec = Number(e.target.value || 20);
                      setQuestion({ id: q.id, timeLimitMs: Math.max(3, Math.min(120, sec)) * 1000 });
                    }}
                  />
                </label>

                {/* Answers section - different UI based on question type */}
                {(q.type === 'multiple' || !q.type) && (
                  <div className="section">
                    <div className="sectionTitle">Answers (select correct one)</div>
                    <div className="grid2">
                      {q.choices.map((c) => (
                        <label key={c.id} className={`answerTile small ${c.id === q.correctChoiceId ? 'correct' : ''}`}>
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={c.id === q.correctChoiceId}
                            onChange={() => setQuestion({ id: q.id, correctChoiceId: c.id })}
                          />
                          <input
                            className="tileInput"
                            value={c.text}
                            onChange={(e) => {
                              const text = e.target.value;
                              setQuiz((prev) => {
                                const next = clone(prev);
                                const qi = next.questions.findIndex((qq) => qq.id === q.id);
                                if (qi < 0) return prev;
                                const ci = next.questions[qi].choices.findIndex((cc) => cc.id === c.id);
                                if (ci < 0) return prev;
                                next.questions[qi].choices[ci].text = text;
                                return next;
                              });
                            }}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="actions">
                      <button
                        className="btn"
                        disabled={q.choices.length >= 4}
                        onClick={() => {
                          setQuiz((prev) => {
                            const next = clone(prev);
                            const qi = next.questions.findIndex((qq) => qq.id === q.id);
                            if (qi < 0) return prev;
                            next.questions[qi].choices.push({ id: crypto.randomUUID(), text: `Answer ${q.choices.length + 1}` });
                            return next;
                          });
                        }}
                      >
                        Add answer
                      </button>

                      <button
                        className="btn"
                        disabled={q.choices.length <= 2}
                        onClick={() => {
                          setQuiz((prev) => {
                            const next = clone(prev);
                            const qi = next.questions.findIndex((qq) => qq.id === q.id);
                            if (qi < 0) return prev;
                            const removed = next.questions[qi].choices.pop();
                            if (removed && next.questions[qi].correctChoiceId === removed.id) {
                              next.questions[qi].correctChoiceId = next.questions[qi].choices[0].id;
                            }
                            return next;
                          });
                        }}
                      >
                        Remove last answer
                      </button>
                    </div>
                  </div>
                )}

                {q.type === 'truefalse' && (
                  <div className="section">
                    <div className="sectionTitle">Correct answer</div>
                    <div className="grid2">
                      {q.choices.map((c) => (
                        <label key={c.id} className={`answerTile small ${c.id === q.correctChoiceId ? 'correct' : ''}`}>
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={c.id === q.correctChoiceId}
                            onChange={() => setQuestion({ id: q.id, correctChoiceId: c.id })}
                          />
                          <span style={{ fontWeight: 700 }}>{c.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'type' && (
                  <div className="section">
                    <label className="field">
                      <span>Correct answer (players must type this exactly)</span>
                      <input
                        value={q.correctAnswer || ''}
                        placeholder="Type the correct answer..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuiz((prev) => {
                            const next = clone(prev);
                            const qi = next.questions.findIndex((qq) => qq.id === q.id);
                            if (qi < 0) return prev;
                            next.questions[qi].correctAnswer = val;
                            return next;
                          });
                        }}
                      />
                    </label>
                    <p className="hint">Answer matching is case-insensitive</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className="btn primary"
            onClick={() => {
              setQuiz((prev) => {
                const next = clone(prev);
                const qId = crypto.randomUUID();
                const c1 = crypto.randomUUID();
                const c2 = crypto.randomUUID();
                next.questions.push({
                  id: qId,
                  type: 'multiple',
                  text: 'New question',
                  choices: [
                    { id: c1, text: 'Answer 1' },
                    { id: c2, text: 'Answer 2' }
                  ],
                  correctChoiceId: c1,
                  timeLimitMs: 20000
                });
                return next;
              });
            }}
          >
            + Add question
          </button>
        </div>
      </main>
    </div>
  );
}
