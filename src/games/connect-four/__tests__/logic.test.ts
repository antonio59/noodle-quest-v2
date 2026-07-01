import { describe, expect, test } from 'vitest';
import {
  ROWS, COLS, initBoard, dropPiece, landingRow, legalMoves, isFull,
  getWinLine, checkWin, evaluate, bestMove,
  type Board, type Color,
} from '../logic';

/** Play a sequence of columns, alternating colors starting with `first`. */
function play(cols: number[], first: Color = 'red'): Board {
  const b = initBoard();
  let color: Color = first;
  for (const c of cols) {
    dropPiece(b, c, color);
    color = color === 'red' ? 'yellow' : 'red';
  }
  return b;
}

describe('board mechanics', () => {
  test('pieces stack from the bottom', () => {
    const b = initBoard();
    expect(dropPiece(b, 3, 'red')).toBe(ROWS - 1);
    expect(dropPiece(b, 3, 'yellow')).toBe(ROWS - 2);
    expect(b[ROWS - 1][3]).toBe('red');
    expect(b[ROWS - 2][3]).toBe('yellow');
  });

  test('full column rejects drops', () => {
    const b = initBoard();
    for (let i = 0; i < ROWS; i++) dropPiece(b, 0, 'red');
    expect(landingRow(b, 0)).toBe(-1);
    expect(dropPiece(b, 0, 'yellow')).toBe(-1);
    expect(legalMoves(b)).not.toContain(0);
  });

  test('isFull detects a packed board', () => {
    const b = initBoard();
    for (let c = 0; c < COLS; c++) {
      for (let i = 0; i < ROWS; i++) dropPiece(b, c, (c + i) % 2 ? 'red' : 'yellow');
    }
    expect(isFull(b)).toBe(true);
    expect(legalMoves(b)).toHaveLength(0);
  });
});

describe('win detection', () => {
  test('horizontal', () => {
    const b = initBoard();
    for (const c of [0, 1, 2, 3]) dropPiece(b, c, 'red');
    expect(checkWin(b, ROWS - 1, 3, 'red')).toBe(true);
    expect(getWinLine(b, ROWS - 1, 3, 'red')).toHaveLength(4);
  });

  test('vertical', () => {
    const b = initBoard();
    for (let i = 0; i < 4; i++) dropPiece(b, 2, 'yellow');
    expect(checkWin(b, ROWS - 4, 2, 'yellow')).toBe(true);
  });

  test('diagonal', () => {
    // Staircase: red on the rising diagonal
    const b = play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    // red pieces at (5,0),(4,1),(3,2),(2,3)
    expect(checkWin(b, 2, 3, 'red')).toBe(true);
  });

  test('no false positives', () => {
    const b = play([0, 1, 2, 3]);
    expect(checkWin(b, ROWS - 1, 0, 'red')).toBe(false);
  });
});

describe('bestMove — tactical strength', () => {
  const levels = ['easy', 'medium', 'hard'] as const;

  test.each(levels)('%s takes an immediate win', level => {
    const b = initBoard();
    for (const c of [0, 1, 2]) dropPiece(b, c, 'yellow');
    // Winning move is column 3; even easy (which can blunder) must take it
    for (let i = 0; i < 10; i++) {
      expect(bestMove(b, 'yellow', level)).toBe(3);
    }
  });

  test.each(['medium', 'hard'] as const)('%s blocks an immediate loss', level => {
    const b = initBoard();
    // Red three-in-a-row against the left wall: the ONLY completion is col 3.
    for (const c of [0, 1, 2]) dropPiece(b, c, 'red');
    dropPiece(b, 6, 'yellow');
    const col = bestMove(b, 'yellow', level);
    expect(col).toBe(3);
  });

  test('hard avoids poisoned columns (drops that let red win on top)', () => {
    const b = initBoard();
    // Red horizontal three on row 4 with both row-5 ends empty. Dropping
    // yellow in col 0 or col 4 fills the support square and lets red land
    // on top for the win — the old 1-ply AI happily did this.
    b[5][1] = 'yellow'; b[5][2] = 'red'; b[5][3] = 'yellow';
    b[4][1] = 'red'; b[4][2] = 'red'; b[4][3] = 'red';
    for (let i = 0; i < 5; i++) {
      const col = bestMove(b, 'yellow', 'hard');
      expect([0, 4]).not.toContain(col);
    }
  });

  test('hard sees a two-move trap coming (the old AI could not)', () => {
    // Yellow to move. Red has pieces at bottom row cols 3 and 4.
    // If yellow plays a non-blocking move, red plays col 2 (or 5) creating
    // an open-ended three: _RRR_ — unstoppable double threat.
    const b = initBoard();
    dropPiece(b, 3, 'red');
    dropPiece(b, 0, 'yellow');
    dropPiece(b, 4, 'red');
    const col = bestMove(b, 'yellow', 'hard');
    // Yellow must interfere with the _ R R _ shape: playing 2 or 5 caps one
    // end; anything else loses by force.
    expect([2, 5]).toContain(col);
  });

  test('never returns an illegal column', () => {
    const b = initBoard();
    // Fill columns 0-2 completely
    for (const c of [0, 1, 2]) {
      for (let i = 0; i < ROWS; i++) dropPiece(b, c, i % 2 ? 'red' : 'yellow');
    }
    for (let i = 0; i < 30; i++) {
      const col = bestMove(b, 'yellow', 'easy');
      expect(col).toBeGreaterThanOrEqual(3);
      expect(col).toBeLessThan(COLS);
    }
  });

  test('returns -1 on a full board', () => {
    const b = initBoard();
    for (let c = 0; c < COLS; c++) {
      for (let i = 0; i < ROWS; i++) dropPiece(b, c, (c + i) % 2 ? 'red' : 'yellow');
    }
    expect(bestMove(b, 'yellow', 'hard')).toBe(-1);
  });

  test('hard beats a greedy 1-ply opponent from an empty board', () => {
    // The greedy opponent mimics the OLD ai: win if possible, block if
    // possible, else prefer center. Hard's search should beat it (or draw
    // at absolute worst) every single game.
    const greedy = (b: Board, me: Color, enemy: Color): number => {
      const moves = legalMoves(b);
      for (const c of moves) {
        const r = landingRow(b, c);
        b[r][c] = me;
        const w = checkWin(b, r, c, me);
        b[r][c] = null;
        if (w) return c;
      }
      for (const c of moves) {
        const r = landingRow(b, c);
        b[r][c] = enemy;
        const w = checkWin(b, r, c, enemy);
        b[r][c] = null;
        if (w) return c;
      }
      for (const c of [3, 2, 4, 1, 5, 0, 6]) if (moves.includes(c)) return c;
      return moves[0];
    };

    const b = initBoard();
    let result: 'ai' | 'greedy' | 'draw' | null = null;
    // Greedy (red) moves first — worst case for the AI (yellow).
    for (let turn = 0; turn < ROWS * COLS && result === null; turn++) {
      const isGreedy = turn % 2 === 0;
      const color: Color = isGreedy ? 'red' : 'yellow';
      const col = isGreedy ? greedy(b, 'red', 'yellow') : bestMove(b, 'yellow', 'hard');
      const r = dropPiece(b, col, color);
      if (r >= 0 && checkWin(b, r, col, color)) result = isGreedy ? 'greedy' : 'ai';
      else if (isFull(b)) result = 'draw';
    }
    expect(result === 'ai' || result === 'draw').toBe(true);
  });
});

describe('evaluate', () => {
  test('favors the player with more open threats', () => {
    const b = initBoard();
    dropPiece(b, 2, 'red');
    dropPiece(b, 3, 'red');
    dropPiece(b, 4, 'red');
    expect(evaluate(b, 'red')).toBeGreaterThan(0);
    expect(evaluate(b, 'yellow')).toBeLessThan(0);
  });
});
