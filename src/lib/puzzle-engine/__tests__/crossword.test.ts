import { describe, it, expect } from 'vitest';
import { generateCrossword } from '../crossword/generator';
import { EN_GB_CORE_WORDS, EN_GB_CORE_CLUES } from '@/data/words/en-gb-core';

describe('crossword generator', () => {
  it('should generate a puzzle with at least one word', () => {
    const puzzle = generateCrossword(EN_GB_CORE_WORDS, EN_GB_CORE_CLUES, {
      gridSize: 9,
      seed: 12345,
      maxWords: 6,
      locale: 'en-GB',
    });
    expect(puzzle.words.length).toBeGreaterThan(0);
  });

  it('should not have duplicate answers', () => {
    const puzzle = generateCrossword(EN_GB_CORE_WORDS, EN_GB_CORE_CLUES, {
      gridSize: 9,
      seed: 12345,
      maxWords: 8,
      locale: 'en-GB',
    });
    const words = puzzle.words.map(w => w.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it('should place words within bounds', () => {
    const puzzle = generateCrossword(EN_GB_CORE_WORDS, EN_GB_CORE_CLUES, {
      gridSize: 9,
      seed: 12345,
      maxWords: 8,
      locale: 'en-GB',
    });
    for (const w of puzzle.words) {
      if (w.direction === 'across') {
        expect(w.col + w.word.length).toBeLessThanOrEqual(puzzle.gridSize);
      } else {
        expect(w.row + w.word.length).toBeLessThanOrEqual(puzzle.gridSize);
      }
      expect(w.row).toBeGreaterThanOrEqual(0);
      expect(w.col).toBeGreaterThanOrEqual(0);
    }
  });

  it('should produce consistent puzzles for the same seed', () => {
    const p1 = generateCrossword(EN_GB_CORE_WORDS, EN_GB_CORE_CLUES, {
      gridSize: 9,
      seed: 11111,
      maxWords: 5,
      locale: 'en-GB',
    });
    const p2 = generateCrossword(EN_GB_CORE_WORDS, EN_GB_CORE_CLUES, {
      gridSize: 9,
      seed: 11111,
      maxWords: 5,
      locale: 'en-GB',
    });
    expect(p1.words.map(w => w.word)).toEqual(p2.words.map(w => w.word));
  });
});
