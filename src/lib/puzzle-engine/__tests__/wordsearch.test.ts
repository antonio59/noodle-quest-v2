import { describe, it, expect } from 'vitest';
import { generateWordSearch } from '../wordsearch/generator';
import { EN_GB_CORE_WORDS } from '@/data/words/en-gb-core';

describe('wordsearch generator', () => {
  it('should place words within bounds', () => {
    const puzzle = generateWordSearch(EN_GB_CORE_WORDS, {
      gridSize: 10,
      seed: 12345,
      maxWords: 6,
      locale: 'en-GB',
    });
    for (const p of puzzle.placements) {
      for (const [r, c] of p.cells) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(puzzle.gridSize);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(puzzle.gridSize);
      }
    }
  });

  it('should fill the grid completely', () => {
    const puzzle = generateWordSearch(EN_GB_CORE_WORDS, {
      gridSize: 8,
      seed: 12345,
      maxWords: 4,
      locale: 'en-GB',
    });
    for (let r = 0; r < puzzle.gridSize; r++) {
      for (let c = 0; c < puzzle.gridSize; c++) {
        expect(puzzle.grid[r][c]).toMatch(/^[A-Z]$/);
      }
    }
  });

  it('should be deterministic for the same seed', () => {
    const p1 = generateWordSearch(EN_GB_CORE_WORDS, {
      gridSize: 10,
      seed: 55555,
      maxWords: 5,
      locale: 'en-GB',
    });
    const p2 = generateWordSearch(EN_GB_CORE_WORDS, {
      gridSize: 10,
      seed: 55555,
      maxWords: 5,
      locale: 'en-GB',
    });
    expect(p1.placements.map(p => p.word)).toEqual(p2.placements.map(p => p.word));
  });
});
