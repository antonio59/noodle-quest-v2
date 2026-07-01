// Pure Checkers (English draughts) rules and AI. No React or rendering
// concerns — unit-testable in isolation.
//
// House rule kept from the original implementation: a piece crowned
// mid-jump may keep jumping as a king (standard draughts would end the
// turn). The human UI has always allowed this, so the AI and search
// model it the same way.

export type Color = 'red' | 'black';
export type Piece = { color: Color; king: boolean };
export type Board = (Piece | null)[][];
export type Pos = [number, number];
export type AILevel = 'easy' | 'medium' | 'hard';

/** A complete move: every square visited, plus captured squares. */
export interface Move {
  path: Pos[];
  captures: Pos[];
}

export const SIZE = 8;

export function initBoard(): Board {
  const board: Board = Array.from({ length: SIZE }, () =>
    Array<Piece | null>(SIZE).fill(null),
  );
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < SIZE; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
  for (let r = 5; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
  return board;
}

export function cloneBoard(b: Board): Board {
  return b.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function otherColor(color: Color): Color {
  return color === 'red' ? 'black' : 'red';
}

function getDirs(p: Piece): number[][] {
  if (p.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return p.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

/** Single-hop jump landings from (r, c). Used by the interactive UI. */
export function getJumps(b: Board, r: number, c: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  const out: Pos[] = [];
  for (const [dr, dc] of getDirs(p)) {
    const mr = r + dr, mc = c + dc;
    const jr = r + 2 * dr, jc = c + 2 * dc;
    if (
      jr >= 0 && jr < SIZE && jc >= 0 && jc < SIZE &&
      b[mr][mc] && b[mr][mc]!.color !== p.color && !b[jr][jc]
    ) {
      out.push([jr, jc]);
    }
  }
  return out;
}

/** Plain diagonal steps from (r, c). Used by the interactive UI. */
export function getSteps(b: Board, r: number, c: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  const out: Pos[] = [];
  for (const [dr, dc] of getDirs(p)) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !b[nr][nc]) out.push([nr, nc]);
  }
  return out;
}

/** Apply a single hop (step or one jump), returning a new board. */
export function applyMove(b: Board, from: Pos, to: Pos): Board {
  const nb = cloneBoard(b);
  const p = { ...nb[from[0]][from[1]]! };
  nb[to[0]][to[1]] = p;
  nb[from[0]][from[1]] = null;
  if (Math.abs(to[0] - from[0]) === 2) {
    nb[(from[0] + to[0]) / 2][(from[1] + to[1]) / 2] = null;
  }
  if ((p.color === 'red' && to[0] === 0) || (p.color === 'black' && to[0] === SIZE - 1)) {
    p.king = true;
    nb[to[0]][to[1]] = p;
  }
  return nb;
}

/** Apply a complete move sequence hop by hop, returning a new board. */
export function applyMoveSeq(b: Board, move: Move): Board {
  let cur = b;
  for (let i = 0; i + 1 < move.path.length; i++) {
    cur = applyMove(cur, move.path[i], move.path[i + 1]);
  }
  return cur;
}

/** All complete jump sequences starting from (r, c), via depth-first search. */
function jumpSequencesFrom(b: Board, r: number, c: number): Move[] {
  const out: Move[] = [];
  const walk = (board: Board, pos: Pos, path: Pos[], captures: Pos[]) => {
    const hops = getJumps(board, pos[0], pos[1]);
    if (hops.length === 0) {
      if (captures.length > 0) out.push({ path: [...path], captures: [...captures] });
      return;
    }
    for (const to of hops) {
      const mid: Pos = [(pos[0] + to[0]) / 2, (pos[1] + to[1]) / 2];
      walk(applyMove(board, pos, to), to, [...path, to], [...captures, mid]);
    }
  };
  walk(b, [r, c], [[r, c]], []);
  return out;
}

/**
 * Every legal complete move for `color`. Captures are compulsory: if any
 * jump exists, only complete jump sequences are returned.
 */
export function allMoves(b: Board, color: Color): Move[] {
  const jumps: Move[] = [];
  const steps: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c]?.color !== color) continue;
      const seqs = jumpSequencesFrom(b, r, c);
      if (seqs.length > 0) {
        jumps.push(...seqs);
      } else if (jumps.length === 0) {
        for (const to of getSteps(b, r, c)) {
          steps.push({ path: [[r, c], to], captures: [] });
        }
      }
    }
  }
  return jumps.length > 0 ? jumps : steps;
}

/**
 * Squares a selected piece may move to right now (single hop), honouring
 * compulsory capture. Used by the interactive UI.
 */
export function pieceTargets(b: Board, r: number, c: number, color: Color): Pos[] {
  const p = b[r][c];
  if (!p || p.color !== color) return [];
  const jumps = getJumps(b, r, c);
  if (jumps.length > 0) return jumps;
  // Another piece has a capture available — this piece may not step.
  if (allMoves(b, color).some(m => m.captures.length > 0)) return [];
  return getSteps(b, r, c);
}

export function countPieces(b: Board, color: Color): number {
  let n = 0;
  for (const row of b) for (const cell of row) if (cell?.color === color) n++;
  return n;
}

// ── Evaluation ─────────────────────────────────────────────────────────
// Positive = good for `me`. Material dominates; small bonuses for
// advancement (men), centre control, and keeping the back row guarded.

export function evaluate(b: Board, me: Color): number {
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = b[r][c];
      if (!p) continue;
      let v = p.king ? 1.65 : 1;
      if (!p.king) {
        const advance = p.color === 'black' ? r : SIZE - 1 - r;
        v += advance * 0.03;
        const ownBackRow = p.color === 'black' ? 0 : SIZE - 1;
        if (r === ownBackRow) v += 0.12;
      }
      v += (3.5 - Math.abs(c - 3.5)) * 0.02;
      score += p.color === me ? v : -v;
    }
  }
  return score;
}

// ── Search ─────────────────────────────────────────────────────────────

const WIN_SCORE = 1000;

/**
 * Negamax with alpha-beta over complete move sequences. Returns the score
 * from the perspective of `color`, the side to move.
 */
function negamax(b: Board, depth: number, alpha: number, beta: number, color: Color): number {
  const moves = allMoves(b, color);
  // No moves = the side to move loses. Adding remaining depth prefers
  // faster wins and slower losses.
  if (moves.length === 0) return -(WIN_SCORE + depth);
  if (depth <= 0) return evaluate(b, color);

  let best = -Infinity;
  for (const m of moves) {
    const nb = applyMoveSeq(b, m);
    const v = -negamax(nb, depth - 1, -beta, -alpha, otherColor(color));
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

const AI_CONFIG: Record<AILevel, { depth: number; blunderChance: number }> = {
  easy: { depth: 1, blunderChance: 0.5 },
  medium: { depth: 4, blunderChance: 0.15 },
  hard: { depth: 6, blunderChance: 0 },
};

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Choose a complete move for `color`. Difficulty controls search depth
 * plus an occasional blunder (a random legal move — which, thanks to
 * compulsory capture, is still never a passive move when jumps exist).
 */
export function bestMove(board: Board, color: Color, difficulty: AILevel): Move | null {
  const moves = allMoves(board, color);
  if (moves.length === 0) return null;

  const { depth, blunderChance } = AI_CONFIG[difficulty];
  if (Math.random() < blunderChance) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Shuffle for variety between games; search settles genuine differences.
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of shuffled(moves)) {
    const nb = applyMoveSeq(board, m);
    const v = -negamax(nb, depth - 1, -Infinity, Infinity, otherColor(color));
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}
