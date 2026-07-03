// Chess AI on top of chess.js move generation. No React or rendering
// concerns — unit-testable in isolation.

import { Chess } from 'chess.js';

export type AILevel = 'easy' | 'medium' | 'hard';

// Centipawn material values
const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Piece-square tables (white's perspective, a8 first — matching the
// row-major order of chess.js board()). Classic "simplified evaluation
// function" tables.
const PST: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

/**
 * Static evaluation in centipawns from the perspective of the side to
 * move (negamax convention): material + piece-square bonuses.
 *
 * Reads the FEN piece field rather than game.board(): this runs at every
 * search leaf and board() allocates 64 objects per call.
 */
export function evaluate(game: Chess): number {
  const fen = game.fen();
  let score = 0; // from white's perspective
  let idx = 0;   // 0..63, a8 first — same order as the PST tables
  for (let i = 0; i < fen.length; i++) {
    const ch = fen[i];
    if (ch === ' ') break;
    if (ch === '/') continue;
    if (ch >= '1' && ch <= '8') {
      idx += ch.charCodeAt(0) - 48;
      continue;
    }
    const lower = ch.toLowerCase();
    if (ch === lower) {
      // Black piece: mirror the table vertically
      score -= VALUES[lower] + PST[lower][(7 - (idx >> 3)) * 8 + (idx & 7)];
    } else {
      score += VALUES[lower] + PST[lower][idx];
    }
    idx++;
  }
  return game.turn() === 'w' ? score : -score;
}

type VerboseMove = ReturnType<Chess['moves']> extends (infer M)[] ? M : never;

/** Captures and promotions first (MVV-LVA), for better alpha-beta pruning. */
function orderedMoves(game: Chess): VerboseMove[] {
  const moves = game.moves({ verbose: true });
  const priority = (m: VerboseMove): number => {
    let p = 0;
    const captured = (m as { captured?: string }).captured;
    const promotion = (m as { promotion?: string }).promotion;
    const piece = (m as { piece: string }).piece;
    if (captured) p += 10 * VALUES[captured] - VALUES[piece];
    if (promotion) p += VALUES[promotion];
    return p;
  };
  return moves.sort((a, b) => priority(b) - priority(a));
}

const MATE = 100000;

function negamax(game: Chess, depth: number, alpha: number, beta: number, extended: boolean): number {
  // Leaves evaluate immediately — no move generation.
  if (depth <= 0) return evaluate(game);
  // One move-list per internal node: chess.js's isCheckmate()/isDraw()
  // each run their own move generation, so we detect mate/stalemate from
  // the list we already have.
  const moves = orderedMoves(game);
  if (moves.length === 0) return game.inCheck() ? -(MATE + depth) : 0; // mate / stalemate

  let best = -Infinity;
  for (const m of moves) {
    game.move(m);
    // Capture extension: when the horizon lands on a capture, search one
    // ply deeper (once) so exchanges resolve instead of being cut off —
    // otherwise the AI happily "wins" defended pawns it instantly loses
    // back. This is what lets a shallow search stay fast AND tactical.
    const ext = depth === 1 && !extended && (m as { captured?: string }).captured ? 1 : 0;
    const v = -negamax(game, depth - 1 + ext, -beta, -alpha, extended || ext > 0);
    game.undo();
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Pick a move (SAN) for the side to move.
 *  - easy: depth-1 search 60% of the time, otherwise a random legal move
 *    — blunders plenty, but no longer hangs every piece the way pure
 *    random did (which made even easy games long and joyless)
 *  - medium: depth-1 search — takes free material and stops sacrificing
 *    the queen for a spite check, but doesn't plan ahead
 *  - hard: depth-2 negamax with alpha-beta, MVV-LVA ordering, capture
 *    extensions, and piece-square evaluation (fast enough for phones,
 *    tactically deeper than the old material-only depth-3 search)
 */
export function bestMove(game: Chess, difficulty: AILevel): string | null {
  const moves = game.moves();
  if (moves.length === 0) return null;
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'hard' ? 2 : 1;
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const m of orderedMoves(game)) {
    game.move(m);
    const v = -negamax(game, depth - 1, -Infinity, Infinity, false)
      // Tiny noise varies play between games without changing real
      // tactical decisions (well under a centipawn-scale swing).
      + Math.random() * 4;
    game.undo();
    if (v > bestScore) {
      bestScore = v;
      best = (m as { san: string }).san;
    }
  }
  return best;
}
