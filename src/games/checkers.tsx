import { useState, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Piece = { color: 'red' | 'black'; king: boolean } | null;
type Board = Piece[][];
type Pos = [number, number];

const SIZE = 8;

function initBoard(): Board {
  const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
    }
  }
  for (let r = 5; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
    }
  }
  return board;
}

function cloneBoard(b: Board): Board {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

function getMoves(b: Board, r: number, c: number): { to: Pos; jump: boolean }[] {
  const piece = b[r][c];
  if (!piece) return [];
  const dirs: number[][] = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

  const moves: { to: Pos; jump: boolean }[] = [];
  // Jumps first
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc;
    const jr = r + dr * 2, jc = c + dc * 2;
    if (jr >= 0 && jr < SIZE && jc >= 0 && jc < SIZE) {
      if (b[mr]?.[mc] && b[mr][mc]!.color !== piece.color && !b[jr][jc]) {
        moves.push({ to: [jr, jc], jump: true });
      }
    }
  }
  // Regular moves (only if no jumps available)
  if (moves.length === 0) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !b[nr][nc]) {
        moves.push({ to: [nr, nc], jump: false });
      }
    }
  }
  return moves;
}

function hasJumps(b: Board, color: 'red' | 'black'): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c]?.color === color) {
        const moves = getMoves(b, r, c);
        if (moves.some(m => m.jump)) return true;
      }
    }
  }
  return false;
}

function countPieces(b: Board, color: 'red' | 'black'): number {
  let count = 0;
  for (const row of b) for (const cell of row) if (cell?.color === color) count++;
  return count;
}

// Simple AI: prefer jumps, then moves toward promotion, then random
function aiGetMove(b: Board): { from: Pos; to: Pos } | null {
  const allMoves: { from: Pos; to: Pos; score: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c]?.color === 'black') {
        for (const m of getMoves(b, r, c)) {
          let score = 0;
          if (m.jump) score += 10;
          if (m.to[0] === SIZE - 1) score += 5; // promotion
          score += m.to[0] - r; // move forward
          allMoves.push({ from: [r, c], to: m.to, score });
        }
      }
    }
  }
  if (allMoves.length === 0) return null;
  allMoves.sort((a, b) => b.score - a.score);
  // Pick from top 3 with some randomness
  const top = allMoves.slice(0, Math.min(3, allMoves.length));
  return top[Math.floor(Math.random() * top.length)];
}

function CheckersGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [mustJump, setMustJump] = useState<Pos | null>(null);
  const [wins, setWins] = useState(0);
  const targetWins = Math.min(stage + 1, 10);

  const doMove = useCallback((b: Board, from: Pos, to: Pos): { board: Board; wasJump: boolean } => {
    const nb = cloneBoard(b);
    const piece = nb[from[0]][from[1]]!;
    nb[to[0]][to[1]] = piece;
    nb[from[0]][from[1]] = null;
    let wasJump = false;
    if (Math.abs(to[0] - from[0]) === 2) {
      const mr = (from[0] + to[0]) / 2, mc = (from[1] + to[1]) / 2;
      nb[mr][mc] = null;
      wasJump = true;
    }
    // Promotion
    if ((piece.color === 'red' && to[0] === 0) || (piece.color === 'black' && to[0] === SIZE - 1)) {
      piece.king = true;
    }
    return { board: nb, wasJump };
  }, []);

  const handleCell = (r: number, c: number) => {
    if (turn !== 'red') return;

    const piece = board[r][c];

    // Select own piece
    if (piece?.color === 'red' && !mustJump) {
      setSelected([r, c]);
      return;
    }

    // Move selected piece
    if (selected) {
      const moves = getMoves(board, selected[0], selected[1]);
      const move = moves.find(m => m.to[0] === r && m.to[1] === c);
      if (move) {
        const jumpsAvailable = hasJumps(board, 'red');
        if (jumpsAvailable && !move.jump) return; // must jump if possible

        const { board: nb, wasJump } = doMove(board, selected, move.to);
        setBoard(nb);
        setSelected(null);

        // Multi-jump
        if (wasJump) {
          const moreJumps = getMoves(nb, move.to[0], move.to[1]).filter(m => m.jump);
          if (moreJumps.length > 0) {
            setMustJump(move.to);
            setSelected(move.to);
            onMessage('Continue jumping!');
            return;
          }
        }
        setMustJump(null);
        finishTurn(nb, 'black');
      } else {
        setSelected([r, c]);
      }
    }
  };

  const finishTurn = (b: Board, nextTurn: 'red' | 'black') => {
    const redCount = countPieces(b, 'red');
    const blackCount = countPieces(b, 'black');

    if (blackCount === 0) {
      const newWins = wins + 1;
      setWins(newWins);
      onScore(150);
      onProgress(newWins / targetWins);
      if (newWins >= targetWins) {
        onEnd({ score: newWins * 150, stars: 3, summary: `Won ${newWins} checkers games!` });
      } else {
        onMessage(`You captured all pieces! (${newWins}/${targetWins})`);
        setTimeout(() => resetBoard(), 1500);
      }
      return;
    }
    if (redCount === 0) {
      onMessage('You lost — try again!');
      setTimeout(() => resetBoard(), 1500);
      return;
    }

    setTurn(nextTurn);
    if (nextTurn === 'black') {
      onMessage('AI thinking...');
      setTimeout(() => {
        const aiM = aiGetMove(b);
        if (aiM) {
          const { board: nb } = doMove(b, aiM.from, aiM.to);
          setBoard(nb);
          setTurn('red');
          onMessage('Your turn!');
        } else {
          // AI has no moves — player wins
          const newWins = wins + 1;
          setWins(newWins);
          onScore(150);
          onProgress(newWins / targetWins);
          onMessage('AI has no moves — you win!');
          setTimeout(() => {
            if (newWins >= targetWins) {
              onEnd({ score: newWins * 150, stars: 3, summary: `Won ${newWins} checkers games!` });
            } else {
              resetBoard();
            }
          }, 1500);
        }
      }, 500);
    } else {
      onMessage('Your turn!');
    }
  };

  const resetBoard = () => {
    setBoard(initBoard());
    setSelected(null);
    setTurn('red');
    setMustJump(null);
    onMessage('Your turn! (Red pieces)');
  };

  const allMoves = selected ? getMoves(board, selected[0], selected[1]) : [];

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-3 mb-3 text-sm">
        <span className="bg-card rounded-lg px-3 py-1.5">
          <span className="text-danger font-bold">You: {countPieces(board, 'red')}</span>
        </span>
        <span className="bg-card rounded-lg px-3 py-1.5">
          <span className="text-text-muted font-bold">AI: {countPieces(board, 'black')}</span>
        </span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">
          {wins}/{targetWins}
        </span>
      </div>

      <div className="grid grid-cols-8 gap-0 border-2 border-card-hover rounded-lg overflow-hidden">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isMovable = allMoves.some(m => m.to[0] === r && m.to[1] === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCell(r, c)}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-lg relative ${
                  isDark ? 'bg-[#5c4033]' : 'bg-[#deb887]'
                } ${isSelected ? 'ring-2 ring-accent' : ''} ${isMovable ? 'ring-2 ring-success' : ''}`}
              >
                {cell && (
                  <span className={`text-xl ${cell.king ? 'font-bold' : ''}`}>
                    {cell.color === 'red' ? '🔴' : '⚫'}
                    {cell.king && '👑'}
                  </span>
                )}
                {isMovable && !cell && <span className="w-3 h-3 rounded-full bg-success/50" />}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-3 text-xs text-text-muted text-center">
        {turn === 'red' ? 'Your turn — tap a piece then tap a square' : 'AI is thinking...'}
      </div>
    </div>
  );
}

registerGame('checkers', {
  name: 'Checkers',
  emoji: '🔴',
  description: 'Classic draughts — capture all enemy pieces!',
  category: 'board',
  stages: 10,
  component: CheckersGame,
});

export default CheckersGame;
