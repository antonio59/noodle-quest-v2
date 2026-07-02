import { describe, expect, test } from 'vitest';
import {
  SIZE, initBoard, allMoves, pieceTargets, applyMove, applyMoveSeq,
  countPieces, evaluate, bestMove,
  type Board, type Color,
} from '../logic';

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function put(b: Board, r: number, c: number, color: Color, king = false): void {
  b[r][c] = { color, king };
}

describe('setup', () => {
  test('each side starts with 12 men on dark squares', () => {
    const b = initBoard();
    expect(countPieces(b, 'red')).toBe(12);
    expect(countPieces(b, 'black')).toBe(12);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c]) expect((r + c) % 2).toBe(1);
      }
    }
  });

  test('red opens with 7 legal moves', () => {
    expect(allMoves(initBoard(), 'red')).toHaveLength(7);
  });
});

describe('movement rules', () => {
  test('men move diagonally forward only', () => {
    const b = emptyBoard();
    put(b, 4, 3, 'red');
    const moves = allMoves(b, 'red');
    const targets = moves.map(m => m.path[1]);
    expect(targets).toContainEqual([3, 2]);
    expect(targets).toContainEqual([3, 4]);
    expect(targets).not.toContainEqual([5, 2]);
    expect(targets).not.toContainEqual([5, 4]);
  });

  test('kings move in all four directions', () => {
    const b = emptyBoard();
    put(b, 4, 3, 'red', true);
    const targets = allMoves(b, 'red').map(m => m.path[1]);
    expect(targets).toHaveLength(4);
    expect(targets).toContainEqual([5, 2]);
    expect(targets).toContainEqual([5, 4]);
  });

  test('reaching the far row crowns the piece', () => {
    const b = emptyBoard();
    put(b, 1, 2, 'red');
    const nb = applyMove(b, [1, 2], [0, 1]);
    expect(nb[0][1]).toEqual({ color: 'red', king: true });
  });
});

describe('captures', () => {
  test('captures are compulsory', () => {
    const b = emptyBoard();
    put(b, 4, 3, 'red');
    put(b, 3, 4, 'black'); // jumpable
    put(b, 6, 1, 'red');   // has quiet moves, but must not be offered
    const moves = allMoves(b, 'red');
    expect(moves.every(m => m.captures.length > 0)).toBe(true);
    // The piece with only quiet moves gets no targets while a jump exists
    expect(pieceTargets(b, 6, 1, 'red')).toHaveLength(0);
  });

  test('jumping removes the captured piece', () => {
    const b = emptyBoard();
    put(b, 4, 3, 'red');
    put(b, 3, 4, 'black');
    const nb = applyMove(b, [4, 3], [2, 5]);
    expect(nb[3][4]).toBeNull();
    expect(nb[2][5]).toEqual({ color: 'red', king: false });
  });

  test('multi-jump chains are generated as one complete move', () => {
    const b = emptyBoard();
    put(b, 6, 1, 'red');
    put(b, 5, 2, 'black');
    put(b, 3, 4, 'black');
    // red jumps 6,1 → 4,3 → 2,5 capturing both
    const moves = allMoves(b, 'red');
    expect(moves).toHaveLength(1);
    expect(moves[0].path).toEqual([[6, 1], [4, 3], [2, 5]]);
    expect(moves[0].captures).toHaveLength(2);
    const nb = applyMoveSeq(b, moves[0]);
    expect(countPieces(nb, 'black')).toBe(0);
  });

  test('a partial jump is not a complete move when the chain continues', () => {
    const b = emptyBoard();
    put(b, 6, 1, 'red');
    put(b, 5, 2, 'black');
    put(b, 3, 4, 'black');
    const moves = allMoves(b, 'red');
    // No move may stop at (4,3) — the chain must be finished
    expect(moves.some(m => m.path.length === 2 && m.path[1][0] === 4 && m.path[1][1] === 3)).toBe(false);
  });

  test('branching chains produce one move per complete route', () => {
    const b = emptyBoard();
    put(b, 6, 3, 'red');
    put(b, 5, 2, 'black');
    put(b, 5, 4, 'black');
    const moves = allMoves(b, 'red');
    expect(moves).toHaveLength(2);
    for (const m of moves) expect(m.captures.length).toBeGreaterThanOrEqual(1);
  });
});

describe('evaluate', () => {
  test('material advantage scores positive', () => {
    const b = emptyBoard();
    put(b, 4, 3, 'red');
    put(b, 4, 5, 'red');
    put(b, 3, 2, 'black');
    expect(evaluate(b, 'red')).toBeGreaterThan(0);
    expect(evaluate(b, 'black')).toBeLessThan(0);
  });

  test('kings are worth more than men', () => {
    const man = emptyBoard();
    put(man, 4, 3, 'red');
    const king = emptyBoard();
    put(king, 4, 3, 'red', true);
    expect(evaluate(king, 'red')).toBeGreaterThan(evaluate(man, 'red'));
  });
});

describe('bestMove — tactical strength', () => {
  test('takes the bigger capture chain when both exist', () => {
    const b = emptyBoard();
    // Chain A: single capture. Chain B: double capture.
    put(b, 2, 1, 'black');
    put(b, 3, 2, 'red');            // single-jump target (chain A)
    put(b, 2, 5, 'black');
    put(b, 3, 6, 'red');
    put(b, 5, 6, 'red');            // double-jump route (chain B): 2,5→4,7→6,5
    const m = bestMove(b, 'black', 'hard');
    expect(m).not.toBeNull();
    expect(m!.captures.length).toBe(2);
  });

  test('hard does not step into an undefended capture', () => {
    const b = emptyBoard();
    // Black man at (2,3). Red man at (4,3) with backup at (5,2)/(5,4):
    // stepping to (3,2) or (3,4) would be captured with no compensation.
    put(b, 2, 3, 'black');
    put(b, 4, 1, 'red');
    put(b, 4, 5, 'red');
    put(b, 5, 2, 'red');
    put(b, 5, 4, 'red');
    // Give black a safe alternative elsewhere
    put(b, 0, 1, 'black');
    const m = bestMove(b, 'black', 'hard');
    expect(m).not.toBeNull();
    const to = m!.path[m!.path.length - 1];
    // (3,0) or (3,2)/(3,4)? Stepping (2,3)→(3,2) can be jumped by (4,1);
    // (2,3)→(3,4) can be jumped by (4,5). The safe moves come from the
    // back piece or (2,3)→(3,2)? no — assert the chosen landing square
    // is not immediately jumpable:
    const nb = applyMoveSeq(b, m!);
    const redReplies = allMoves(nb, 'red');
    const losesAPiece = redReplies.some(rm => rm.captures.length > 0);
    expect(losesAPiece).toBe(false);
  });

  test('every level returns a legal move from the opening', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const b = initBoard();
      const legal = allMoves(b, 'black');
      for (let i = 0; i < 10; i++) {
        const m = bestMove(b, 'black', level);
        expect(m).not.toBeNull();
        expect(legal.map(x => JSON.stringify(x.path))).toContain(JSON.stringify(m!.path));
      }
    }
  });

  test('returns null when no moves exist', () => {
    const b = emptyBoard();
    put(b, 0, 1, 'black'); // black man on its own back row corner-ish
    put(b, 1, 0, 'red', true);
    put(b, 1, 2, 'red', true);
    put(b, 2, 1, 'red', true);
    put(b, 2, 3, 'red', true);
    // Black's forward moves are blocked and no jumps land on empty squares
    const moves = allMoves(b, 'black');
    if (moves.length === 0) {
      expect(bestMove(b, 'black', 'hard')).toBeNull();
    } else {
      // Position wasn't fully sealed — bestMove must still return legal
      expect(bestMove(b, 'black', 'hard')).not.toBeNull();
    }
  });

  test('hard beats random play from the opening', () => {
    // Random-mover (red) vs hard AI (black). Hard must win the material
    // battle: strictly more pieces after 60 plies, or an outright win.
    let b = initBoard();
    let turn: Color = 'red';
    let winner: Color | null = null;
    for (let ply = 0; ply < 60 && !winner; ply++) {
      const moves = allMoves(b, turn);
      if (moves.length === 0) {
        winner = turn === 'red' ? 'black' : 'red';
        break;
      }
      const m = turn === 'red'
        ? moves[Math.floor(Math.random() * moves.length)]
        : bestMove(b, 'black', 'hard')!;
      b = applyMoveSeq(b, m);
      turn = turn === 'red' ? 'black' : 'red';
    }
    if (winner) {
      expect(winner).toBe('black');
    } else {
      expect(countPieces(b, 'black')).toBeGreaterThan(countPieces(b, 'red'));
    }
  });
});
