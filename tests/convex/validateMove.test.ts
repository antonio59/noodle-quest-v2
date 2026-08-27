import { describe, it, expect } from 'vitest';
import {
  validateConnectFour,
  validateScoreFour,
  validateTicTacToe,
  validateMoveForGame,
} from '../../convex/model/validateMove';

describe('validateMove', () => {
  it('accepts a connect-four win for the mover', () => {
    const board = Array.from({ length: 6 }, () => Array(7).fill(null));
    for (let c = 0; c < 4; c++) board[5][c] = 'red';
    expect(validateConnectFour({ board }, 1, 1)).toBeNull();
  });

  it('rejects a connect-four win claim without a line', () => {
    const board = Array.from({ length: 6 }, () => Array(7).fill(null));
    board[5][0] = 'red';
    expect(validateConnectFour({ board }, 1, 1)).toBe('Board does not show a win.');
  });

  it('accepts score-four draw claim', () => {
    const board = Array(64).fill(0);
    expect(validateScoreFour({ board }, 0, 1)).toBeNull();
  });

  it('accepts tic-tac-toe X win on flat board', () => {
    const board = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
    expect(validateTicTacToe({ board }, 1, 1)).toBeNull();
  });

  it('routes by gameId', () => {
    expect(validateMoveForGame('bingo', {}, undefined, 1)).toBeNull();
    expect(validateMoveForGame('connect-four', null, 1, 1)).toBe('Missing board state.');
  });
});
