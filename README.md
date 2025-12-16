# OpenQuiz

A free, open-source live quiz platform inspired by Kahoot. Host interactive quizzes with up to 400 players!

## Features

- **Live multiplayer quizzes** - Real-time gameplay with Socket.IO
- **No login required** - Players join with just a room code
- **Multiple question types** - Multiple choice and type-in answers
- **Streak bonuses** - Reward consecutive correct answers
- **Beautiful UI** - Dark mode, animations, confetti celebrations
- **Mobile friendly** - Works great on phones and tablets

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Styling**: CSS with CSS variables

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yohurokano/openquiz.git
cd openquiz
```

2. Install dependencies:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Start the development servers:
```bash
# Terminal 1 - Start the backend
cd server
npm run dev

# Terminal 2 - Start the frontend
cd client
npm run dev
```

4. Open http://localhost:5173 in your browser

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set the root directory to `client`
3. Add environment variable: `VITE_SERVER_URL` = your backend URL

### Backend

The backend needs a server that supports WebSockets. Recommended free options:
- **Railway** - Free tier with 500 hours/month
- **Render** - Free tier with spin-down after inactivity
- **Fly.io** - Free tier with 3 shared VMs

For 400+ concurrent players, you may need a paid tier.

## Environment Variables

### Client (.env)
```
VITE_SERVER_URL=http://localhost:3001
```

### Server
```
PORT=3001
CLIENT_URL=http://localhost:5173
```

## License

MIT

## Credits

Created by Phoebeology
