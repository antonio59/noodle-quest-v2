import { useState } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Cell = 'X' | 'O' | null;
type Player = 'X' | 'O';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function checkWinner(board: Cell[]): Cell | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(c => c !== null)) return 'draw';
  return null;
}

// Simple AI: win > block > center > random
function aiMove(board: Cell[], ai: Player): number {
  const human = ai === 'X' ? 'O' : 'X';
  // Try to win
  for (const [a, b, c] of WIN_LINES) {
    const line = [board[a], board[b], board[c]];
    if (line.filter(x => x === ai).length === 2 && line.includes(null)) {
      return [a, b, c][line.indexOf(null)];
    }
  }
  // Try to block
  for (const [a, b, c] of WIN_LINES) {
    const line = [board[a], board[b], board[c]];
    if (line.filter(x => x === human).length === 2 && line.includes(null)) {
      return [a, b, c][line.indexOf(null)];
    }
  }
  // Center
  if (!board[4]) return 4;
  // Random
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function TicTacToeGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>('X');
  const [winner, setWinner] = useState<Cell | 'draw' | null>(null);
  const [wins, setWins] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const targetWins = stage <= 3 ? stage : 3 + Math.floor(stage / 2);

  const human: Player = 'X';
  const ai: Player = 'O';

  const handleCell = (i: number) => {
    if (board[i] || winner || turn !== human) return;
    const next = [...board];
    next[i] = human;
    setBoard(next);
    const result = checkWinner(next);
    if (result) {
      handleResult(result, next);
    } else {
      setTurn(ai);
      onMessage('Thinking...');
      setTimeout(() => {
        const aiIdx = aiMove(next, ai);
        const afterAi = [...next];
        afterAi[aiIdx] = ai;
        setBoard(afterAi);
        const aiResult = checkWinner(afterAi);
        if (aiResult) {
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
    onMessage('Your turn! (X)');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="flex gap-4 mb-4 text-sm">
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent font-bold">Wins: {wins}/{targetWins}</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">Games: {gamesPlayed}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 bg-card rounded-2xl mb-4">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleCell(i)}
            disabled={!!cell || !!winner || turn !== human}
            className={`w-20 h-20 rounded-xl text-3xl font-bold flex items-center justify-center transition-all active:scale-90 ${
              cell === 'X' ? 'text-accent' : cell === 'O' ? 'text-danger' : 'bg-card-hover hover:bg-card-hover'
            } ${!cell && !winner && turn === human ? 'hover:bg-card-hover' : ''}`}
            style={{ boxShadow: cell ? 'none' : '0 2px 0 rgba(0,0,0,0.2)' }}
          >
            {cell || ''}
          </button>
        ))}
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

registerGame('tic-tac-toe', {
  name: 'Tic-Tac-Toe',
  emoji: '⭕',
  description: 'Classic X and O — beat the AI!',
  category: 'board',
  stages: 5,
  component: TicTacToeGame,
});

export default TicTacToeGame;
