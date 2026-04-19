import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/types';

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
const MAX_LOSSES = 3;

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

function aiCol(b: Board, difficulty: 'easy' | 'medium' | 'hard'): number {
  const { winChance, blockChance, centerChance } = DIFFICULTY_LEVELS[difficulty];
  const enemy = 'red';
  const me = 'yellow';

  if (Math.random() < winChance) {
    for (let c = 0; c < COLS; c++) {
      if (!b[0][c]) {
        const nb = clone(b);
        const r = dropPiece(nb, c, me);
        if (r >= 0 && checkWin(nb, r, c, me)) return c;
      }
    }
  }

  if (Math.random() < blockChance) {
    for (let c = 0; c < COLS; c++) {
      if (!b[0][c]) {
        const nb = clone(b);
        const r = dropPiece(nb, c, enemy);
        if (r >= 0 && checkWin(nb, r, c, enemy)) return c;
      }
    }
  }

  if (Math.random() < centerChance) {
    const order = [3, 2, 4, 1, 5, 0, 6];
    for (const c of order) {
      if (!b[0][c]) return c;
    }
  }

  const emptyCols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!b[0][c]) emptyCols.push(c);
  }
  return emptyCols[Math.floor(Math.random() * emptyCols.length)];
}

function ConnectFourGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const myColor: 'red' | 'yellow' = isOnline
    ? (multiplayerState.playerNumber === 1 ? 'red' : 'yellow')
    : 'red';
  const otherColor: 'red' | 'yellow' = myColor === 'red' ? 'yellow' : 'red';

  const [board, setBoard] = useState<Board>(initBoard);
  const [turn, setTurn] = useState<'red' | 'yellow'>('red');
  const [winner, setWinner] = useState<string | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const targetWins = Math.max(1, stage + 1);
  const difficulty = aiDifficulty || 'medium';

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const winsRef = useRef(0);
  const lossesRef = useRef(0);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Online sync: reflect server board + whose turn it is.
  useEffect(() => {
    if (!isOnline) return;
    const bs = multiplayerState.boardState as { board?: Board; last?: { row: number; col: number; color: 'red' | 'yellow' } } | null | undefined;
    if (bs && Array.isArray(bs.board)) {
      setBoard(bs.board);
      setTurn(multiplayerState.currentPlayer === 1 ? 'red' : 'yellow');
      // Detect end via last move (server-winner or draw).
      if (bs.last && checkWin(bs.board, bs.last.row, bs.last.col, bs.last.color)) {
        setWinner(bs.last.color);
        if (!endedRef.current) {
          endedRef.current = true;
          const won = bs.last.color === myColor;
          onEnd({
            score: won ? 120 : 10,
            stars: won ? 3 : 1,
            summary: won ? 'You connected four!' : 'Opponent connected four.',
          });
        }
      } else if (isFull(bs.board)) {
        setWinner('draw');
        if (!endedRef.current) {
          endedRef.current = true;
          onEnd({ score: 40, stars: 2, summary: "It's a draw!" });
        }
      }
    }
  }, [isOnline, multiplayerState, myColor, onEnd]);

  const resetBoard = useCallback(() => {
    if (endedRef.current) return;
    setBoard(initBoard());
    setTurn('red');
    setWinner(null);
    onMessage('Your turn! (Red)');
  }, [onMessage]);

  const finishMatch = useCallback((outcome: 'win' | 'lose') => {
    if (endedRef.current) return;
    endedRef.current = true;
    const finalWins = winsRef.current;
    const finalLosses = lossesRef.current;
    const stars = outcome === 'win'
      ? (finalLosses === 0 ? 3 : finalLosses === 1 ? 2 : 1)
      : (finalWins > 0 ? 2 : 1);
    const summary = outcome === 'win'
      ? `Won ${finalWins} of ${finalWins + finalLosses} Connect Four games!`
      : `AI won the match — ${finalWins} wins vs ${finalLosses} losses.`;
    onEnd({ score: finalWins * 120, stars, summary });
  }, [onEnd]);

  const handleDrop = (col: number) => {
    if (endedRef.current || winner || board[0][col]) return;

    if (isOnline) {
      if (turn !== myColor) return;
      const nb = clone(board);
      const row = dropPiece(nb, col, myColor);
      if (row < 0) return;
      setBoard(nb);
      const iWon = checkWin(nb, row, col, myColor);
      const drew = !iWon && isFull(nb);
      const serverWinner = iWon ? multiplayerState.playerNumber : drew ? 0 : undefined;
      onMultiplayerMove?.({
        boardState: { board: nb, last: { row, col, color: myColor } },
        winner: serverWinner,
      });
      setTurn(otherColor);
      if (iWon) setWinner(myColor);
      else if (drew) setWinner('draw');
      return;
    }

    if (turn !== 'red') return;
    const nb = clone(board);
    const row = dropPiece(nb, col, 'red');
    if (row < 0) return;
    setBoard(nb);

    if (checkWin(nb, row, col, 'red')) {
      const newWins = winsRef.current + 1;
      winsRef.current = newWins;
      setWins(newWins);
      setWinner('red');
      onScore(120);
      onProgress(newWins / targetWins);
      onMessage('You connected four!');
      if (newWins >= targetWins) {
        schedule(() => finishMatch('win'), 800);
      } else {
        schedule(resetBoard, 1500);
      }
      return;
    }
    if (isFull(nb)) {
      setWinner('draw');
      onMessage("It's a draw! New round...");
      schedule(resetBoard, 1500);
      return;
    }

    setTurn('yellow');
    onMessage('AI dropping...');
    schedule(() => {
      if (endedRef.current) return;
      const aiC = aiCol(nb, difficulty);
      const nb2 = clone(nb);
      const aiR = dropPiece(nb2, aiC, 'yellow');
      setBoard(nb2);
      if (aiR >= 0 && checkWin(nb2, aiR, aiC, 'yellow')) {
        const newLosses = lossesRef.current + 1;
        lossesRef.current = newLosses;
        setLosses(newLosses);
        setWinner('yellow');
        if (newLosses >= MAX_LOSSES) {
          onMessage('AI won the match!');
          schedule(() => finishMatch('lose'), 1000);
        } else {
          onMessage(`AI connected four — ${newLosses}/${MAX_LOSSES} losses.`);
          schedule(resetBoard, 1500);
        }
        return;
      }
      if (isFull(nb2)) {
        setWinner('draw');
        onMessage("Draw! New round...");
        schedule(resetBoard, 1500);
        return;
      }
      setTurn('red');
      onMessage('Your turn!');
    }, 400);
  };

  const isMyTurn = isOnline ? turn === myColor : turn === 'red';
  const inputDisabled = !!winner || !isMyTurn;
  const myChip = myColor === 'red' ? '🔴' : '🟡';
  const otherChip = otherColor === 'red' ? '🔴' : '🟡';

  return (
    <div className="h-full flex flex-col items-center p-3">
      {isOnline ? (
        <div className="flex gap-2 mb-3 text-xs items-center flex-wrap justify-center">
          <span className={`bg-card rounded-lg px-3 py-1.5 font-bold ${isMyTurn ? 'text-accent' : 'text-text-muted'}`}>
            You: {myChip}
          </span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">
            {multiplayerState?.opponentAvatar} {multiplayerState?.opponentName}: {otherChip}
          </span>
          <span className={`font-bold ${isMyTurn ? 'text-success animate-pulse' : 'text-text-dim'}`}>
            {isMyTurn ? 'Your turn' : 'Waiting...'}
          </span>
        </div>
      ) : (
        <div className="flex gap-3 mb-3 text-sm">
          <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: 🔴</span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">AI: 🟡</span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">{wins}/{targetWins}</span>
          {losses > 0 && (
            <span className="bg-card rounded-lg px-3 py-1.5 text-danger text-xs">L: {losses}/{MAX_LOSSES}</span>
          )}
        </div>
      )}

      <div className="text-xs text-text-muted text-center mb-2">
        Click a column to drop your disc
      </div>

      <div className="bg-[#1a3a6a] p-2 rounded-xl game-board">
        {/* Column hover indicators */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={`arrow-${c}`}
              onClick={() => handleDrop(c)}
              disabled={inputDisabled || !!board[0][c]}
              className="game-cell h-5 flex items-center justify-center text-text-muted hover:text-danger transition-colors disabled:opacity-0"
            >
              ▼
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleDrop(c)}
                disabled={inputDisabled}
                className="game-cell w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
                style={{
                  background: cell === 'red' ? '#ef4444' : cell === 'yellow' ? '#fbbf24' : '#0f1d3a',
                  boxShadow: cell ? 'inset 0 -2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectFourGame;
