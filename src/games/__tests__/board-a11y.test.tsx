import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameProps } from '@/types';
import TicTacToeGame from '@/games/tic-tac-toe';
import ConnectFourGame from '@/games/connect-four';

const props: GameProps = {
  stage: 1,
  onScore: () => {},
  onProgress: () => {},
  onMessage: () => {},
  onEnd: () => {},
};

describe('board game accessibility', () => {
  test('tic-tac-toe cells have positional accessible names', () => {
    render(<TicTacToeGame {...props} />);
    const start = screen.queryByRole('button', { name: /start/i });
    if (start) fireEvent.click(start);
    expect(screen.getByRole('grid', { name: /tic-tac-toe board/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Row 1, column 1: empty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Row 3, column 3: empty' })).toBeInTheDocument();

    // Playing a cell updates its accessible name
    fireEvent.click(screen.getByRole('button', { name: 'Row 2, column 2: empty' }));
    expect(screen.getByRole('button', { name: 'Row 2, column 2: X' })).toBeInTheDocument();
  });

  test('connect four exposes labelled drop columns and cells', () => {
    render(<ConnectFourGame {...props} />);
    const start = screen.queryByRole('button', { name: /start/i });
    if (start) fireEvent.click(start);
    expect(screen.getByRole('grid', { name: /connect four board/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drop disc in column 4' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /column 1, row 6: empty/i }).length).toBeGreaterThan(0);

    // Dropping a disc updates the landing cell's accessible name
    fireEvent.click(screen.getByRole('button', { name: 'Drop disc in column 4' }));
    expect(screen.getByRole('button', { name: 'Column 4, row 6: your disc' })).toBeInTheDocument();
  });
});
