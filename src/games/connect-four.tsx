import { useState } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Define AI difficulty levels
const DIFFICULTY_LEVELS = {
  easy: { winChance: 0.4, blockChance: 0.6, centerChance: 0.7 },
  medium: { winChance: 0.8, blockChance: 0.95, centerChance: 0.9 },
  hard: { winChance: 1.0, blockChance: 1.0, centerChance: 1.0 },
};

type Cell = 'red' | 'yellow' | null;
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;

function initBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function clone(b: Board): Board {
  return b.map(r => [...r]);
}

function dropPiece(b: Board, col: number, color: 'red' | 'yellow'): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!b[r][col]) { b[r][col] = color; return r; }
  }
  return -1;
}

function checkWin(b: Board, row: number, col: number, color: string): boolean {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i * sign, c = col + dc * i * sign;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== color) break;
        count++;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

function isFull(b: Board): boolean {
  return b[0].every(c => c !== null);
}

// Simple AI: try to win > block > center > random
function aiCol(b: Board, difficulty: 'easy' | 'medium' | 'hard'): number {
  const { winChance, blockChance, centerChance } = DIFFICULTY_LEVELS[difficulty];
  const enemy = 'red';
  const me = 'yellow';

  // Try to win (with probability based on difficulty)
  if (Math.random() < winChance) {
    for (let c = 0; c < COLS; c++) {
      if (!b[0][c]) {
        const nb = clone(b);
        const r = dropPiece(nb, c, me);
        if (r >= 0 && checkWin(nb, r, c, me)) return c;
      }
    }
  }

  // Block opponent (with probability based on difficulty)
  if (Math.random() < blockChance) {
    for (let c = 0; c < COLS; c++) {
      if (!b[0][c]) {
        const nb = clone(b);
        const r = dropPiece(nb, c, enemy);
        if (r >= 0 && checkWin(nb, r, c, enemy)) return c;
      }
    }
  }

  // Center preference (with probability based on difficulty)
  if (Math.random() < centerChance) {
    const order = [3, 2, 4, 1, 5, 0, 6];
    for (const c of order) {
      if (!b[0][c]) return c;
    }
  }

  // Random move
  const emptyCols = [];
  for (let c = 0; c < COLS; c++) {
    if (!b[0][c]) emptyCols.push(c);
  }
  return emptyCols[Math.floor(Math.random() * emptyCols.length)];
}

function ConnectFourGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps & { aiDifficulty?: 'easy' | 'medium' | 'hard' }) {
  const [board, setBoard] = useState<Board>(initBoard);
  const [turn, setTurn] = useState<'red' | 'yellow'>('red');
  const [winner, setWinner] = useState<string | null>(null);
  const [wins, setWins] = useState(0);
  const targetWins = Math.min(stage + 1, 10);
  const difficulty = aiDifficulty || 'medium';

  const handleDrop = (col: number) => {
    if (winner || turn !== 'red' || board[0][col]) return;
    const nb = clone(board);
    const row = dropPiece(nb, col, 'red');
    if (row < 0) return;
    setBoard(nb);

    if (checkWin(nb, row, col, 'red')) {
      const newWins = wins + 1;
      setWins(newWins);
      setWinner('red');
      onScore(120);
      onProgress(newWins / targetWins);
      onMessage('You connected four!');
      if (newWins >= targetWins) {
        setTimeout(() => onEnd({ score: newWins * 120, stars: 3, summary: `Won ${newWins} Connect Four games!` }), 800);
      }
      return;
    }
    if (isFull(nb)) {
      setWinner('draw');
      onMessage("It's a draw!");
      return;
    }

    setTurn('yellow');
    onMessage('AI dropping...');
    setTimeout(() => {
      const aiC = aiCol(nb, difficulty);
      const aiR = dropPiece(nb, aiC, 'yellow');
      setBoard([...nb]);
      if (checkWin(nb, aiR, aiC, 'yellow')) {
        setWinner('yellow');
        onMessage('AI connected four — try again!');
        setTimeout(() => resetBoard(), 1500);
        return;
      }
      if (isFull(nb)) {
        setWinner('draw');
        onMessage("Draw!");
        return;
      }
      setTurn('red');
      onMessage('Your turn!');
    }, 400);
  };

  const resetBoard = () => {
    setBoard(initBoard());
    setTurn('red');
    setWinner(null);
    onMessage('Your turn! (Red)');
  };

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-3 mb-3 text-sm">
        <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: 🔴</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">AI: 🟡</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">{wins}/{targetWins}</span>
      </div>

      <div className="bg-[#1a3a6a] p-2 rounded-xl">
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleDrop(c)}
                disabled={!!winner || turn !== 'red' || r !== 0 && !board[r - 1]?.[c] === false}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
                style={{
                  background: cell === 'red' ? '#ef4444' : cell === 'yellow' ? '#fbbf24' : '#0f1d3a',
                  boxShadow: cell ? 'inset 0 -2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                }}
              />
            ))
          )}
        </div>
      </div>

      {winner && winner !== 'draw' && (
        <button
          onClick={resetBoard}
          className="mt-3 bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
        >
          {winner === 'red' ? 'You Win! Play Again' : 'You Lost — Try Again'}
        </button>
      )}
      {winner === 'draw' && (
        <button onClick={resetBoard} className="mt-3 bg-card text-text font-bold px-6 py-2.5 rounded-xl">
          Draw — Play Again
        </button>
      )}
    </div>
  );
}

registerGame('connect-four', {
  name: 'Connect Four',
  emoji: '🟡',
  description: 'Drop discs to connect four in a row!',
  category: 'board',
  stages: 10,
  component: ConnectFourGame,
  aiDifficulty: 'medium',
});

export default ConnectFourGame;
