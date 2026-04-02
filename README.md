# 🍜 Noodle Quest

Brain games, board games, and focus tracks for the whole family.

## What is it?

Noodle Quest is a web app for training focus, memory, and flexibility through fun mini-games. Play solo or challenge friends. Vibe to lo-fi beats while you play.

### Features

- **22 Brain Games** — Focus, memory, motor skills, flexibility, social, and sequence games across 10-20 stages each
- **Board Games** — Chess, Checkers, Ludo, Snakes & Ladders, Dominoes (multiplayer, real-time)
- **Focus Tracks** — Synthesized lo-fi beats, ambient nature sounds, and guided meditation via Web Audio API
- **Leaderboard** — Compete with friends and family on stars earned
- **Challenges** — Send 1v1 challenges to friends on any game
- **Chat & Activity** — Real-time feed with @mentions and score updates
- **Favorites** — Pin your go-to games for quick access
- **Random Stage** — Jump into a random game at a random stage

### Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Convex (real-time, serverless) |
| Audio | Web Audio API (synthesized, no audio files) |
| Deploy | Netlify |
| CI | GitHub Actions + Dependabot |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Convex URL

# Start dev server
npm run dev

# Start Convex dev backend
npm run convex:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run convex:dev` | Start Convex dev backend |
| `npm run convex:deploy` | Deploy Convex functions |

## Project Structure

```
src/
  components/     # Shared UI components (NavBar)
  contexts/       # React contexts (AuthContext)
  games/          # 22 game components (one .tsx each)
  hooks/          # Custom hooks (useAudioEngine)
  lib/            # Utilities (Convex client, game registry)
  screens/        # App screens (Home, GameHub, Play, Feed, etc.)
  tracks/         # Audio track definitions
  types.ts        # Shared TypeScript types
convex/
  auth.ts         # Player auth (sign up, log in, avatar)
  games.ts        # Scores, progress, leaderboard
  feed.ts         # Chat/feed posts
  challenges.ts   # 1v1 challenges
  schema.ts       # Database schema
```

## Adding a New Game

1. Create `src/games/my-game.tsx`:

```tsx
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

function MyGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  // Game logic here
  return <div>My game UI</div>;
}

registerGame('my-game', {
  name: 'My Game',
  emoji: '🎮',
  description: 'What this game does',
  category: 'focus',
  stages: 10,
  component: MyGame,
});
```

2. Register in `src/main.tsx`:
```tsx
import '@/games/my-game';
```

## License

Private — family and friends only.
