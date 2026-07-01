import { describe, expect, test } from 'vitest';
import { checkWinner, bestMove, type Cell, type Player } from '../logic';

const _ = null;

describe('checkWinner', () => {
  test('detects rows, columns, and diagonals', () => {
    expect(checkWinner(['X', 'X', 'X', _, _, _, _, _, _]).result).toBe('X');
    expect(checkWinner(['O', _, _, 'O', _, _, 'O', _, _]).result).toBe('O');
    expect(checkWinner(['X', _, _, _, 'X', _, _, _, 'X']).result).toBe('X');
  });

  test('detects a draw', () => {
    const board: Cell[] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(checkWinner(board).result).toBe('draw');
  });

  test('returns null while the game is live', () => {
    expect(checkWinner([_, _, _, _, 'X', _, _, _, _]).result).toBeNull();
  });
});

describe('bestMove — every level', () => {
  test.each(['medium', 'hard'] as const)('%s takes an immediate win', level => {
    const board: Cell[] = ['O', 'O', _, 'X', 'X', _, _, _, _];
    expect(bestMove(board, 'O', level)).toBe(2);
  });

  test.each(['medium', 'hard'] as const)('%s blocks an immediate loss', level => {
    const board: Cell[] = ['X', 'X', _, 'O', _, _, _, _, _];
    expect(bestMove(board, 'O', level)).toBe(2);
  });

  test('returns a legal cell always', () => {
    const board: Cell[] = ['X', 'O', 'X', _, 'O', _, 'X', _, _];
    for (const level of ['easy', 'medium', 'hard'] as const) {
      for (let i = 0; i < 20; i++) {
        const m = bestMove(board, 'O', level);
        expect(board[m]).toBeNull();
      }
    }
  });
});

describe('bestMove — hard is unbeatable', () => {
  test('defuses the classic corner fork (medium falls for it)', () => {
    // X takes opposite corners with O in the center: O must NOT play a
    // corner-adjacent edge... the known safe reply is an edge. Concretely:
    // X: 0, 8; O: 4. Any corner reply by O loses to a fork? No — edge
    // reply is required. Hard must pick an edge (1, 3, 5, or 7).
    const board: Cell[] = ['X', _, _, _, 'O', _, _, _, 'X'];
    const m = bestMove(board, 'O', 'hard');
    expect([1, 3, 5, 7]).toContain(m);
  });

  test('creates its own fork when the human dawdles', () => {
    // O to move; O has center+corner, X has scattered edges. Perfect play
    // converts this — just assert hard's choice keeps a winning eval by
    // playing it out: hard (O) must win from here.
    let board: Cell[] = ['O', 'X', _, _, 'O', 'X', _, _, _];
    // X to move is actually O's turn in this fixture; play O perfectly vs
    // a greedy X that only wins/blocks.
    const greedyX = (b: Cell[]): number => {
      for (const lines of [['X', 'X'], ['O', 'O']]) {
        for (const [a, bb, c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
          const line = [b[a], b[bb], b[c]];
          if (line.filter(x => x === lines[0]).length === 2 && line.includes(null)) {
            return [a, bb, c][line.indexOf(null)];
          }
        }
      }
      return b.findIndex(x => x === null);
    };
    let turn: Player = 'O';
    let result: Cell | 'draw' | null = null;
    while (result === null) {
      const m = turn === 'O' ? bestMove(board, 'O', 'hard') : greedyX(board);
      board = [...board];
      board[m] = turn;
      result = checkWinner(board).result;
      turn = turn === 'O' ? 'X' : 'O';
    }
    expect(result).toBe('O');
  });

  test('never loses across 50 games against random play', () => {
    for (let g = 0; g < 50; g++) {
      let board: Cell[] = Array(9).fill(null);
      let turn: Player = g % 2 === 0 ? 'X' : 'O'; // alternate who starts
      let result: Cell | 'draw' | null = null;
      while (result === null) {
        let m: number;
        if (turn === 'O') {
          m = bestMove(board, 'O', 'hard');
        } else {
          const empty = board.map((c, i) => (c === null ? i : -1)).filter(i => i >= 0);
          m = empty[Math.floor(Math.random() * empty.length)];
        }
        board = [...board];
        board[m] = turn;
        result = checkWinner(board).result;
        turn = turn === 'X' ? 'O' : 'X';
      }
      expect(result === 'O' || result === 'draw').toBe(true);
    }
  });
});
