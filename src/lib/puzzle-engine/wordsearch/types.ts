import type { WordEntry } from '@/data/words/schema';

export type WSDirection = 'across' | 'down' | 'diagonal' | 'reverse' | 'diag-reverse';

export interface WSPlacement {
  word: string;
  cells: [number, number][];
  direction: WSDirection;
}

export interface WordSearchPuzzle {
  gridSize: number;
  grid: string[][];
  placements: WSPlacement[];
  directions: WSDirection[];
  metadata: {
    seed: number;
    fillRate: number;
    placedCount: number;
    rejected: string[];
  };
}

export interface WordSearchConfig {
  gridSize: number;
  directions: WSDirection[];
  seed: number;
  maxWords: number;
  allowOverlap: boolean;
  locale: string;
}

export const WS_DIFFICULTY_PRESETS = {
  easy: {
    gridSize: 8,
    directions: ['across', 'down'] as WSDirection[],
    allowOverlap: false,
    maxWords: 6,
  },
  medium: {
    gridSize: 10,
    directions: ['across', 'down', 'reverse'] as WSDirection[],
    allowOverlap: false,
    maxWords: 8,
  },
  hard: {
    gridSize: 12,
    directions: ['across', 'down', 'diagonal', 'reverse', 'diag-reverse'] as WSDirection[],
    allowOverlap: true,
    maxWords: 10,
  },
};
