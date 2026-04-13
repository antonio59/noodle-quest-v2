import type { WordEntry, ClueEntry } from '@/data/words/schema';

export type Direction = 'across' | 'down';

export interface PlacedWord {
  id: string;
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

export interface CrosswordPuzzle {
  gridSize: number;
  words: PlacedWord[];
  metadata: {
    seed: number;
    score: number;
    fillRate: number;
    attempts: number;
    rejected: string[];
  };
}

export interface CrosswordConfig {
  gridSize: number;
  seed: number;
  maxWords: number;
  minCrossings: number;
  targetDifficulty: number;
  locale: string;
}

export interface CandidateWord {
  entry: WordEntry;
  clue: ClueEntry;
  score: number;
}
