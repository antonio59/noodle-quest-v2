// Pure Ludo rules and AI. No React or rendering concerns — unit-testable
// in isolation.
//
// Positions are RELATIVE to each side's own route:
//   -1        in base
//   0..47     on the shared 48-square track (distance traveled from entry)
//   48..53    own home stretch
//   54        home
// The shared-track squares convert to absolute board indices via each
// side's entry offset; captures and rendering work in absolute space.
//
// This replaces the original model, which used absolute positions with
// 52-square arithmetic on a 48-square track — blue's route came out at
// barely half of red's, and positions 48-51 had no board coordinates.

export type Side = 'red' | 'green' | 'yellow' | 'blue';

export const TRACK_LEN = 48;
export const STRETCH_START = 48; // first home-stretch square (relative)
export const HOME = 54;          // finished (relative)

export const RED_ENTRY = 0;
export const GREEN_ENTRY = 13;
export const BLUE_ENTRY = 24;
export const YELLOW_ENTRY = 39;

// (row, col) of each shared track square, walked clockwise from red's entry.
export const TRACK: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13],
  [7, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],
  [7, 0],
];

export const RED_STRETCH: [number, number][] = [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]];
export const BLUE_STRETCH: [number, number][] = [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]];
export const GREEN_STRETCH: [number, number][] = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]];
export const YELLOW_STRETCH: [number, number][] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]];

// Absolute track indices where pieces cannot be captured. Includes both
// entry squares plus evenly spread star squares.
export const SAFE_POSITIONS = new Set([0, 8, 13, 21, 24, 34, 39, 47]);

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function entryFor(side: Side): number {
  switch (side) {
    case 'red': return RED_ENTRY;
    case 'green': return GREEN_ENTRY;
    case 'yellow': return YELLOW_ENTRY;
    case 'blue': return BLUE_ENTRY;
  }
}

export function stretchFor(side: Side): [number, number][] {
  switch (side) {
    case 'red': return RED_STRETCH;
    case 'green': return GREEN_STRETCH;
    case 'yellow': return YELLOW_STRETCH;
    case 'blue': return BLUE_STRETCH;
  }
}

/** Sides seated for an N-player game. 2p keeps classic red vs blue. */
export function sidesForCount(n: number): Side[] {
  if (n <= 2) return ['red', 'blue'];
  if (n === 3) return ['red', 'green', 'blue'];
  return ['red', 'green', 'yellow', 'blue'];
}

/** 1-indexed seat after `seat` in an N-player clockwise rotation. */
export function nextSeat(seat: number, n: number): number {
  return (seat % n) + 1;
}

/** Absolute track index for a relative position, or -1 if off the shared track. */
export function toAbsolute(rel: number, entry: number): number {
  if (rel < 0 || rel >= STRETCH_START) return -1;
  return (entry + rel) % TRACK_LEN;
}

/**
 * Advance a relative position by `steps`. Returns the new position, the
 * same position when the move is impossible (needs a 6 to leave base, or
 * would overshoot home), where callers detect "no movement".
 */
export function advance(rel: number, steps: number): number {
  if (rel === -1) return steps === 6 ? 0 : -1;
  const next = rel + steps;
  return next > HOME ? rel : next;
}

/** Indices of pieces that can move with die value `d`. */
export function getMovableIndices(pieces: number[], d: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const pos = pieces[i];
    if (pos >= HOME) continue;
    const np = advance(pos, d);
    if (np === pos || np === -1) continue;
    result.push(i);
  }
  return result;
}

/**
 * Opponent piece indices captured by landing on relative square
 * `moverRel`. Nothing is captured on safe squares, in the stretch, or in
 * base.
 */
export function capturedIndices(
  moverRel: number,
  moverEntry: number,
  oppPieces: number[],
  oppEntry: number,
): number[] {
  const abs = toAbsolute(moverRel, moverEntry);
  if (abs < 0 || SAFE_POSITIONS.has(abs)) return [];
  const out: number[] = [];
  for (let i = 0; i < oppPieces.length; i++) {
    if (toAbsolute(oppPieces[i], oppEntry) === abs) out.push(i);
  }
  return out;
}

/** Board coordinate for a relative position. */
export function posCoord(rel: number, entry: number, stretch: [number, number][]): [number, number] {
  if (rel < 0) return [-1, -1];
  if (rel < STRETCH_START) return TRACK[toAbsolute(rel, entry)];
  if (rel < HOME) return stretch[rel - STRETCH_START];
  return [7, 7];
}

// ── AI ─────────────────────────────────────────────────────────────────
// Ludo is a dice game, so the AI is a move-selection heuristic rather
// than a search: capture when possible, finish pieces, stay out of
// danger, prefer safe squares, keep pieces flowing out of the base.

/** True if an opponent piece could capture a piece on `abs` with one roll. */
function isThreatened(abs: number, oppPieces: number[], oppEntry: number): boolean {
  if (abs < 0 || SAFE_POSITIONS.has(abs)) return false;
  for (const opp of oppPieces) {
    const oppAbs = toAbsolute(opp, oppEntry);
    if (oppAbs < 0) continue;
    const gap = (abs - oppAbs + TRACK_LEN) % TRACK_LEN;
    // The opponent would also need to still be on the track for those
    // steps (not turned into its stretch); this is a close approximation.
    if (gap >= 1 && gap <= 6 && opp + gap < STRETCH_START) return true;
  }
  return false;
}

export function scoreAiMove(
  fromRel: number,
  d: number,
  aiEntry: number,
  oppPieces: number[],
  oppEntry: number,
): number {
  const toRel = advance(fromRel, d);
  let score = 0;

  if (toRel >= HOME) score += 400;                       // finish a piece
  else if (toRel >= STRETCH_START) score += 200;         // enter the stretch

  if (fromRel === -1 && toRel === 0) score += 150;       // leave the base

  if (capturedIndices(toRel, aiEntry, oppPieces, oppEntry).length > 0) score += 500;

  const toAbs = toAbsolute(toRel, aiEntry);
  if (toAbs >= 0 && SAFE_POSITIONS.has(toAbs)) score += 60;

  // Escaping danger is good; walking into it is bad.
  const fromAbs = toAbsolute(fromRel, aiEntry);
  if (fromAbs >= 0 && isThreatened(fromAbs, oppPieces, oppEntry)) score += 80;
  if (toAbs >= 0 && isThreatened(toAbs, oppPieces, oppEntry)) score -= 70;

  // Mild preference for advancing the furthest piece.
  score += Math.max(fromRel, 0) * 0.5;

  return score;
}

export type AILevel = 'easy' | 'medium' | 'hard';

// Chance of ignoring the heuristic and moving a random piece instead.
const BLUNDER_CHANCE: Record<AILevel, number> = {
  easy: 0.45,
  medium: 0.15,
  hard: 0,
};

/** Pick which piece the AI should move for die `d`, or -1 if none can. */
export function chooseAiMove(
  aiPieces: number[],
  d: number,
  aiEntry: number,
  oppPieces: number[],
  oppEntry: number,
  difficulty: AILevel = 'hard',
): number {
  const movable = getMovableIndices(aiPieces, d);
  if (movable.length === 0) return -1;

  if (Math.random() < BLUNDER_CHANCE[difficulty]) {
    return movable[Math.floor(Math.random() * movable.length)];
  }

  let bestIdx = movable[0];
  let best = -Infinity;
  for (const i of movable) {
    const s = scoreAiMove(aiPieces[i], d, aiEntry, oppPieces, oppEntry);
    if (s > best) {
      best = s;
      bestIdx = i;
    }
  }
  return bestIdx;
}
