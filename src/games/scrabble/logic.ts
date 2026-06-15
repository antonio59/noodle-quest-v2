// Pure Scrabble rules: board layout, scoring, move generation, AI.
// No React or rendering concerns — unit-testable in isolation.
import { VALID_WORDS } from './words';

// ── Tile data ──────────────────────────────────────────────────────────
export const TILE_SCORES: Record<string, number> = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,
};
export const TILE_COUNTS: Record<string, number> = {
  A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,
  N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1,
};

// ── Standard 15×15 Scrabble board ──────────────────────────────────────
export const SIZE = 15;
export const CENTER = 7;

export type BonusType = 'TW' | 'DW' | 'TL' | 'DL' | 'ST';

function buildBonusMap(): Map<string, BonusType> {
  const m = new Map<string, BonusType>();
  const set = (r: number, c: number, b: BonusType) => {
    for (const [mr, mc] of [
      [r, c], [r, 14 - c], [14 - r, c], [14 - r, 14 - c],
      [c, r], [c, 14 - r], [14 - c, r], [14 - c, 14 - r],
    ]) {
      m.set(`${mr},${mc}`, b);
    }
  };
  set(0, 0, 'TW');
  set(0, 7, 'TW');
  set(1, 1, 'DW'); set(2, 2, 'DW'); set(3, 3, 'DW'); set(4, 4, 'DW');
  set(1, 5, 'TL'); set(5, 1, 'TL'); set(5, 5, 'TL');
  set(0, 3, 'DL'); set(2, 6, 'DL'); set(3, 0, 'DL'); set(3, 7, 'DL');
  set(6, 2, 'DL'); set(6, 6, 'DL'); set(7, 3, 'DL');
  m.set(`${CENTER},${CENTER}`, 'ST');
  return m;
}

export const BONUS_MAP = buildBonusMap();

// Module-level mutable reference — swapped to full dictionary once loaded.
let ACTIVE_WORD_SET: Set<string> = VALID_WORDS;

export function getActiveWordSet(): Set<string> {
  return ACTIVE_WORD_SET;
}

export function setActiveWordSet(words: Set<string>): void {
  ACTIVE_WORD_SET = words;
}

export function buildTilePool(): string[] {
  const pool: string[] = [];
  for (const [letter, count] of Object.entries(TILE_COUNTS)) {
    for (let i = 0; i < count; i++) pool.push(letter);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// ── AI move generation ─────────────────────────────────────────────────
export type Direction = 'H' | 'V';
export type Placement = { word: string; cells: [number, number][]; newCells: { r: number; c: number; letter: string }[]; score: number };

function letterCount(arr: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of arr) m.set(l, (m.get(l) ?? 0) + 1);
  return m;
}

export function findAnchors(board: (string | null)[][]): [number, number][] {
  const anchors: [number, number][] = [];
  let any = false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c]) { any = true; continue; }
      // adjacent to a placed tile?
      if (
        (r > 0 && board[r - 1][c]) ||
        (r < SIZE - 1 && board[r + 1][c]) ||
        (c > 0 && board[r][c - 1]) ||
        (c < SIZE - 1 && board[r][c + 1])
      ) {
        anchors.push([r, c]);
      }
    }
  }
  if (!any) return [[CENTER, CENTER]];
  return anchors;
}

export function scorePlacement(
  board: (string | null)[][],
  cells: [number, number][],
  newCellSet: Set<string>,
  newCellLetters?: Map<string, string>,
): number {
  let wordMult = 1;
  let letterTotal = 0;
  for (const [r, c] of cells) {
    const bonus = BONUS_MAP.get(`${r},${c}`);
    const key = `${r},${c}`;
    const letter = newCellLetters?.get(key) ?? board[r][c]!;
    const ls = TILE_SCORES[letter] || 0;
    const isNew = newCellSet.has(key);
    if (isNew && bonus === 'DL') letterTotal += ls * 2;
    else if (isNew && bonus === 'TL') letterTotal += ls * 3;
    else letterTotal += ls;
    if (isNew && bonus === 'DW') wordMult *= 2;
    if (isNew && (bonus === 'TW' || bonus === 'ST')) wordMult *= 3;
  }
  return letterTotal * wordMult;
}

// Validate cross-words formed perpendicular to a horizontal/vertical placement.
// Returns total bonus score from all valid cross-words, or -1 if any invalid.
export function validateAndScoreCrossWords(
  board: (string | null)[][],
  newCells: { r: number; c: number; letter: string }[],
  mainDir: Direction,
): number {
  let crossScore = 0;
  for (const { r, c, letter } of newCells) {
    // Cross direction is perpendicular to mainDir
    const isVert = mainDir === 'H';
    let sr = r, sc = c;
    if (isVert) {
      while (sr > 0 && board[sr - 1][c]) sr--;
    } else {
      while (sc > 0 && board[r][sc - 1]) sc--;
    }
    const wordCells: [number, number][] = [];
    let wr = sr, wc = sc;
    if (isVert) {
      while (wr < SIZE && (board[wr][c] || (wr === r && letter))) { wordCells.push([wr, c]); wr++; }
    } else {
      while (wc < SIZE && (board[r][wc] || (wc === c && letter))) { wordCells.push([r, wc]); wc++; }
    }
    if (wordCells.length < 2) continue; // single letter, no cross-word
    // Build the word
    const word = wordCells.map(([rr, cc]) => (rr === r && cc === c) ? letter : board[rr][cc]!).join('');
    if (!ACTIVE_WORD_SET.has(word)) return -1;
    // Score the cross-word with bonuses for the new letter only
    let wm = 1;
    let lt = 0;
    for (const [rr, cc] of wordCells) {
      const isThisCellNew = (rr === r && cc === c);
      const ls = TILE_SCORES[isThisCellNew ? letter : board[rr][cc]!] || 0;
      const bonus = BONUS_MAP.get(`${rr},${cc}`);
      if (isThisCellNew && bonus === 'DL') lt += ls * 2;
      else if (isThisCellNew && bonus === 'TL') lt += ls * 3;
      else lt += ls;
      if (isThisCellNew && bonus === 'DW') wm *= 2;
      if (isThisCellNew && (bonus === 'TW' || bonus === 'ST')) wm *= 3;
    }
    crossScore += lt * wm;
  }
  return crossScore;
}

export function generateAiMoves(
  board: (string | null)[][],
  rack: string[],
  isFirstMove: boolean,
): Placement[] {
  const anchors = findAnchors(board);
  const rackCount = letterCount(rack);
  const moves: Placement[] = [];

  // Filter words to those whose letters could plausibly be formed from rack + board letters.
  // For first move, must be formable from rack alone.
  const candidates: string[] = [];
  for (const word of ACTIVE_WORD_SET) {
    if (word.length < 2 || word.length > 7 + 7) continue;
    if (isFirstMove) {
      // Must be ≤ rack.length and use only rack letters
      if (word.length > rack.length) continue;
      const need = letterCount(word.split(''));
      let ok = true;
      for (const [l, n] of need) {
        if ((rackCount.get(l) ?? 0) < n) { ok = false; break; }
      }
      if (ok) candidates.push(word);
    } else {
      // Word uses up to (rack.length) new tiles. Quick filter: check that letters not in
      // board that the word needs ≤ rack capacity. Skip exact filter (slow); validate later.
      candidates.push(word);
    }
  }

  for (const word of candidates) {
    for (const anchor of anchors) {
      for (const dir of ['H', 'V'] as Direction[]) {
        for (let offset = 0; offset < word.length; offset++) {
          const startR = dir === 'V' ? anchor[0] - offset : anchor[0];
          const startC = dir === 'H' ? anchor[1] - offset : anchor[1];
          const endR = dir === 'V' ? startR + word.length - 1 : startR;
          const endC = dir === 'H' ? startC + word.length - 1 : startC;
          if (startR < 0 || startC < 0 || endR >= SIZE || endC >= SIZE) continue;

          // Cell BEFORE start must be empty (or off-board) — otherwise word extends backward
          const beforeR = dir === 'V' ? startR - 1 : startR;
          const beforeC = dir === 'H' ? startC - 1 : startC;
          if (beforeR >= 0 && beforeC >= 0 && beforeR < SIZE && beforeC < SIZE && board[beforeR][beforeC]) continue;

          // Cell AFTER end must be empty (or off-board)
          const afterR = dir === 'V' ? endR + 1 : endR;
          const afterC = dir === 'H' ? endC + 1 : endC;
          if (afterR >= 0 && afterC >= 0 && afterR < SIZE && afterC < SIZE && board[afterR][afterC]) continue;

          // Walk the placement
          const cells: [number, number][] = [];
          const newCells: { r: number; c: number; letter: string }[] = [];
          const needed = new Map<string, number>();
          let usesAnchor = false;
          let conflicts = false;
          let touchesBoard = false;
          for (let i = 0; i < word.length; i++) {
            const r = dir === 'V' ? startR + i : startR;
            const c = dir === 'H' ? startC + i : startC;
            cells.push([r, c]);
            const existing = board[r][c];
            if (existing) {
              if (existing !== word[i]) { conflicts = true; break; }
              touchesBoard = true;
            } else {
              newCells.push({ r, c, letter: word[i] });
              needed.set(word[i], (needed.get(word[i]) ?? 0) + 1);
            }
            if (r === anchor[0] && c === anchor[1]) usesAnchor = true;
          }
          if (conflicts || !usesAnchor) continue;
          if (newCells.length === 0) continue; // no new tiles → not a play
          if (!isFirstMove && !touchesBoard) continue; // must touch existing
          if (isFirstMove && !cells.some(([r, c]) => r === CENTER && c === CENTER)) continue;

          // Rack supply check
          let rackOk = true;
          for (const [l, n] of needed) {
            if ((rackCount.get(l) ?? 0) < n) { rackOk = false; break; }
          }
          if (!rackOk) continue;

          // Validate cross-words
          const crossBonus = validateAndScoreCrossWords(board, newCells, dir);
          if (crossBonus < 0) continue;

          // Score main word
          const newCellSet = new Set(newCells.map(nc => `${nc.r},${nc.c}`));
          const newCellMap = new Map(newCells.map(nc => [`${nc.r},${nc.c}`, nc.letter]));
          const mainScore = scorePlacement(board, cells, newCellSet, newCellMap);
          const all7Bonus = newCells.length === 7 ? 50 : 0;
          const total = mainScore + crossBonus + all7Bonus;

          moves.push({ word, cells, newCells, score: total });
        }
      }
    }
  }
  return moves;
}

export function pickAiMove(moves: Placement[], difficulty: 'easy' | 'medium' | 'hard'): Placement | null {
  if (moves.length === 0) return null;
  const sorted = [...moves].sort((a, b) => b.score - a.score);
  if (difficulty === 'hard') return sorted[0];
  if (difficulty === 'medium') {
    // pick from top half
    const top = Math.max(1, Math.floor(sorted.length / 2));
    return sorted[Math.floor(Math.random() * top)];
  }
  // easy: pick from bottom-third
  const start = Math.floor(sorted.length * 2 / 3);
  return sorted[start + Math.floor(Math.random() * (sorted.length - start))];
}

// ── Score breakdown helper ─────────────────────────────────────────────
export interface ScoreBreakdown {
  word: string;
  mainWordScore: number;
  crossWordsScore: number;
  bingoBonus: number;
  total: number;
  details: string[];
}

export function buildScoreBreakdown(
  board: (string | null)[][],
  wordCells: [number, number][],
  newCellSet: Set<string>,
  crossScore: number,
  all7Bonus: number,
): ScoreBreakdown {
  const word = wordCells.map(([r, c]) => board[r][c]).join('');
  let wordMult = 1;
  let letterTotal = 0;
  const details: string[] = [];

  for (const [r, c] of wordCells) {
    const bonus = BONUS_MAP.get(`${r},${c}`);
    const letter = board[r][c]!;
    const ls = TILE_SCORES[letter] || 0;
    const isNew = newCellSet.has(`${r},${c}`);
    let pts = ls;
    if (isNew && bonus === 'DL') { pts = ls * 2; details.push(`${letter} on DL = ${pts}`); }
    else if (isNew && bonus === 'TL') { pts = ls * 3; details.push(`${letter} on TL = ${pts}`); }
    else if (isNew && bonus === 'DW') { wordMult *= 2; details.push(`${letter} on DW`); }
    else if (isNew && (bonus === 'TW' || bonus === 'ST')) { wordMult *= 3; details.push(`${letter} on ${bonus === 'ST' ? '★' : 'TW'}`); }
    letterTotal += pts;
  }
  const mainScore = letterTotal * wordMult;
  if (wordMult > 1) details.push(`×${wordMult} word multiplier`);

  return {
    word,
    mainWordScore: mainScore,
    crossWordsScore: crossScore,
    bingoBonus: all7Bonus,
    total: mainScore + crossScore + all7Bonus,
    details,
  };
}
