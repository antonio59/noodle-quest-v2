import { describe, it, expect } from 'vitest';
import { createRng, randInt, shuffleWithRng } from '../shared/prng';

describe('prng', () => {
  it('should be deterministic for the same seed', () => {
    const rng1 = createRng(12345);
    const rng2 = createRng(12345);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);
    expect(rng1()).not.toBe(rng2());
  });

  it('randInt should return values within range', () => {
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) {
      const v = randInt(rng, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('shuffleWithRng should preserve all elements', () => {
    const rng = createRng(99);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleWithRng(rng, arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(new Set(shuffled)).toEqual(new Set(arr));
  });
});
