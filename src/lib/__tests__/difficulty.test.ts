import { describe, expect, test } from 'vitest';
import { difficultyForStage, DIFFICULTY_STYLE } from '../difficulty';

describe('difficultyForStage', () => {
  test('stages 1-3 are easy', () => {
    for (const s of [1, 2, 3]) expect(difficultyForStage(s)).toBe('easy');
  });

  test('stages 4-9 are medium', () => {
    for (const s of [4, 5, 6, 7, 8, 9]) expect(difficultyForStage(s)).toBe('medium');
  });

  test('stage 10 and beyond are hard', () => {
    for (const s of [10, 11, 50, 99]) expect(difficultyForStage(s)).toBe('hard');
  });

  test('the ramp never goes backwards', () => {
    const order = { easy: 0, medium: 1, hard: 2 };
    let prev = 0;
    for (let s = 1; s <= 99; s++) {
      const cur = order[difficultyForStage(s)];
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  test('every difficulty has display styling', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      expect(DIFFICULTY_STYLE[d].label).toBeTruthy();
      expect(DIFFICULTY_STYLE[d].className).toBeTruthy();
      expect(DIFFICULTY_STYLE[d].dot).toBeTruthy();
    }
  });
});
