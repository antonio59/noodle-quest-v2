import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/types';

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

function getWinLine(b: Board, row: number, col: number, color: string): number[][] | null {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const line: number[][] = [[row, col]];
    for (const sign of [1, -1]) {
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i * sign;
        const c = col + dc * i * sign;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== color) break;
        line.push([r, c]);
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

function checkWin(b: Board, row: number, col: number, color: string): boolean {
  return getWinLine(b, row, col, color) !== null;
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
  const [winLine, setWinLine] = useState<number[][] | null>(null);
  const [started, setStarted] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const difficulty = aiDifficulty || 'medium';

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    endedRef.current = false;
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    const bs = multiplayerState.boardState as { board?: Board; last?: { row: number; col: number; color: 'red' | 'yellow' } } | null | undefined;
    if (bs && Array.isArray(bs.board)) {
      setBoard(bs.board);
      setTurn(multiplayerState.currentPlayer === 1 ? 'red' : 'yellow');
      if (bs.last) {
        const wl = getWinLine(bs.board, bs.last.row, bs.last.col, bs.last.color);
        if (wl) {
          setWinLine(wl);
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
    }
  }, [isOnline, multiplayerState, myColor, onEnd]);

  const handleDrop = (col: number) => {
    if (endedRef.current || winner || board[0][col]) return;

    if (isOnline) {
      if (turn !== myColor) return;
      const nb = clone(board);
      const row = dropPiece(nb, col, myColor);
      if (row < 0) return;
      setBoard(nb);
      const wl = getWinLine(nb, row, col, myColor);
      if (wl) setWinLine(wl);
      const iWon = !!wl;
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

    const wl = getWinLine(nb, row, col, 'red');
    if (wl) {
      setWinLine(wl);
      setWinner('red');
      onScore(120);
      onProgress(1);
      onMessage('You connected four!');
      endedRef.current = true;
      schedule(() => onEnd({ score: 120, stars: 3, summary: 'You connected four in a row! Well done!' }), 800);
      return;
    }
    if (isFull(nb)) {
      setWinner('draw');
      onMessage("It's a draw!");
      endedRef.current = true;
      schedule(() => onEnd({ score: 40, stars: 2, summary: "It's a draw — the board is full!" }), 800);
      return;
    }

    setTurn('yellow');
    onMessage('AI thinking...');
    schedule(() => {
      if (endedRef.current) return;
      const aiC = aiCol(nb, difficulty);
      const nb2 = clone(nb);
      const aiR = dropPiece(nb2, aiC, 'yellow');
      setBoard(nb2);
      if (aiR >= 0) {
        const aiWl = getWinLine(nb2, aiR, aiC, 'yellow');
        if (aiWl) {
          setWinLine(aiWl);
          setWinner('yellow');
          onMessage('AI connected four!');
          endedRef.current = true;
          schedule(() => onEnd({ score: 10, stars: 1, summary: 'The AI connected four first. Try again!' }), 1000);
          return;
        }
      }
      if (isFull(nb2)) {
        setWinner('draw');
        onMessage("It's a draw!");
        endedRef.current = true;
        schedule(() => onEnd({ score: 40, stars: 2, summary: "It's a draw — the board is full!" }), 800);
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

  const isWinCell = (r: number, c: number) => winLine?.some(([wr, wc]) => wr === r && wc === c) ?? false;

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl">🔴</div>
        <h2 className="text-2xl font-bold">Connect Four</h2>
        <p className="text-text-muted text-sm text-center max-w-xs">
          Drop discs to connect 4 in a row — horizontally, vertically, or diagonally!
        </p>
        <div className="bg-card rounded-xl p-4 flex gap-6 text-sm">
          <div className="text-center">
            <div className="text-2xl mb-1">🔴</div>
            <div className="text-text-muted">You</div>
          </div>
          <div className="text-text-muted self-center">vs</div>
          <div className="text-center">
            <div className="text-2xl mb-1">🟡</div>
            <div className="text-text-muted">AI ({difficulty})</div>
          </div>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start Game
        </button>
      </div>
    );
  }

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
          <span className={`font-bold ${isMyTurn ? 'text-success animate-pulse' : 'text-text-muted'}`}>
            {isMyTurn ? 'Your turn' : 'Waiting...'}
          </span>
        </div>
      ) : (
        <div className="flex gap-3 mb-3 text-sm">
          <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: 🔴</span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-warning font-bold">AI: 🟡</span>
          <span className={`bg-card rounded-lg px-3 py-1.5 text-xs font-bold ${turn === 'red' && !winner ? 'text-accent animate-pulse' : 'text-text-muted'}`}>
            {winner ? (winner === 'draw' ? "It's a draw!" : winner === 'red' ? '🎉 You win!' : '🤖 AI wins!') : (turn === 'red' ? 'Your turn' : 'AI thinking...')}
          </span>
        </div>
      )}

      <div className="bg-[#1a3a6a] p-2 rounded-xl">
        {/* Column drop arrows + ghost disc preview */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: COLS }, (_, c) => {
            // Find where the ghost piece would land in this column
            let ghostRow = -1;
            if (hoverCol === c && !inputDisabled && !board[0][c]) {
              for (let r = ROWS - 1; r >= 0; r--) {
                if (!board[r][c]) { ghostRow = r; break; }
              }
            }
            return (
              <button
                key={`arrow-${c}`}
                onClick={() => handleDrop(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                disabled={inputDisabled || !!board[0][c]}
                className="h-6 flex items-center justify-center text-sm transition-all disabled:opacity-0"
                style={{
                  color: hoverCol === c && !inputDisabled ? '#ef4444' : '#ffffff40',
                  transform: hoverCol === c && !inputDisabled ? 'translateY(-2px)' : 'none',
                }}
              >
                ▼
              </button>
            );
          })}
        </div>

        {/* Board */}
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const win = isWinCell(r, c);
              // Ghost piece: where red would land in hovered column
              let ghostRow = -1;
              if (hoverCol === c && !inputDisabled && !board[0][c]) {
                for (let gr = ROWS - 1; gr >= 0; gr--) {
                  if (!board[gr][c]) { ghostRow = gr; break; }
                }
              }
              const isGhost = !cell && r === ghostRow && hoverCol === c;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleDrop(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  disabled={inputDisabled}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: cell === 'red'
                      ? win ? '#ef4444' : '#dc2626'
                      : cell === 'yellow'
                      ? win ? '#fbbf24' : '#d97706'
                      : isGhost ? 'rgba(239,68,68,0.3)'
                      : hoverCol === c && !inputDisabled && !board[0][c] ? '#1e3a5a' : '#0f1d3a',
                    boxShadow: win
                      ? cell === 'red' ? '0 0 12px #ef4444, 0 0 24px #ef444460' : '0 0 12px #fbbf24, 0 0 24px #fbbf2460'
                      : isGhost ? 'inset 0 0 0 2px rgba(239,68,68,0.6)'
                      : cell
                      ? 'inset 0 -2px 4px rgba(0,0,0,0.3)'
                      : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                    transform: win ? 'scale(1.08)' : 'scale(1)',
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {winner && !isOnline && (
        <button
          onClick={() => {
            setBoard(initBoard());
            setTurn('red');
            setWinner(null);
            setWinLine(null);
            endedRef.current = false;
          }}
          className="mt-3 bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95 text-sm"
        >
          {winner === 'draw' ? 'Draw — Play Again' : winner === 'red' ? '🎉 You Win! Play Again' : '😅 AI Wins — Try Again'}
        </button>
      )}
    </div>
  );
}

export default ConnectFourGame;
