import type { WordEntry } from '@/data/words/schema';
import type { WordSearchPuzzle, WSPlacement, WordSearchConfig, WSDirection } from './types';
import { createRng, randInt, shuffleWithRng } from '../shared/prng';
import { buildBlankGrid, fillRandomWeighted } from '../shared/grid-utils';

export function generateWordSearch(
  words: WordEntry[],
  config: Partial<WordSearchConfig> = {}
): WordSearchPuzzle {
  const cfg: WordSearchConfig = {
    gridSize: 10,
    directions: ['across', 'down', 'reverse'],
    seed: Date.now(),
    maxWords: 8,
    allowOverlap: false,
    locale: 'en-GB',
    ...config,
  };

  const rng = createRng(cfg.seed);
  const pool = shuffleWithRng(rng, words.filter(w => w.length <= cfg.gridSize))
    .slice(0, cfg.maxWords * 2);

  const grid = buildBlankGrid<string>(cfg.gridSize, '');
  const placements: WSPlacement[] = [];
  const rejected: string[] = [];

  for (const entry of pool) {
    if (placements.length >= cfg.maxWords) break;
    const word = entry.answer.toUpperCase();
    const dirs = shuffleWithRng(rng, cfg.directions);
    let placed = false;
    for (const dir of dirs) {
      const cells = findPlacement(rng, grid, cfg.gridSize, word, dir, cfg.allowOverlap);
      if (cells) {
        cells.forEach(([r, c], i) => {
          grid[r][c] = word.charAt(i);
        });
        placements.push({ word, cells, direction: dir });
        placed = true;
        break;
      }
    }
    if (!placed) rejected.push(word);
  }

  // Build weighted letter fill from placed words
  const histogram: Record<string, number> = {};
  for (const p of placements) {
    for (const ch of p.word) {
      histogram[ch] = (histogram[ch] ?? 0) + 1;
    }
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const ch of letters) {
    if (!histogram[ch]) histogram[ch] = 1;
  }

  fillRandomWeighted(grid, rng, histogram);

  const usedCells = placements.reduce((sum, p) => sum + p.word.length, 0);

  return {
    gridSize: cfg.gridSize,
    grid,
    placements,
    directions: cfg.directions,
    metadata: {
      seed: cfg.seed,
      fillRate: usedCells / (cfg.gridSize * cfg.gridSize),
      placedCount: placements.length,
      rejected: [...new Set(rejected)].slice(0, 20),
    },
  };
}

function findPlacement(
  rng: () => number,
  grid: string[][],
  size: number,
  word: string,
  direction: WSDirection,
  allowOverlap: boolean
): [number, number][] | null {
  const vectors: Record<WSDirection, [number, number]> = {
    across: [0, 1],
    down: [1, 0],
    diagonal: [1, 1],
    reverse: [0, -1],
    'diag-reverse': [1, -1],
  };
  const [dr, dc] = vectors[direction];

  const maxRow = direction === 'across' || direction === 'reverse'
    ? size - 1
    : size - word.length;
  const minCol = direction === 'reverse' || direction === 'diag-reverse'
    ? word.length - 1
    : 0;
  const maxCol = direction === 'reverse' || direction === 'diag-reverse'
    ? size - 1
    : size - word.length;
  const minRow = 0;
  const maxRowBound = maxRow;

  const options: [number, number][][] = [];

  for (let r = minRow; r <= maxRowBound; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        const existing = grid[rr][cc];
        if (existing) {
          if (!allowOverlap || existing !== word[i]) {
            ok = false;
            break;
          }
        }
        cells.push([rr, cc]);
      }
      if (ok) options.push(cells);
    }
  }

  if (options.length === 0) return null;
  return options[randInt(rng, 0, options.length - 1)];
}
