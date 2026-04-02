import { useState, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Piece = { type: PieceType; color: 'w' | 'b' } | null;
type Board = Piece[][];
type Pos = [number, number];

const PIECE_SYMBOLS: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
};

function initBoard(): Board {
  const back = (c: 'w' | 'b'): Piece[] => [
    { type: 'R', color: c }, { type: 'N', color: c }, { type: 'B', color: c }, { type: 'Q', color: c },
    { type: 'K', color: c }, { type: 'B', color: c }, { type: 'N', color: c }, { type: 'R', color: c },
  ];
  return [
    back('b'),
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'b' })),
    ...Array.from({ length: 4 }, () => Array<Piece>(8).fill(null)),
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'w' })),
    back('w'),
  ];
}

function cloneBoard(b: Board): Board {
  return b.map(row => row.map(c => c ? { ...c } : null));
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getRawMoves(b: Board, r: number, c: number): Pos[] {
  const piece = b[r][c];
  if (!piece) return [];
  const moves: Pos[] = [];
  const { type, color } = piece;
  const dir = color === 'w' ? -1 : 1;

  const addIfValid = (nr: number, nc: number) => {
    if (inBounds(nr, nc) && b[nr][nc]?.color !== color) moves.push([nr, nc]);
  };
  const addSliding = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (!inBounds(nr, nc)) break;
        if (b[nr][nc]?.color === color) break;
        moves.push([nr, nc]);
        if (b[nr][nc]) break;
      }
    }
  };

  switch (type) {
    case 'P': {
      const startRow = color === 'w' ? 6 : 1;
      if (inBounds(r + dir, c) && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !b[r + dir * 2][c]) moves.push([r + dir * 2, c]);
      }
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc) && b[r + dir][c + dc]?.color && b[r + dir][c + dc]?.color !== color) {
          moves.push([r + dir, c + dc]);
        }
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addIfValid(r+dr, c+dc);
      break;
    case 'B': addSliding([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': addSliding([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': addSliding([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K':
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addIfValid(r+dr, c+dc);
      break;
  }
  return moves;
}

function findKing(b: Board, color: 'w' | 'b'): Pos | null {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (b[r][c]?.type === 'K' && b[r][c]?.color === color) return [r, c];
  }
  return null;
}

function isInCheck(b: Board, color: 'w' | 'b'): boolean {
  const king = findKing(b, color);
  if (!king) return false;
  const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (b[r][c]?.color === enemy) {
      if (getRawMoves(b, r, c).some(m => m[0] === king[0] && m[1] === king[1])) return true;
    }
  }
  return false;
}

function getLegalMoves(b: Board, r: number, c: number): Pos[] {
  const piece = b[r][c];
  if (!piece) return [];
  return getRawMoves(b, r, c).filter(([nr, nc]) => {
    const nb = cloneBoard(b);
    nb[nr][nc] = nb[r][c];
    nb[r][c] = null;
    return !isInCheck(nb, piece.color);
  });
}

function hasAnyLegalMoves(b: Board, color: 'w' | 'b'): boolean {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (b[r][c]?.color === color && getLegalMoves(b, r, c).length > 0) return true;
  }
  return false;
}

// Piece values for AI scoring
const PIECE_VALUES: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };

function aiMove(b: Board): { from: Pos; to: Pos } | null {
  const allMoves: { from: Pos; to: Pos; score: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c]?.color === 'b') {
        for (const [nr, nc] of getLegalMoves(b, r, c)) {
          let score = 0;
          if (b[nr][nc]) score += PIECE_VALUES[b[nr][nc]!.type] * 10; // capture
          if (nr === 7 && b[r][c]?.type === 'P') score += 80; // promotion
          // Center control
          if ((nr === 3 || nr === 4) && (nc === 3 || nc === 4)) score += 2;
          // Forward movement
          score += (nr - r);
          allMoves.push({ from: [r, c], to: [nr, nc], score });
        }
      }
    }
  }
  if (allMoves.length === 0) return null;
  allMoves.sort((a, b) => b.score - a.score);
  const top = allMoves.slice(0, Math.min(5, allMoves.length));
  return top[Math.floor(Math.random() * top.length)];
}

function ChessGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [wins, setWins] = useState(0);
  const [captured, setCaptured] = useState<{ w: PieceType[]; b: PieceType[] }>({ w: [], b: [] });
  const targetWins = stage <= 2 ? 1 : stage <= 4 ? 2 : 3;

  const handleCell = (r: number, c: number) => {
    if (turn !== 'w') return;
    const piece = board[r][c];

    if (piece?.color === 'w') {
      setSelected([r, c]);
      return;
    }

    if (selected) {
      const moves = getLegalMoves(board, selected[0], selected[1]);
      if (moves.some(m => m[0] === r && m[1] === c)) {
        const nb = cloneBoard(board);
        const capturedPiece = nb[r][c];
        if (capturedPiece) {
          setCaptured(prev => ({ ...prev, w: [...prev.w, capturedPiece.type] }));
        }
        // Pawn promotion
        if (nb[selected[0]][selected[1]]?.type === 'P' && r === 0) {
          nb[r][c] = { type: 'Q', color: 'w' };
        } else {
          nb[r][c] = nb[selected[0]][selected[1]];
        }
        nb[selected[0]][selected[1]] = null;
        setBoard(nb);
        setSelected(null);
        finishTurn(nb, 'b');
      } else {
        setSelected([r, c]);
      }
    }
  };

  const finishTurn = (b: Board, next: 'w' | 'b') => {
    // Check game state
    const enemyHasMoves = hasAnyLegalMoves(b, next);
    const inCheck = isInCheck(b, next);

    if (!enemyHasMoves) {
      if (inCheck) {
        // Checkmate!
        const newWins = wins + 1;
        setWins(newWins);
        onScore(200);
        onProgress(newWins / targetWins);
        onMessage('Checkmate! You win!');
        if (newWins >= targetWins) {
          setTimeout(() => onEnd({ score: newWins * 200, stars: 3, summary: `Won ${newWins} chess games!` }), 1000);
        } else {
          setTimeout(() => resetBoard(), 1500);
        }
      } else {
        onMessage('Stalemate — draw!');
        setTimeout(() => resetBoard(), 1500);
      }
      return;
    }

    setTurn(next);
    if (next === 'b') {
      onMessage('AI thinking...');
      setTimeout(() => {
        const aiM = aiMove(b);
        if (aiM) {
          const nb = cloneBoard(b);
          const capturedPiece = nb[aiM.to[0]][aiM.to[1]];
          if (capturedPiece) {
            setCaptured(prev => ({ ...prev, b: [...prev.b, capturedPiece.type] }));
          }
          if (nb[aiM.from[0]][aiM.from[1]]?.type === 'P' && aiM.to[0] === 7) {
            nb[aiM.to[0]][aiM.to[1]] = { type: 'Q', color: 'b' };
          } else {
            nb[aiM.to[0]][aiM.to[1]] = nb[aiM.from[0]][aiM.from[1]];
          }
          nb[aiM.from[0]][aiM.from[1]] = null;
          setBoard(nb);

          const playerHasMoves = hasAnyLegalMoves(nb, 'w');
          const playerInCheck = isInCheck(nb, 'w');
          if (!playerHasMoves) {
            if (playerInCheck) {
              onMessage('Checkmate — AI wins!');
            } else {
              onMessage('Stalemate — draw!');
            }
            setTimeout(() => resetBoard(), 1500);
            return;
          }
          if (playerInCheck) onMessage('Check! Your turn');
          else onMessage('Your turn!');
          setTurn('w');
        }
      }, 400);
    }
  };

  const resetBoard = () => {
    setBoard(initBoard());
    setSelected(null);
    setTurn('w');
    setCaptured({ w: [], b: [] });
    onMessage('Your turn! (White)');
  };

  const legalMoves = selected ? getLegalMoves(board, selected[0], selected[1]) : [];

  return (
    <div className="h-full flex flex-col items-center p-2">
      <div className="flex gap-3 mb-2 text-sm items-center">
        <span className="bg-card rounded-lg px-3 py-1 text-text-muted text-xs">
          Captured: {captured.b.map(p => PIECE_SYMBOLS['b' + p]).join('')}
        </span>
        <span className="bg-card rounded-lg px-3 py-1 text-accent text-xs font-bold">
          {wins}/{targetWins}
        </span>
      </div>

      <div className="grid grid-cols-8 border-2 border-card-hover rounded-lg overflow-hidden">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isLight = (r + c) % 2 === 0;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isMovable = legalMoves.some(m => m[0] === r && m[1] === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCell(r, c)}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl relative ${
                  isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                } ${isSelected ? 'ring-2 ring-accent ring-inset' : ''}`}
              >
                {cell && (
                  <span style={{ textShadow: cell.color === 'w' ? '0 0 2px #000' : '0 0 2px #fff' }}>
                    {PIECE_SYMBOLS[cell.color + cell.type]}
                  </span>
                )}
                {isMovable && (
                  <span className={`absolute w-3 h-3 rounded-full ${cell ? 'ring-2 ring-success ring-inset' : 'bg-success/40'}`} />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-2 flex gap-3 text-sm items-center">
        <span className="bg-card rounded-lg px-3 py-1 text-text-muted text-xs">
          {captured.w.map(p => PIECE_SYMBOLS['w' + p]).join('') || '—'}
        </span>
      </div>

      <div className="mt-2 text-xs text-text-muted text-center">
        {turn === 'w' ? 'Your turn — tap a piece then tap a square' : 'AI is thinking...'}
      </div>
    </div>
  );
}

registerGame('chess', {
  name: 'Chess',
  emoji: '♔',
  description: 'The royal game — checkmate the AI king!',
  category: 'board',
  stages: 5,
  component: ChessGame,
});

export default ChessGame;
