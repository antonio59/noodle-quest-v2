import { describe, expect, test } from 'vitest';
import {
  newCube, applyMove, invert, isSolved, scramble, faceStickers, rotVec,
  type Cube, type Move, type Axis,
} from '../logic';

function signature(cube: Cube): string {
  // Face-sticker fingerprint, independent of cubie array order
  return Array.from({ length: 6 }, (_, f) => faceStickers(cube, f).join('')).join('|');
}

describe('newCube', () => {
  test('has 26 cubies and starts solved', () => {
    const cube = newCube();
    expect(cube).toHaveLength(26);
    expect(isSolved(cube)).toBe(true);
  });

  test('every face has exactly 9 stickers of one color', () => {
    const cube = newCube();
    const seen = new Set<string>();
    for (let f = 0; f < 6; f++) {
      const stickers = faceStickers(cube, f);
      expect(stickers).toHaveLength(9);
      expect(new Set(stickers).size).toBe(1);
      expect(stickers[0]).not.toBeNull();
      seen.add(stickers[0]!);
    }
    expect(seen.size).toBe(6); // six distinct colors
  });

  test('sticker counts: 54 total', () => {
    const total = newCube().reduce((sum, c) => sum + c.colors.filter(Boolean).length, 0);
    expect(total).toBe(54);
  });
});

describe('rotVec', () => {
  test('four quarter turns are the identity', () => {
    for (const axis of [0, 1, 2] as Axis[]) {
      let v: [number, number, number] = [1, -1, 0];
      for (let i = 0; i < 4; i++) v = rotVec(v, axis, 1);
      expect(v).toEqual([1, -1, 0]);
    }
  });

  test('opposite directions cancel', () => {
    const v: [number, number, number] = [1, 0, -1];
    expect(rotVec(rotVec(v, 1, 1), 1, -1)).toEqual(v);
  });
});

describe('applyMove', () => {
  const move: Move = { axis: 1, layer: 1, dir: 1 };

  test('a single turn unsolves the cube', () => {
    expect(isSolved(applyMove(newCube(), move))).toBe(false);
  });

  test('four identical turns restore the cube', () => {
    let cube = newCube();
    for (let i = 0; i < 4; i++) cube = applyMove(cube, move);
    expect(isSolved(cube)).toBe(true);
    expect(signature(cube)).toBe(signature(newCube()));
  });

  test('a turn and its inverse cancel', () => {
    const cube = applyMove(applyMove(newCube(), move), invert(move));
    expect(isSolved(cube)).toBe(true);
  });

  test('turning a face keeps that face intact but moves its ring', () => {
    // Twisting the top layer must leave the top face all one color
    const cube = applyMove(newCube(), { axis: 1, layer: 1, dir: 1 });
    const top = faceStickers(cube, 2); // +y face
    expect(new Set(top).size).toBe(1);
    // ...but the side faces are now mixed
    const front = faceStickers(cube, 4); // +z face
    expect(new Set(front).size).toBeGreaterThan(1);
  });

  test('moves only touch the turned layer', () => {
    const cube = applyMove(newCube(), { axis: 0, layer: 1, dir: 1 });
    // The -x face (opposite layer) is untouched
    expect(new Set(faceStickers(cube, 1)).size).toBe(1);
  });

  test('does not mutate the input cube', () => {
    const cube = newCube();
    const before = signature(cube);
    applyMove(cube, move);
    expect(signature(cube)).toBe(before);
  });
});

describe('scramble', () => {
  test('returns the requested number of moves and an unsolved cube', () => {
    for (let trial = 0; trial < 20; trial++) {
      const { cube, moves } = scramble(newCube(), 8);
      expect(moves).toHaveLength(8);
      expect(isSolved(cube)).toBe(false);
    }
  });

  test('replaying the inverse moves solves the cube', () => {
    const { cube, moves } = scramble(newCube(), 15);
    let solved = cube;
    for (const m of [...moves].reverse()) solved = applyMove(solved, invert(m));
    expect(isSolved(solved)).toBe(true);
  });

  test('never repeats the same layer twice in a row', () => {
    const { moves } = scramble(newCube(), 40);
    for (let i = 1; i < moves.length; i++) {
      const same = moves[i].axis === moves[i - 1].axis && moves[i].layer === moves[i - 1].layer;
      expect(same).toBe(false);
    }
  });

  test('is deterministic with a seeded rng', () => {
    const rng = (seed: number) => () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const a = scramble(newCube(), 10, rng(42));
    const b = scramble(newCube(), 10, rng(42));
    expect(signature(a.cube)).toBe(signature(b.cube));
    expect(a.moves).toEqual(b.moves);
  });
});
