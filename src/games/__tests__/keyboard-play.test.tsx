import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameProps } from '@/types';
import CheckersGame from '@/games/checkers';
import ChessGame from '@/games/chess';

const props: GameProps = {
  stage: 1,
  onScore: () => {},
  onProgress: () => {},
  onMessage: () => {},
  onEnd: () => {},
};

function startGame() {
  const start = screen.queryByRole('button', { name: /start/i });
  if (start) fireEvent.click(start);
}

describe('checkers keyboard play', () => {
  test('arrow keys move a cursor and Enter selects a piece', () => {
    const { container } = render(<CheckersGame {...props} />);
    startGame();

    const board = container.querySelector('svg[role="application"]')!;
    expect(board).not.toBeNull();
    expect(board).toHaveAttribute('tabindex', '0');

    fireEvent.focus(board);
    // Cursor appears at the initial square (a red piece at row 5, col 2)
    expect(container.querySelector('rect[stroke-dasharray]')).not.toBeNull();

    // Select the piece under the cursor
    fireEvent.keyDown(board, { key: 'Enter' });
    // The live region should now announce it as selected
    const status = container.querySelector('.sr-only[role="status"]')!;
    expect(status.textContent).toContain('selected');

    // Move cursor up-left to a legal target and land the move
    fireEvent.keyDown(board, { key: 'ArrowUp' });
    fireEvent.keyDown(board, { key: 'ArrowLeft' });
    expect(status.textContent).toContain('available move');
    fireEvent.keyDown(board, { key: 'Enter' });

    // The piece moved: its old square is now empty
    fireEvent.keyDown(board, { key: 'ArrowDown' });
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    expect(status.textContent).toContain('empty');
  });

  test('Escape hides the cursor; blur clears the announcement', () => {
    const { container } = render(<CheckersGame {...props} />);
    startGame();
    const board = container.querySelector('svg[role="application"]')!;
    fireEvent.focus(board);
    expect(container.querySelector('rect[stroke-dasharray]')).not.toBeNull();
    fireEvent.keyDown(board, { key: 'Escape' });
    expect(container.querySelector('rect[stroke-dasharray]')).toBeNull();
    fireEvent.blur(board);
    expect(container.querySelector('.sr-only[role="status"]')!.textContent).toBe('');
  });
});

describe('chess keyboard play', () => {
  test('cursor starts on e2 and Enter selects the pawn', () => {
    const { container } = render(<ChessGame {...props} />);
    startGame();

    const board = container.querySelector('svg[role="application"]')!;
    expect(board).not.toBeNull();

    fireEvent.focus(board);
    const status = container.querySelector('.sr-only[role="status"]')!;
    expect(status.textContent).toContain('e2: your pawn');

    fireEvent.keyDown(board, { key: 'Enter' });
    expect(status.textContent).toContain('selected');

    // e3 (one square up) is a legal move for the e2 pawn
    fireEvent.keyDown(board, { key: 'ArrowUp' });
    expect(status.textContent).toContain('e3: empty, legal move');
    fireEvent.keyDown(board, { key: 'Enter' });
    // Pawn moved: e3 now holds our pawn
    expect(status.textContent).toContain('e3');
  });

  test('cursor stays inside the board at the edges', () => {
    const { container } = render(<ChessGame {...props} />);
    startGame();
    const board = container.querySelector('svg[role="application"]')!;
    fireEvent.focus(board);
    const status = container.querySelector('.sr-only[role="status"]')!;
    for (let i = 0; i < 12; i++) fireEvent.keyDown(board, { key: 'ArrowLeft' });
    for (let i = 0; i < 12; i++) fireEvent.keyDown(board, { key: 'ArrowDown' });
    expect(status.textContent).toContain('a1');
  });
});
