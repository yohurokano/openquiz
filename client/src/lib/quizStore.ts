import type { Quiz } from './protocol';

const KEY = 'openquiz.quizzes.v1';

function readAll(): Quiz[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Quiz[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(quizzes: Quiz[]) {
  localStorage.setItem(KEY, JSON.stringify(quizzes));
}

export function listQuizzes(): Quiz[] {
  return readAll().sort((a, b) => a.title.localeCompare(b.title));
}

export function getQuiz(id: string): Quiz | null {
  return readAll().find((q) => q.id === id) ?? null;
}

export function saveQuiz(quiz: Quiz) {
  const quizzes = readAll();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) quizzes[idx] = quiz;
  else quizzes.push(quiz);
  writeAll(quizzes);
}

export function deleteQuiz(id: string) {
  const quizzes = readAll().filter((q) => q.id !== id);
  writeAll(quizzes);
}

export function createEmptyQuiz(): Quiz {
  const qId = crypto.randomUUID();
  const c1 = crypto.randomUUID();
  const c2 = crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    title: 'Untitled quiz',
    questions: [
      {
        id: qId,
        type: 'multiple',
        text: 'Your question',
        choices: [
          { id: c1, text: 'Answer 1' },
          { id: c2, text: 'Answer 2' }
        ],
        correctChoiceId: c1,
        timeLimitMs: 20000
      }
    ]
  };
}

export function createChristmasQuiz(): Quiz {
  return {
    id: 'christmas-uk-2024',
    title: 'UK Christmas Quiz',
    questions: [
      {
        id: 'xmas-1',
        type: 'multiple',
        text: 'What is traditionally hidden inside a Christmas pudding for good luck?',
        choices: [
          { id: 'xmas-1-a', text: 'A silver sixpence' },
          { id: 'xmas-1-b', text: 'A gold ring' },
          { id: 'xmas-1-c', text: 'A chocolate coin' },
          { id: 'xmas-1-d', text: 'A paper crown' }
        ],
        correctChoiceId: 'xmas-1-a',
        timeLimitMs: 20000
      },
      {
        id: 'xmas-2',
        type: 'multiple',
        text: 'Which monarch gave the first Royal Christmas Message on the radio?',
        choices: [
          { id: 'xmas-2-a', text: 'Queen Victoria' },
          { id: 'xmas-2-b', text: 'King George V' },
          { id: 'xmas-2-c', text: 'King Edward VIII' },
          { id: 'xmas-2-d', text: 'King George VI' }
        ],
        correctChoiceId: 'xmas-2-b',
        timeLimitMs: 20000
      },
      {
        id: 'xmas-3',
        type: 'truefalse',
        text: 'Mince pies were once made with actual minced meat.',
        choices: [
          { id: 'xmas-3-true', text: 'True' },
          { id: 'xmas-3-false', text: 'False' }
        ],
        correctChoiceId: 'xmas-3-true',
        timeLimitMs: 15000
      },
      {
        id: 'xmas-4',
        type: 'multiple',
        text: 'What do Brits traditionally watch at 3pm on Christmas Day?',
        choices: [
          { id: 'xmas-4-a', text: 'EastEnders' },
          { id: 'xmas-4-b', text: 'The King\'s Speech' },
          { id: 'xmas-4-c', text: 'Doctor Who' },
          { id: 'xmas-4-d', text: 'Strictly Come Dancing' }
        ],
        correctChoiceId: 'xmas-4-b',
        timeLimitMs: 20000
      },
      {
        id: 'xmas-5',
        type: 'multiple',
        text: 'Which British city has a famous German Christmas Market?',
        choices: [
          { id: 'xmas-5-a', text: 'London' },
          { id: 'xmas-5-b', text: 'Manchester' },
          { id: 'xmas-5-c', text: 'Birmingham' },
          { id: 'xmas-5-d', text: 'Edinburgh' }
        ],
        correctChoiceId: 'xmas-5-c',
        timeLimitMs: 20000
      },
      {
        id: 'xmas-6',
        type: 'type',
        text: 'What vegetable is traditionally served with Christmas dinner and wrapped in bacon?',
        choices: [],
        correctChoiceId: '',
        correctAnswer: 'Brussels sprouts',
        timeLimitMs: 25000
      },
      {
        id: 'xmas-7',
        type: 'multiple',
        text: 'In the song "12 Days of Christmas", what did my true love give on the 5th day?',
        choices: [
          { id: 'xmas-7-a', text: 'Calling birds' },
          { id: 'xmas-7-b', text: 'Gold rings' },
          { id: 'xmas-7-c', text: 'Geese a-laying' },
          { id: 'xmas-7-d', text: 'Swans a-swimming' }
        ],
        correctChoiceId: 'xmas-7-b',
        timeLimitMs: 20000
      },
      {
        id: 'xmas-8',
        type: 'truefalse',
        text: 'Boxing Day is named after the sport of boxing.',
        choices: [
          { id: 'xmas-8-true', text: 'True' },
          { id: 'xmas-8-false', text: 'False' }
        ],
        correctChoiceId: 'xmas-8-false',
        timeLimitMs: 15000
      },
      {
        id: 'xmas-9',
        type: 'multiple',
        text: 'Which Christmas song was UK Christmas Number 1 in 1984?',
        choices: [
          { id: 'xmas-9-a', text: 'Last Christmas - Wham!' },
          { id: 'xmas-9-b', text: 'Do They Know It\'s Christmas? - Band Aid' },
          { id: 'xmas-9-c', text: 'I Wish It Could Be Christmas - Wizzard' },
          { id: 'xmas-9-d', text: 'Merry Xmas Everybody - Slade' }
        ],
        correctChoiceId: 'xmas-9-b',
        timeLimitMs: 20000
      },
      {
        id: 'xmas-10',
        type: 'multiple',
        text: 'What is pulled at the Christmas dinner table that makes a bang?',
        choices: [
          { id: 'xmas-10-a', text: 'Party popper' },
          { id: 'xmas-10-b', text: 'Christmas cracker' },
          { id: 'xmas-10-c', text: 'Balloon' },
          { id: 'xmas-10-d', text: 'Confetti cannon' }
        ],
        correctChoiceId: 'xmas-10-b',
        timeLimitMs: 15000
      }
    ]
  };
}
