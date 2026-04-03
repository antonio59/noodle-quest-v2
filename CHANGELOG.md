# Changelog

All notable changes to Noodle Quest will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- 8 new games for ages 7-14: Odd One Out, Code Breaker, Emoji Pictionary,
  Shape Rotation, Trivia Quest, Mindfulness Jar, Simon Says, Word Chain
- Responsive game grid: 2 cols on mobile, 3 on tablet, 4 on desktop
- Duel tab in Challenges page with 10 duel-capable games and direct play shortcuts
- Local 2-player mode support for board games (Snakes & Ladders, Checkers, Connect 4, Tic Tac Toe)
- Redesigned Snakes & Ladders: visible snakes (🐍) and ladders (🪜) on board, proper dice roll animation, AI opponent
- Chat tab scrolling fix (min-h-0 on scroll container)
- Game cards sorted alphabetically in game hub
- Stage selector (← →) in game header during gameplay
- 20 stage names: Rookie → Beginner → ... → Cosmic
- Replay Stage button (replaces generic "Play Again")
- Game component remounts on stage change for clean resets
- Endless play: navigate to any stage from the end screen
- 20 stages for all 27 games (up from 10), with smooth difficulty curves
- 4 new cognitive games: Sudoku (4x4→9x9), Tetris Drop, Word Search, Boggle Rush
- My Favourite Games section on Home screen (star games from any tab)
- Notifications system with @mention alerts and badge achievement posts
- Reply feature in chat with @mention autocomplete
- 24 achievement badges (up from 11) with activity feed posts
- Board Games and Breathe tabs inside Games screen with benefit descriptions
- Board games unlock progress with shortcuts to remaining games
- Combined emoji picker (60 emojis) + GIF search (kid-safe rating=g)

### Fixed
- @mention autocomplete now shows all players when typing @ (not just 2+ chars)
- GIF search now works with VITE_GIPHY_API_KEY from Netlify env vars
- Home page stars, streak, and games played now fetch real data from Convex
- Squish Lab stage 8+ blank screen (game now ends properly)
- Lint errors resolved before every deploy
- Duplicate emoji/sticker pickers merged into one

### Changed
- GIF search with GIPHY API (kid-safe `rating=g` filter)
- Sticker picker (40 kid-friendly emojis)
- Emoji picker (30 popular emojis)
- Board games screen with locked/unlocked states
- Breathe tab with 4 breathing exercises (Box Breathing, 4-7-8 Relax, Calm Down, Focus Flow)
- Profile stats from Convex (stars, games played, streak, max stage)
- 11 achievement badges in profile (First Steps, Star Collector, Rising Star, Superstar, Legend, GOAT, Perfectionist, Gamer, Addict, Completionist, Marathon)
- `getPlayerStats` Convex query for player statistics
- Random Stage button on home screen (surprise me!)
- Daily challenge card on home screen

### Changed
- Full rebuild from vanilla JS to Vite + React + TypeScript + Tailwind
- 22 brain games migrated to React components
- Convex backend updated with new schema (favorites, playlists tables)
- Leaderboard podium order (gold → silver → bronze, left to right)
- Feed fetches 100 posts (up from 50)
- Profile avatar picker prevents selecting avatars in use by other players
- NavBar expanded to 8 tabs (Home, Games, Board, Breathe, Duel, Ranks, Chat, Profile)

### Fixed
- Audio tracks now play (await `AudioContext.resume()`)
- Leaderboard sort order (higher stars rank higher)
- Build errors from `useCallback` React Compiler memoization
- Lint errors (unused imports, impure functions, async effects)
- `.env` and `convex/_generated` removed from git tracking

### Removed
- Vite template boilerplate
- Old vanilla JS game files (migrated to React)

---

## [v1.0.0] — 2025-12-15

### Added
- 19 brain training games (focus, memory, motor, flexibility, social, sequence)
- 5 board games (Snakes & Ladders, Ludo, Checkers, Dominoes, Chess)
- Convex backend (auth, scores, progress, challenges, feed, board games)
- Name + PIN authentication
- Avatar selection (15 emojis)
- Leaderboard with podium display
- Challenges system (send/receive/respond)
- Chat feed with @mentions
- Emoji picker, GIF picker, sticker picker
- Achievement badges (12 total)
- Category filters on home screen
- Stage progression (10 stages per game)
- Star ratings (0-3 per stage)
- Daily challenges
- Feed with activity and chat tabs

### Tech Stack
- Vanilla JS SPA (no framework)
- Convex backend (real-time database)
- Tailwind CSS
- Netlify hosting
