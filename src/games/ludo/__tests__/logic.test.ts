import { describe, expect, test } from 'vitest';
import {
  TRACK, TRACK_LEN, STRETCH_START, HOME, RED_ENTRY, BLUE_ENTRY,
  RED_STRETCH, BLUE_STRETCH, SAFE_POSITIONS,
  toAbsolute, advance, getMovableIndices, capturedIndices, posCoord,
  scoreAiMove, chooseAiMove,
} from '../logic';

describe('board geometry', () => {
  test('the track really has 48 squares and no duplicates', () => {
    expect(TRACK).toHaveLength(TRACK_LEN);
    const keys = new Set(TRACK.map(([r, c]) => `${r},${c}`));
    expect(keys.size).toBe(TRACK_LEN);
  });

  test('every relative position maps to a real coordinate for both sides', () => {
    for (const [entry, stretch] of [[RED_ENTRY, RED_STRETCH], [BLUE_ENTRY, BLUE_STRETCH]] as const) {
      for (let rel = 0; rel < HOME; rel++) {
        const [row, col] = posCoord(rel, entry, stretch);
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(15);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(15);
      }
    }
  });

  test('both sides travel the same distance (the old code gave blue a half-length route)', () => {
    // From entry to home is HOME steps for red and blue alike.
    let red = 0;
    let blue = 0;
    let redSteps = 0;
    let blueSteps = 0;
    while (red < HOME) { red = advance(red, 1); redSteps++; }
    while (blue < HOME) { blue = advance(blue, 1); blueSteps++; }
    expect(redSteps).toBe(blueSteps);
    expect(redSteps).toBe(HOME);
  });

  test("blue's last track square sits next to its stretch entrance", () => {
    // Relative 47 for blue = absolute 23 = [7,14]; its stretch starts [7,13].
    expect(toAbsolute(47, BLUE_ENTRY)).toBe(23);
    expect(TRACK[23]).toEqual([7, 14]);
    expect(BLUE_STRETCH[0]).toEqual([7, 13]);
  });

  test('entry squares are safe', () => {
    expect(SAFE_POSITIONS.has(RED_ENTRY)).toBe(true);
    expect(SAFE_POSITIONS.has(BLUE_ENTRY)).toBe(true);
  });
});

describe('advance', () => {
  test('needs a 6 to leave the base', () => {
    expect(advance(-1, 6)).toBe(0);
    for (const d of [1, 2, 3, 4, 5]) expect(advance(-1, d)).toBe(-1);
  });

  test('cannot overshoot home', () => {
    expect(advance(HOME - 1, 1)).toBe(HOME);
    expect(advance(HOME - 1, 2)).toBe(HOME - 1); // blocked
    expect(advance(52, 6)).toBe(52);             // 52 + 6 = 58 > 54
  });

  test('walks from track into the stretch', () => {
    expect(advance(46, 4)).toBe(50);
    expect(advance(47, 1)).toBe(STRETCH_START);
  });
});

describe('getMovableIndices', () => {
  test('finished pieces never move', () => {
    expect(getMovableIndices([HOME, HOME, 3, -1], 2)).toEqual([2]);
  });

  test('with a 6 everything viable moves', () => {
    expect(getMovableIndices([-1, 10, HOME, 53], 6)).toEqual([0, 1]); // 53+6 overshoots
  });

  test('empty when nothing can move', () => {
    expect(getMovableIndices([-1, -1, -1, -1], 3)).toEqual([]);
  });
});

describe('captures', () => {
  test('landing on an opponent square captures across coordinate frames', () => {
    // Blue relative 4 = absolute 28. Red absolute 28 = relative 28.
    const redPieces = [28, -1, -1, -1];
    const hits = capturedIndices(4, BLUE_ENTRY, redPieces, RED_ENTRY);
    expect(hits).toEqual([0]);
  });

  test('no capture on safe squares', () => {
    // Absolute 24 is blue's (safe) entry. Red rel 24 = abs 24.
    const redPieces = [24, -1, -1, -1];
    const hits = capturedIndices(0, BLUE_ENTRY, redPieces, RED_ENTRY);
    expect(hits).toEqual([]);
  });

  test('no capture in the home stretch or base', () => {
    expect(capturedIndices(50, BLUE_ENTRY, [50], RED_ENTRY)).toEqual([]);
    expect(capturedIndices(-1, BLUE_ENTRY, [-1], RED_ENTRY)).toEqual([]);
  });
});

describe('AI move selection', () => {
  test('takes a capture over a plain advance', () => {
    // Blue piece 0 at rel 3: moving 1 lands rel 4 = abs 28 where red sits.
    // Blue piece 1 at rel 30: plain advance.
    const ai = [3, 30, -1, -1];
    const red = [28, -1, -1, -1];
    expect(chooseAiMove(ai, 1, BLUE_ENTRY, red, RED_ENTRY)).toBe(0);
  });

  test('finishes a piece when it can', () => {
    const ai = [HOME - 2, 10, -1, -1];
    expect(chooseAiMove(ai, 2, BLUE_ENTRY, [-1, -1, -1, -1], RED_ENTRY)).toBe(0);
  });

  test('prefers leaving base on a 6 over a small advance', () => {
    const ai = [-1, 2, -1, -1];
    expect(chooseAiMove(ai, 6, BLUE_ENTRY, [-1, -1, -1, -1], RED_ENTRY)).toBe(0);
  });

  test('avoids stepping right in front of an opponent', () => {
    // Two blue options; one lands where red can hit it next roll.
    // Blue rel 10 → abs 34 (safe!); use rel 11 → abs 35.
    // Red at rel 32 (abs 32) threatens abs 33..38.
    const dangerous = scoreAiMove(10, 1, BLUE_ENTRY, [32], RED_ENTRY);   // lands abs 35
    const safe = scoreAiMove(10, 1, BLUE_ENTRY, [-1], RED_ENTRY);        // same square, no threat
    expect(dangerous).toBeLessThan(safe);
  });

  test('returns -1 when nothing can move', () => {
    expect(chooseAiMove([-1, -1, -1, -1], 3, BLUE_ENTRY, [], RED_ENTRY)).toBe(-1);
  });

  test('always picks a movable piece across random scenarios', () => {
    for (let i = 0; i < 200; i++) {
      const ai = Array.from({ length: 4 }, () => [-1, 0, 5, 12, 30, 47, 50, HOME][Math.floor(Math.random() * 8)]);
      const red = Array.from({ length: 4 }, () => [-1, 3, 20, 40][Math.floor(Math.random() * 4)]);
      const d = 1 + Math.floor(Math.random() * 6);
      const pick = chooseAiMove(ai, d, BLUE_ENTRY, red, RED_ENTRY);
      const movable = getMovableIndices(ai, d);
      if (movable.length === 0) expect(pick).toBe(-1);
      else expect(movable).toContain(pick);
    }
  });
});

describe('full game simulation', () => {
  test('two AIs always finish a game with a legal winner', () => {
    for (let g = 0; g < 10; g++) {
      const pieces = { red: [-1, -1, -1, -1], blue: [-1, -1, -1, -1] };
      const entries = { red: RED_ENTRY, blue: BLUE_ENTRY };
      let turn: 'red' | 'blue' = 'red';
      let winner: string | null = null;
      let guard = 0;
      while (!winner && guard++ < 5000) {
        const me = turn;
        const opp = turn === 'red' ? 'blue' : 'red';
        const d = 1 + Math.floor(Math.random() * 6);
        const pick = chooseAiMove(pieces[me], d, entries[me], pieces[opp], entries[opp]);
        if (pick >= 0) {
          const np = advance(pieces[me][pick], d);
          pieces[me][pick] = np;
          for (const h of capturedIndices(np, entries[me], pieces[opp], entries[opp])) {
            pieces[opp][h] = -1;
          }
          if (pieces[me].every(p => p >= HOME)) winner = me;
        }
        if (d !== 6) turn = opp;
      }
      expect(winner).not.toBeNull();
      // All positions stayed within the legal range throughout
      for (const side of ['red', 'blue'] as const) {
        for (const p of pieces[side]) {
          expect(p).toBeGreaterThanOrEqual(-1);
          expect(p).toBeLessThanOrEqual(HOME);
        }
      }
    }
  });
});
