import { describe, expect, test } from 'vitest';
import {
  N, LINES, idx, newBoard, landingY, drop, legalRods, isFull,
  winningLine, evaluate, bestRod,
  type Board, type Player,
} from '../logic';

describe('geometry', () => {
  test('there are exactly 76 winning lines', () => {
    // The known count for 4×4×4: 48 axis lines + 24 face diagonals + 4 space diagonals
    expect(LINES).toHaveLength(76);
  });

  test('every line has 4 distinct in-range cells', () => {
    for (const line of LINES) {
      expect(line).toHaveLength(4);
      expect(new Set(line).size).toBe(4);
      for (const i of line) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(N * N * N);
      }
    }
  });

  test('no duplicate lines', () => {
    const keys = new Set(LINES.map(l => [...l].sort((a, b) => a - b).join(',')));
    expect(keys.size).toBe(76);
  });
});

describe('gravity', () => {
  test('beads stack from the bottom of a rod', () => {
    const b = newBoard();
    expect(drop(b, 1, 2, 1)).toBe(0);
    expect(drop(b, 1, 2, 2)).toBe(1);
    expect(drop(b, 1, 2, 1)).toBe(2);
    expect(b[idx(1, 0, 2)]).toBe(1);
    expect(b[idx(1, 1, 2)]).toBe(2);
  });

  test('a full rod rejects drops and leaves the legal list', () => {
    const b = newBoard();
    for (let i = 0; i < N; i++) drop(b, 0, 0, 1);
    expect(landingY(b, 0, 0)).toBe(-1);
    expect(drop(b, 0, 0, 2)).toBe(-1);
    expect(legalRods(b).some(r => r.x === 0 && r.z === 0)).toBe(false);
  });

  test('isFull detects a packed board', () => {
    const b = newBoard();
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) {
      drop(b, x, z, ((x + z + y) % 2 + 1) as Player);
    }
    expect(isFull(b)).toBe(true);
  });
});

describe('win detection', () => {
  test('vertical rod of four', () => {
    const b = newBoard();
    for (let i = 0; i < 4; i++) drop(b, 2, 1, 1);
    expect(winningLine(b, 1)).not.toBeNull();
  });

  test('flat horizontal line', () => {
    const b = newBoard();
    for (let x = 0; x < 4; x++) drop(b, x, 0, 2);
    expect(winningLine(b, 2)).not.toBeNull();
    expect(winningLine(b, 1)).toBeNull();
  });

  test('space diagonal', () => {
    const b = newBoard();
    // (0,0,0),(1,1,1),(2,2,2),(3,3,3) via direct placement
    for (let i = 0; i < 4; i++) b[idx(i, i, i)] = 1;
    expect(winningLine(b, 1)).not.toBeNull();
  });

  test('no false positives on a mixed line', () => {
    const b = newBoard();
    b[idx(0, 0, 0)] = 1; b[idx(1, 0, 0)] = 1; b[idx(2, 0, 0)] = 2; b[idx(3, 0, 0)] = 1;
    expect(winningLine(b, 1)).toBeNull();
  });
});

describe('bestRod — tactics', () => {
  test.each(['easy', 'medium', 'hard'] as const)('%s takes an immediate win', level => {
    const b = newBoard();
    for (let i = 0; i < 3; i++) drop(b, 3, 3, 2); // three stacked, one to win
    for (let i = 0; i < 10; i++) {
      const rod = bestRod(b, 2, level)!;
      expect(rod).toEqual({ x: 3, z: 3 });
    }
  });

  test.each(['medium', 'hard'] as const)('%s blocks an immediate vertical threat', level => {
    const b = newBoard();
    for (let i = 0; i < 3; i++) drop(b, 0, 0, 1); // player one from winning
    drop(b, 3, 3, 2);
    const rod = bestRod(b, 2, level)!;
    expect(rod).toEqual({ x: 0, z: 0 });
  });

  test('hard blocks a flat horizontal threat with only one completion', () => {
    const b = newBoard();
    // Player at (0,0),(1,0),(2,0) on the floor — only completion is (3,0)
    drop(b, 0, 0, 1); drop(b, 1, 0, 1); drop(b, 2, 0, 1);
    drop(b, 1, 1, 2); drop(b, 2, 2, 2);
    const rod = bestRod(b, 2, 'hard')!;
    expect(rod).toEqual({ x: 3, z: 0 });
  });

  test('never returns an illegal rod', () => {
    const b = newBoard();
    for (let i = 0; i < N; i++) { drop(b, 0, 0, 1); drop(b, 1, 1, 2); }
    for (let i = 0; i < 30; i++) {
      const rod = bestRod(b, 1, 'easy')!;
      expect(landingY(b, rod.x, rod.z)).toBeGreaterThanOrEqual(0);
    }
  });

  test('returns null on a full board', () => {
    const b = newBoard();
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) {
      drop(b, x, z, ((x * 7 + z * 3 + y) % 2 + 1) as Player);
    }
    expect(bestRod(b, 1, 'hard')).toBeNull();
  });

  // A full game of depth-4 search needs headroom on slow CI runners
  test('hard beats a greedy 1-ply opponent', { timeout: 30000 }, () => {
    // Greedy: win if possible, block if possible, else first legal rod.
    const greedy = (b: Board, me: Player, enemy: Player) => {
      const rods = legalRods(b);
      for (const target of [me, enemy]) {
        for (const { x, z } of rods) {
          const y = drop(b, x, z, target);
          const won = winningLine(b, target) !== null;
          b[idx(x, y, z)] = 0;
          if (won) return { x, z };
        }
      }
      return rods[0];
    };

    const b = newBoard();
    let result: 'ai' | 'greedy' | 'draw' | null = null;
    for (let turn = 0; turn < N * N * N && result === null; turn++) {
      const isGreedy = turn % 2 === 0; // greedy moves first
      const player: Player = isGreedy ? 1 : 2;
      const rod = isGreedy ? greedy(b, 1, 2) : bestRod(b, 2, 'hard')!;
      drop(b, rod.x, rod.z, player);
      if (winningLine(b, player)) result = isGreedy ? 'greedy' : 'ai';
      else if (isFull(b)) result = 'draw';
    }
    expect(result === 'ai' || result === 'draw').toBe(true);
  });
});

describe('evaluate', () => {
  test('favors the player with more open lines', () => {
    const b = newBoard();
    drop(b, 1, 1, 1); drop(b, 2, 1, 1); // two centre beads for player 1
    expect(evaluate(b, 1)).toBeGreaterThan(0);
    expect(evaluate(b, 2)).toBeLessThan(0);
  });
});

describe('performance', () => {
  test('hard stays fast enough for phones', () => {
    const b = newBoard();
    drop(b, 1, 1, 1); drop(b, 2, 2, 2); drop(b, 1, 2, 1); drop(b, 2, 1, 2);
    const t0 = performance.now();
    const rod = bestRod(b, 1, 'hard');
    const dt = performance.now() - t0;
    expect(rod).not.toBeNull();
    // ~300ms locally; generous bound absorbs CI contention while still
    // catching a regression to something pathological
    expect(dt).toBeLessThan(5000);
  });
});
