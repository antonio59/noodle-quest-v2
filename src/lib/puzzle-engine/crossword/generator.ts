import type { WordEntry, ClueEntry } from '@/data/words/schema';
import type { CrosswordPuzzle, PlacedWord, CrosswordConfig, CandidateWord } from './types';
import { createRng, randInt, shuffleWithRng } from '../shared/prng';
import { buildBlankGrid, cloneGrid, inBounds } from '../shared/grid-utils';
import { scorePuzzle } from './scorer';

export function generateCrossword(
  words: WordEntry[],
  clues: ClueEntry[],
  config: Partial<CrosswordConfig> = {}
): CrosswordPuzzle {
  const cfg: CrosswordConfig = {
    gridSize: 9,
    seed: Date.now(),
    maxWords: 10,
    minCrossings: 1,
    targetDifficulty: 2,
    locale: 'en-GB',
    ...config,
  };

  const rng = createRng(cfg.seed);
  const clueMap = new Map<string, ClueEntry>();
  for (const c of clues) clueMap.set(c.wordId, c);

  const candidates = buildCandidates(words, clueMap, rng);
  const attemptLimit = 8000;
  let bestPuzzle: CrosswordPuzzle | null = null;
  let bestScore = -Infinity;
  let attempts = 0;
  const rejected: string[] = [];

  // Try several shuffles to find a good grid
  for (let round = 0; round < 40; round++) {
    if (attempts >= attemptLimit) break;
    const pool = shuffleWithRng(rng, candidates).slice(0, cfg.maxWords * 2);
    const placed: PlacedWord[] = [];
    const grid = buildBlankGrid<string>(cfg.gridSize, '');
    let numberAcc = 1;

    for (const cand of pool) {
      if (placed.length >= cfg.maxWords) break;
      if (attempts >= attemptLimit) break;
      attempts++;

      const result = tryPlaceWord(rng, grid, cfg.gridSize, cand, placed, numberAcc);
      if (result) {
        applyPlacement(grid, result);
        placed.push(result);
        numberAcc++;
      } else {
        rejected.push(cand.entry.answer);
      }
    }

    if (placed.length < 3) continue;
    const score = scorePuzzle(grid, placed, cfg.gridSize);
    if (score > bestScore) {
      bestScore = score;
      bestPuzzle = {
        gridSize: cfg.gridSize,
        words: placed,
        metadata: {
          seed: cfg.seed,
          score,
          fillRate: placed.reduce((sum, w) => sum + w.word.length, 0) / (cfg.gridSize * cfg.gridSize),
          attempts,
          rejected: [...new Set(rejected)].slice(0, 20),
        },
      };
    }
  }

  if (!bestPuzzle) {
    // Fallback: single word in centre
    const first = candidates[0];
    const across: PlacedWord = {
      id: first.entry.id,
      word: first.entry.answer,
      clue: first.clue.clue,
      row: Math.floor(cfg.gridSize / 2),
      col: Math.floor((cfg.gridSize - first.entry.answer.length) / 2),
      direction: 'across',
      number: 1,
    };
    bestPuzzle = {
      gridSize: cfg.gridSize,
      words: [across],
      metadata: {
        seed: cfg.seed,
        score: 0,
        fillRate: first.entry.length / (cfg.gridSize * cfg.gridSize),
        attempts,
        rejected: [],
      },
    };
  }

  return bestPuzzle;
}

function buildCandidates(words: WordEntry[], clueMap: Map<string, ClueEntry>, rng: () => number): CandidateWord[] {
  const list: CandidateWord[] = [];
  for (const w of words) {
    const clue = clueMap.get(w.id);
    if (!clue) continue;
    // Score by length and cross-potential (unique letters)
    const uniqueLetters = new Set(w.answer).size;
    const score = w.length * 10 + uniqueLetters * 20 + w.frequency * 0.5;
    list.push({ entry: w, clue, score });
  }
  return shuffleWithRng(rng, list.sort((a, b) => b.score - a.score));
}

function tryPlaceWord(
  rng: () => number,
  grid: string[][],
  size: number,
  cand: CandidateWord,
  placed: PlacedWord[],
  number: number
): PlacedWord | null {
  const word = cand.entry.answer.toUpperCase();
  const directions: Array<'across' | 'down'> = ['across', 'down'];

  // First word: centre horizontally
  if (placed.length === 0) {
    return {
      id: cand.entry.id,
      word,
      clue: cand.clue.clue,
      row: Math.floor(size / 2),
      col: Math.floor((size - word.length) / 2),
      direction: 'across',
      number,
    };
  }

  const options: PlacedWord[] = [];

  for (const dir of directions) {
    for (const existing of placed) {
      for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < existing.word.length; j++) {
          if (word[i] !== existing.word[j]) continue;
          const [r, c] = dir === 'across'
            ? [existing.row + j, existing.col - i]
            : [existing.row - i, existing.col + j];
          const placement: PlacedWord = {
            id: cand.entry.id,
            word,
            clue: cand.clue.clue,
            row: r,
            col: c,
            direction: dir,
            number,
          };
          if (isValidPlacement(grid, size, placement, placed)) {
            options.push(placement);
          }
        }
      }
    }
  }

  if (options.length === 0) return null;
  // Prefer placements that create more crossings
  options.sort((a, b) => {
    const ca = countCrossings(grid, a);
    const cb = countCrossings(grid, b);
    return cb - ca;
  });
  return options[0];
}

function isValidPlacement(
  grid: string[][],
  size: number,
  placement: PlacedWord,
  placed: PlacedWord[]
): boolean {
  const { row, col, direction, word } = placement;
  if (direction === 'across') {
    if (row < 0 || row >= size || col < 0 || col + word.length > size) return false;
  } else {
    if (col < 0 || col >= size || row < 0 || row + word.length > size) return false;
  }

  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    const existing = grid[r][c];
    if (existing) {
      if (existing !== word[i]) return false;
      crossings++;
    } else {
      // Check adjacent cells to prevent accidental words
      if (direction === 'across') {
        if (inBounds(size, r - 1, c) && grid[r - 1][c] && !isPartOfWord(r - 1, c, placed)) return false;
        if (inBounds(size, r + 1, c) && grid[r + 1][c] && !isPartOfWord(r + 1, c, placed)) return false;
      } else {
        if (inBounds(size, r, c - 1) && grid[r][c - 1] && !isPartOfWord(r, c - 1, placed)) return false;
        if (inBounds(size, r, c + 1) && grid[r][c + 1] && !isPartOfWord(r, c + 1, placed)) return false;
      }
    }
  }

  // Prevent extension of existing words: cell before start and after end must be empty
  if (direction === 'across') {
    if (inBounds(size, row, col - 1) && grid[row][col - 1]) return false;
    if (inBounds(size, row, col + word.length) && grid[row][col + word.length]) return false;
  } else {
    if (inBounds(size, row - 1, col) && grid[row - 1][col]) return false;
    if (inBounds(size, row + word.length, col) && grid[row + word.length][col]) return false;
  }

  // Must have at least one crossing after the first word
  if (placed.length > 0 && crossings === 0) return false;

  // No duplicate answers
  if (placed.some(p => p.word === word)) return false;

  return true;
}

function isPartOfWord(r: number, c: number, placed: PlacedWord[]): boolean {
  return placed.some(p => {
    for (let i = 0; i < p.word.length; i++) {
      const pr = p.direction === 'across' ? p.row : p.row + i;
      const pc = p.direction === 'across' ? p.col + i : p.col;
      if (pr === r && pc === c) return true;
    }
    return false;
  });
}

function countCrossings(grid: string[][], placement: PlacedWord): number {
  let count = 0;
  for (let i = 0; i < placement.word.length; i++) {
    const r = placement.direction === 'across' ? placement.row : placement.row + i;
    const c = placement.direction === 'across' ? placement.col + i : placement.col;
    if (grid[r][c]) count++;
  }
  return count;
}

function applyPlacement(grid: string[][], placement: PlacedWord): void {
  for (let i = 0; i < placement.word.length; i++) {
    const r = placement.direction === 'across' ? placement.row : placement.row + i;
    const c = placement.direction === 'across' ? placement.col + i : placement.col;
    grid[r][c] = placement.word[i];
  }
}
