import { describe, expect, test } from 'vitest';
import {
  TRACK, TRACK_LEN, STRETCH_START, HOME,
  RED_ENTRY, GREEN_ENTRY, BLUE_ENTRY, YELLOW_ENTRY,
  RED_STRETCH, GREEN_STRETCH, BLUE_STRETCH, YELLOW_STRETCH,
  SAFE_POSITIONS,
  toAbsolute, advance, getMovableIndices, capturedIndices, posCoord,
  scoreAiMove, chooseAiMove, entryFor, sidesForCount, nextSeat,
  type Side,
} from '../logic';

describe('board geometry', () => {
  test('the track really has 48 squares and no duplicates', () => {
    expect(TRACK).toHaveLength(TRACK_LEN);
    const keys = new Set(TRACK.map(([r, c]) => `${r},${c}`));
    expect(keys.size).toBe(TRACK_LEN);
  });

  test('every relative position maps to a real coordinate for all four sides', () => {
    const sides: [number, [number, number][]][] = [
      [RED_ENTRY, RED_STRETCH],
      [GREEN_ENTRY, GREEN_STRETCH],
      [YELLOW_ENTRY, YELLOW_STRETCH],
      [BLUE_ENTRY, BLUE_STRETCH],
    ];
    for (const [entry, stretch] of sides) {
      for (let rel = 0; rel < HOME; rel++) {
        const [row, col] = posCoord(rel, entry, stretch);
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(15);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(15);
      }
    }
  });

  test('all four sides travel the same distance', () => {
    for (const entry of [RED_ENTRY, GREEN_ENTRY, YELLOW_ENTRY, BLUE_ENTRY]) {
      let pos = 0;
      let steps = 0;
      while (pos < HOME) { pos = advance(pos, 1); steps++; }
      expect(steps).toBe(HOME);
    }
  });

  test("blue's last track square sits next to its stretch entrance", () => {
    // Relative 47 for blue = absolute 23 = [7,14]; its stretch starts [7,13].
    expect(toAbsolute(47, BLUE_ENTRY)).toBe(23);
    expect(TRACK[23]).toEqual([7, 14]);
    expect(BLUE_STRETCH[0]).toEqual([7, 13]);
  });

  test("green and yellow entries and stretch entrances line up", () => {
    expect(GREEN_ENTRY).toBe(13);
    expect(YELLOW_ENTRY).toBe(39);
    expect(toAbsolute(47, GREEN_ENTRY)).toBe(12);
    expect(TRACK[12]).toEqual([0, 8]);
    expect(GREEN_STRETCH[0]).toEqual([1, 7]);
    expect(toAbsolute(47, YELLOW_ENTRY)).toBe(38);
    expect(TRACK[38]).toEqual([12, 6]);
    expect(YELLOW_STRETCH[0]).toEqual([13, 7]);
  });

  test('all entry squares are safe', () => {
    expect(SAFE_POSITIONS.has(RED_ENTRY)).toBe(true);
    expect(SAFE_POSITIONS.has(GREEN_ENTRY)).toBe(true);
    expect(SAFE_POSITIONS.has(BLUE_ENTRY)).toBe(true);
    expect(SAFE_POSITIONS.has(YELLOW_ENTRY)).toBe(true);
  });

  test('entryFor and sidesForCount cover 2–4 players', () => {
    expect(entryFor('red')).toBe(RED_ENTRY);
    expect(entryFor('green')).toBe(GREEN_ENTRY);
    expect(entryFor('yellow')).toBe(YELLOW_ENTRY);
    expect(entryFor('blue')).toBe(BLUE_ENTRY);
    expect(sidesForCount(2)).toEqual(['red', 'blue']);
    expect(sidesForCount(3)).toEqual(['red', 'green', 'blue']);
    expect(sidesForCount(4)).toEqual(['red', 'green', 'yellow', 'blue']);
    expect(nextSeat(1, 4)).toBe(2);
    expect(nextSeat(4, 4)).toBe(1);
    expect(nextSeat(2, 2)).toBe(1);
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

  test('green can capture yellow across frames', () => {
    // Green rel 5 = abs 18. Yellow abs 18 = rel (18 - 39 + 48) % 48 = 27.
    const yellowPieces = [27, -1, -1, -1];
    expect(toAbsolute(5, GREEN_ENTRY)).toBe(18);
    expect(toAbsolute(27, YELLOW_ENTRY)).toBe(18);
    expect(capturedIndices(5, GREEN_ENTRY, yellowPieces, YELLOW_ENTRY)).toEqual([0]);
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

  test('hard never blunders; easy sometimes moves a random piece', () => {
    // Capture available: heuristic pick is index 0. Hard must always take
    // it; easy should deviate at least once over many trials.
    const ai = [3, 30, 35, 40];
    const red = [28, -1, -1, -1];
    let easyDeviated = false;
    for (let i = 0; i < 200; i++) {
      expect(chooseAiMove(ai, 1, BLUE_ENTRY, red, RED_ENTRY, 'hard')).toBe(0);
      if (chooseAiMove(ai, 1, BLUE_ENTRY, red, RED_ENTRY, 'easy') !== 0) easyDeviated = true;
    }
    expect(easyDeviated).toBe(true);
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

  test('four AIs finish a game with a legal winner', () => {
    const sideList = sidesForCount(4);
    for (let g = 0; g < 5; g++) {
      const pieces: Record<Side, number[]> = {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1],
      };
      let seat = 1;
      let winner: Side | null = null;
      let guard = 0;
      while (!winner && guard++ < 8000) {
        const me = sideList[seat - 1];
        const d = 1 + Math.floor(Math.random() * 6);
        // Pairwise AI helpers: score each movable piece against all opponents.
        let pick = -1;
        let bestScore = -Infinity;
        const movable = getMovableIndices(pieces[me], d);
        for (const i of movable) {
          let s = 0;
          for (const opp of sideList) {
            if (opp === me) continue;
            s += scoreAiMove(pieces[me][i], d, entryFor(me), pieces[opp], entryFor(opp));
          }
          if (s > bestScore) { bestScore = s; pick = i; }
        }
        if (pick < 0 && movable.length > 0) pick = movable[0];
        if (pick >= 0) {
          const np = advance(pieces[me][pick], d);
          pieces[me][pick] = np;
          for (const opp of sideList) {
            if (opp === me) continue;
            for (const h of capturedIndices(np, entryFor(me), pieces[opp], entryFor(opp))) {
              pieces[opp][h] = -1;
            }
          }
          if (pieces[me].every(p => p >= HOME)) winner = me;
        }
        if (d !== 6) seat = nextSeat(seat, 4);
      }
      expect(winner).not.toBeNull();
      for (const side of sideList) {
        for (const p of pieces[side]) {
          expect(p).toBeGreaterThanOrEqual(-1);
          expect(p).toBeLessThanOrEqual(HOME);
        }
      }
    }
  });
});
