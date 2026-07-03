# Release Notes — Noodle Quest v1.0

## Overview

Noodle Quest 1.0 is the "whole family" release: two brand-new 3D games, board-game opponents that actually think ahead, score challenges you can send to each other, fairer difficulty, real Scrabble dictionaries, and a friendlier look — on top of properly secured accounts.

## What's New

### 🧊 Two 3D games

- **Cube Twist** — a 3×3×3 twisty cube. Swipe across a face to turn that layer, drag the background to spin the whole cube, or use the U/D/L/R/F/B keys. Stages scale the scramble from 3 twists up to 20.
- **Score Four** — Connect Four in three dimensions. Drop beads onto a 4×4×4 grid of rods and line up four in *any* direction — 76 winning lines including space diagonals. Spin the board to spot them.

Both load their 3D engine only when opened, and devices without WebGL get a friendly fallback.

### ⚔️ Player challenges

Finish any game, tap **Challenge a player**, and send your score to beat. They'll see a challenge card on their home screen; when they play, the result — glory or heartbreak — posts to the family feed.

### 🧠 Smarter opponents, fairer difficulty

Every board-game AI was rebuilt with real search: Connect Four and Checkers look many moves ahead, Chess evaluates position (not just material), and hard Tic-Tac-Toe is now genuinely unbeatable. Difficulty follows the stage you're *playing* — so replaying stage 1 is always a gentle warm-up — and every stage shows its difficulty up front.

### 📖 Scrabble, fixed and expanded

The bug where valid words were rejected is fixed (the game silently used a tiny built-in word list while the real dictionary downloaded). You can now also choose your lexicon: **UK & International (SOWPODS)** or **US & Canada (TWL)** — and online games use the host's choice so everyone plays by the same words.

### 🏆 Rankings that stay interesting

Weekly and monthly boards alongside all-time, so there's a fresh race every Monday.

### 🔊 Game feel

Synthesized sound effects and vibration (toggle in your profile), confetti on wins, and per-move sounds in the board games.

### 🎲 Ludo, actually multiplayer

Online Ludo was advertised but never wired up — it now works, bonus rolls and captures included. The board math was also fixed (blue's route was accidentally half the length of red's).

### ♿ Accessibility

Keyboard play on chess and checkers boards, screen-reader announcements of game state, labelled grids, accessible dialogs, reduced-motion support, and pinch-zoom restored.

### 🔐 Under the hood

- PINs are hashed, sessions are token-based, and logins lock after repeated failures
- Installable as an app (PWA) with offline-aware caching
- 594 unit tests + Playwright end-to-end smoke tests on every PR
- Deploy previews finally work — every PR gets a playable URL

## Upgrade Notes

- Everyone is signed out once by the session upgrade — just log in again.
- If not yet done, run `npx convex run migrations:hashAllPins` against production and set `ADMIN_SECRET` in the Convex environment.

---

*For the OpenClaw bot-integration release notes that previously lived here, see the `[0.9.0]` section of CHANGELOG.md.*
