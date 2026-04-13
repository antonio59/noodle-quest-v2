import { useState } from 'react';
import type { GameProps } from '@/types';

// Define AI difficulty levels
const DIFFICULTY_LEVELS = {
  easy: { winChance: 0.3, blockChance: 0.6, centerChance: 0.8 },
  medium: { winChance: 0.7, blockChance: 0.9, centerChance: 0.95 },
  hard: { winChance: 1.0, blockChance: 1.0, centerChance: 1.0 },
};

type Cell = 'X' | 'O' | null;
type Player = 'X' | 'O';
type WinLine = number[] | null;

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function checkWinner(board: Cell[]): { result: Cell | 'draw' | null; line: WinLine } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { result: board[a], line };
  }
  if (board.every(c => c !== null)) return { result: 'draw', line: null };
  return { result: null, line: null };
}

// Simple AI: win > block > center > random
function aiMove(board: Cell[], ai: Player, difficulty: 'easy' | 'medium' | 'hard'): number {
  const human = ai === 'X' ? 'O' : 'X';
  const { winChance, blockChance, centerChance } = DIFFICULTY_LEVELS[difficulty];
  
  // Try to win (with probability based on difficulty)
  if (Math.random() < winChance) {
    for (const [a, b, c] of WIN_LINES) {
      const line = [board[a], board[b], board[c]];
      if (line.filter(x => x === ai).length === 2 && line.includes(null)) {
        return [a, b, c][line.indexOf(null)];
      }
    }
  }
  
  // Try to block (with probability based on difficulty)
  if (Math.random() < blockChance) {
    for (const [a, b, c] of WIN_LINES) {
      const line = [board[a], board[b], board[c]];
      if (line.filter(x => x === human).length === 2 && line.includes(null)) {
        return [a, b, c][line.indexOf(null)];
      }
    }
  }
  
  // Center (with probability based on difficulty)
  if (Math.random() < centerChance && !board[4]) {
    return 4;
  }
  
  // Random move
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function TicTacToeGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps & { aiDifficulty?: 'easy' | 'medium' | 'hard' }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>('X');
  const [winner, setWinner] = useState<Cell | 'draw' | null>(null);
  const [winLine, setWinLine] = useState<WinLine>(null);
  const [wins, setWins] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const targetWins = stage <= 3 ? stage : 3 + Math.floor(stage / 2);

  const human: Player = 'X';
  const ai: Player = 'O';
  const difficulty = aiDifficulty || 'medium';

  const handleCell = (i: number) => {
    if (board[i] || winner || turn !== human) return;
    const next = [...board];
    next[i] = human;
    setBoard(next);
    const { result, line } = checkWinner(next);
    if (result) {
      setWinLine(line);
      handleResult(result, next);
    } else {
      setTurn(ai);
      onMessage('Thinking...');
      setTimeout(() => {
        const aiIdx = aiMove(next, ai, difficulty);
        const afterAi = [...next];
        afterAi[aiIdx] = ai;
        setBoard(afterAi);
        const { result: aiResult, line: aiLine } = checkWinner(afterAi);
        if (aiResult) {
          setWinLine(aiLine);
          handleResult(aiResult, afterAi);
        } else {
          setTurn(human);
          onMessage('Your turn!');
        }
      }, 400);
    }
  };

  const handleResult = (result: Cell | 'draw', finalBoard: Cell[]) => {
    setWinner(result);
    const newGames = gamesPlayed + 1;
    setGamesPlayed(newGames);
    if (result === human) {
      const newWins = wins + 1;
      setWins(newWins);
      onScore(100);
      onProgress(newWins / targetWins);
      if (newWins >= targetWins) {
        const stars = newWins >= targetWins + 1 ? 3 : newWins >= targetWins ? 2 : 1;
        onEnd({ score: newWins * 100, stars, summary: `You won ${newWins} games!` });
      } else {
        onMessage(`Win ${newWins}/${targetWins}!`);
      }
    } else if (result === ai) {
      onMessage('You lost this round — try again!');
    } else {
      onMessage("It's a draw!");
    }
  };

  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
    setWinLine(null);
    onMessage('Your turn! (X)');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="flex gap-4 mb-4 text-sm">
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent font-bold">Wins: {wins}/{targetWins}</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">Games: {gamesPlayed}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 bg-card rounded-2xl mb-4 game-board">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i) ?? false;
          return (
            <button
              key={i}
              onClick={() => handleCell(i)}
              disabled={!!cell || !!winner || turn !== human}
              className={`game-cell w-20 h-20 rounded-xl text-3xl font-bold flex items-center justify-center transition-all active:scale-90 ${
                cell === 'X' ? 'text-accent' : cell === 'O' ? 'text-danger' : 'bg-card-hover hover:bg-card-hover'
              } ${!cell && !winner && turn === human ? 'hover:bg-card-hover' : ''} ${
                isWinCell ? 'ring-3 ring-success bg-success/20' : ''
              }`}
              style={{ boxShadow: cell ? 'none' : '0 2px 0 rgba(0,0,0,0.2)' }}
            >
              {cell || ''}
            </button>
          );
        })}
      </div>

      {winner && (
        <button
          onClick={resetBoard}
          className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
        >
          {winner === 'draw' ? 'Draw — Play Again' : winner === human ? 'You Win! Play Again' : 'You Lost — Try Again'}
        </button>
      )}
    </div>
  );
}

export default TicTacToeGame;
