// Pure 3×3×3 twisty-cube state model. No React or rendering concerns —
// unit-testable in isolation.
//
// A cube is 26 visible cubies, each with an integer position (components
// in {-1, 0, 1}) and six face slots for sticker colors (null = internal,
// rendered dark). A quarter turn rotates every cubie in one layer: its
// position vector and its sticker normals rotate together.

export type Vec3 = [number, number, number];
export type Axis = 0 | 1 | 2; // x, y, z

/** Sticker colors: Up white, Down yellow, Front green, Back blue, Right red, Left orange. */
export type Color = 'W' | 'Y' | 'G' | 'B' | 'R' | 'O';

/** Face slot order: +x, -x, +y, -y, +z, -z */
export const FACE_NORMALS: Vec3[] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const FACE_COLORS: Color[] = ['R', 'O', 'W', 'Y', 'G', 'B'];

export interface Cubie {
  pos: Vec3;
  colors: (Color | null)[]; // length 6, indexed like FACE_NORMALS
}

export type Cube = Cubie[];

export interface Move {
  axis: Axis;
  /** -1/+1 = outer faces; 0 = middle slice (drag interaction only). */
  layer: -1 | 0 | 1;
  /** +1 = 90° counterclockwise looking down the positive axis. */
  dir: -1 | 1;
}

export function newCube(): Cube {
  const cube: Cube = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const pos: Vec3 = [x, y, z];
        const colors = FACE_NORMALS.map((n, i) =>
          n[0] * x + n[1] * y + n[2] * z === 1 && (Math.abs(n[0]) * Math.abs(x) + Math.abs(n[1]) * Math.abs(y) + Math.abs(n[2]) * Math.abs(z)) === 1
            ? FACE_COLORS[i]
            : null,
        );
        cube.push({ pos, colors });
      }
    }
  }
  return cube;
}

/** Rotate a vector 90° about an axis (right-hand rule for dir = +1). */
export function rotVec(v: Vec3, axis: Axis, dir: 1 | -1): Vec3 {
  const [x, y, z] = v;
  if (axis === 0) return dir === 1 ? [x, -z, y] : [x, z, -y];
  if (axis === 1) return dir === 1 ? [z, y, -x] : [-z, y, x];
  return dir === 1 ? [-y, x, z] : [y, -x, z];
}

function faceIndex(n: Vec3): number {
  return FACE_NORMALS.findIndex(f => f[0] === n[0] && f[1] === n[1] && f[2] === n[2]);
}

/** Apply a quarter turn to one layer, returning a new cube. */
export function applyMove(cube: Cube, move: Move): Cube {
  return cube.map(cubie => {
    if (cubie.pos[move.axis] !== move.layer) return cubie;
    const pos = rotVec(cubie.pos, move.axis, move.dir);
    const colors: (Color | null)[] = [null, null, null, null, null, null];
    for (let i = 0; i < 6; i++) {
      if (cubie.colors[i] === null) continue;
      colors[faceIndex(rotVec(FACE_NORMALS[i], move.axis, move.dir))] = cubie.colors[i];
    }
    return { pos, colors };
  });
}

export function invert(move: Move): Move {
  return { ...move, dir: move.dir === 1 ? -1 : 1 };
}

/** The 9 sticker colors on one face of the cube. */
export function faceStickers(cube: Cube, face: number): (Color | null)[] {
  const n = FACE_NORMALS[face];
  const axis = n.findIndex(c => c !== 0) as Axis;
  const layer = n[axis];
  return cube
    .filter(c => c.pos[axis] === layer)
    .map(c => c.colors[face]);
}

export function isSolved(cube: Cube): boolean {
  for (let face = 0; face < 6; face++) {
    const stickers = faceStickers(cube, face);
    if (stickers.length !== 9) return false;
    if (stickers.some(s => s === null || s !== stickers[0])) return false;
  }
  return true;
}

/**
 * Scramble with `n` random face turns, never undoing the previous move
 * (and never twisting the same layer twice in a row, which could cancel
 * or merge). Returns the scrambled cube and the moves used.
 */
export function scramble(cube: Cube, n: number, rng: () => number = Math.random): { cube: Cube; moves: Move[] } {
  let cur = cube;
  const moves: Move[] = [];
  let prev: Move | null = null;
  while (moves.length < n) {
    const move: Move = {
      axis: Math.floor(rng() * 3) as Axis,
      layer: rng() < 0.5 ? -1 : 1,
      dir: rng() < 0.5 ? -1 : 1,
    };
    if (prev && move.axis === prev.axis && move.layer === prev.layer) continue;
    cur = applyMove(cur, move);
    moves.push(move);
    prev = move;
  }
  return { cube: cur, moves };
}

/** Hex render colors for each sticker letter. */
export const COLOR_HEX: Record<Color, string> = {
  W: '#f4f4f5',
  Y: '#facc15',
  G: '#22c55e',
  B: '#3b82f6',
  R: '#ef4444',
  O: '#f97316',
};
