import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameProps, MultiplayerState } from '@/types';
import LudoGame from '@/games/ludo';

const props: GameProps = {
  stage: 1,
  onScore: () => {},
  onProgress: () => {},
  onMessage: () => {},
  onEnd: () => {},
};

function startGame() {
  fireEvent.click(screen.getByRole('button', { name: /start game/i }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ludo piece chooser', () => {
  test('rolling a 6 with several options shows accessible piece buttons', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // rollDie → 6
    render(<LudoGame {...props} />);
    startGame();

    fireEvent.click(screen.getByRole('button', { name: /roll/i }));

    const group = screen.getByRole('group', { name: /choose a piece to move/i });
    expect(group).toBeInTheDocument();
    const options = screen.getAllByRole('button', { name: /piece \d/i });
    expect(options).toHaveLength(4); // all four can enter the track on a 6

    // Choosing one moves it out of the base and dismisses the chooser
    fireEvent.click(options[0]);
    expect(screen.queryByRole('group', { name: /choose a piece to move/i })).not.toBeInTheDocument();
  });
});

describe('ludo online multiplayer', () => {
  const online: MultiplayerState = {
    sessionId: 's1',
    playerNumber: 1,
    currentPlayer: 1,
    opponentName: 'Remotey',
    opponentAvatar: '🐱',
    status: 'playing',
    boardState: {
      pieces: [[5, -1, -1, -1], [10, 54, -1, -1]],
      lastRoll: 3,
      turnSeat: 2,
    },
  };

  test('renders the opponent name and syncs pieces from the server', () => {
    render(<LudoGame {...props} multiplayerState={online} />);
    startGame();
    expect(screen.getAllByText(/remotey/i).length).toBeGreaterThan(0);
    // Opponent has one piece home (54)
    expect(screen.getByText('1/4 home')).toBeInTheDocument();
    // Our side has none home
    expect(screen.getByText('0/4 home')).toBeInTheDocument();
  });

  test("the roll button is disabled when it is the opponent's turn", () => {
    render(<LudoGame {...props} multiplayerState={online} />);
    startGame();
    expect(screen.getByRole('button', { name: /waiting/i })).toBeDisabled();
  });

  test('dispatches my move to the server with the turn handed over', () => {
    const onMove = vi.fn();
    const myTurn: MultiplayerState = {
      ...online,
      boardState: { pieces: [[5, -1, -1, -1], [10, -1, -1, -1]], lastRoll: 2, turnSeat: 1 },
    };
    // Roll a 3 (0.4 * 6 = 2.4 → floor 2 → +1 = 3): only piece 0 can move
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    render(<LudoGame {...props} multiplayerState={myTurn} onMultiplayerMove={onMove} />);
    startGame();

    fireEvent.click(screen.getByRole('button', { name: /roll/i }));
    expect(onMove).toHaveBeenCalledTimes(1);
    const payload = onMove.mock.calls[0][0] as { boardState: { pieces: [number[], number[]]; turnSeat: number } };
    expect(payload.boardState.pieces[0][0]).toBe(8); // 5 + 3
    expect(payload.boardState.turnSeat).toBe(2);     // not a 6 → turn passes
  });

  test('a 6 keeps the turn for a bonus roll', () => {
    const onMove = vi.fn();
    const myTurn: MultiplayerState = {
      ...online,
      boardState: { pieces: [[5, -1, -1, -1], [10, -1, -1, -1]], lastRoll: 2, turnSeat: 1 },
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // rollDie → 6
    render(<LudoGame {...props} multiplayerState={myTurn} onMultiplayerMove={onMove} />);
    startGame();

    fireEvent.click(screen.getByRole('button', { name: /roll/i }));
    // With a 6, two options (advance piece 0, or bring a new piece out):
    // the chooser appears; pick the first option.
    const options = screen.getAllByRole('button', { name: /piece \d/i });
    fireEvent.click(options[0]);
    expect(onMove).toHaveBeenCalledTimes(1);
    const payload = onMove.mock.calls[0][0] as { boardState: { turnSeat: number } };
    expect(payload.boardState.turnSeat).toBe(1); // bonus roll — still my turn
  });
});
