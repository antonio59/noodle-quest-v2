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
