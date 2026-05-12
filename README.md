# Noodle Quest

Brain games and board games for the whole family. Train your focus, memory, and flexibility with fun mini-games, then challenge yourself with classic board games — all while vibing to lo-fi beats.

## Features

### 21 Brain Games (6 categories)

| Category | Games |
|----------|-------|
| Memory | Copy Cat, Memory Match, Echo Tap, Mirror Match |
| Focus | Focus Frenzy, Attention Archery, Breath Bubbles |
| Motor | Steady Hands, Pixel Paint, Squish Lab |
| Flexibility | Flexibility Frames, Mistake Master, Reverse Cat |
| Social | Emotion Volcano, Empathy Engine, Feelings Faces, Story Builder |
| Sequence | Number Ninja, Pattern Painter, Routine Roadmap, Just Right, Patience Pop |

### 6 Board Games (vs AI)

Tic-Tac-Toe, Checkers, Chess, Connect Four, Ludo, Snakes & Ladders — each with progressive difficulty across stages.

### Audio Tracks (8 tracks, Web Audio API)

Lo-fi beats, focus pads, nature sounds, and meditation tones — all synthesized in-browser, no audio files needed.

### Social & Chat

- Activity feed with score announcements
- Real-time chat with @mention support
- Emoji picker and sticker/GIF reactions
- Player-to-player challenges

### 45+ Unique Avatars

Animals, fantasy characters, nature icons — pick yours at signup and change anytime.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Backend | Convex (real-time database, auth, functions) |
| Deployment | Netlify |
| Icons | Lucide React |
| Audio | Web Audio API (programmatic synthesis) |

## Getting Started

### Prerequisites

- Node.js 20+
- A Convex account ([convex.dev](https://convex.dev))

### Setup

```bash
# Clone
git clone https://github.com/antonio59/noodle-quest-v2
cd noodle-quest-v2

# Install
pnpm install

# Set up environment
echo "VITE_CONVEX_URL=your_convex_deployment_url" > .env

# Start Convex backend
pnpm run convex:dev

# In another terminal, start frontend
pnpm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CONVEX_URL` | Your Convex deployment URL (from `pnpm exec convex dev` output) |

### Scripts

```bash
pnpm run dev             # Start Vite dev server
pnpm run build           # Production build (tsc + vite build)
pnpm run preview         # Preview production build
pnpm run convex:dev      # Start Convex dev (creates .env.local)
pnpm run convex:deploy   # Deploy Convex functions to production
```

## Database Schema (Convex)

| Table | Purpose |
|-------|---------|
| `players` | User accounts (name, PIN, avatar) |
| `scores` | Individual game score records |
| `progress` | Per-player per-game stage progress |
| `feed` | Chat messages and activity posts |
| `challenges` | Player-to-player game challenges |
| `favorites` | Favorited games |
| `playlists` | Custom audio track playlists |

## Project Structure

```
src/
  screens/       # Main views (home, game-hub, feed, leaderboard, profile, auth)
  games/         # 27 game components (21 brain + 6 board)
  components/    # Shared UI (NavBar)
  hooks/         # useAudioEngine (Web Audio API)
  contexts/      # AuthContext (login/signup/session)
  lib/           # game-registry, convex client, avatars
  tracks/        # Audio track definitions
  types.ts       # TypeScript interfaces

convex/
  auth.ts        # Sign up, login, player search, avatar update
  games.ts       # Score saving, leaderboard queries
  feed.ts        # Activity feed and chat posts
  challenges.ts  # Player challenges
  schema.ts      # Database schema (7 tables)
```

## Deployment

Deployed on Netlify with SPA routing:

```bash
pnpm run build
pnpm exec netlify deploy --prod --dir=dist
```

Convex functions deploy separately:

```bash
pnpm run convex:deploy
```

## License

Private — all rights reserved.
