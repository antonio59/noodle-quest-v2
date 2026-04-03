import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const COLS = 10;
const ROWS = 20;
const COLORS = ['#ff6e6c', '#c084fc', '#67e8f9', '#4ade80', '#fbbf24', '#818cf8', '#f472b6'];

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];

const CONFIG: Record<number, { dropInterval: number; linesTarget: number; time: number }> = {
  1: { dropInterval: 1000, linesTarget: 5, time: 0 },
  2: { dropInterval: 900, linesTarget: 7, time: 0 },
  3: { dropInterval: 800, linesTarget: 8, time: 0 },
  4: { dropInterval: 700, linesTarget: 10, time: 0 },
  5: { dropInterval: 600, linesTarget: 12, time: 180 },
  6: { dropInterval: 500, linesTarget: 14, time: 160 },
  7: { dropInterval: 420, linesTarget: 16, time: 140 },
  8: { dropInterval: 350, linesTarget: 18, time: 120 },
  9: { dropInterval: 280, linesTarget: 20, time: 100 },
  10: { dropInterval: 200, linesTarget: 25, time: 90 },
};

const TIPS = [
  '💡 Tip: Keep the stack flat! Avoid creating tall towers.',
  '💡 Tip: Save the long piece (I-piece) for clearing 4 lines at once!',
  '💡 Tip: Build a "well" on one side to fit the long piece.',
  '💡 Tip: Rotate pieces BEFORE they drop too far — plan ahead!',
  '💡 Tip: Clear lines quickly to keep the stack low!',
];

type Phase = 'intro' | 'playing' | 'done';

function createEmptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return {
    shape: SHAPES[idx],
    color: COLORS[idx],
    x: Math.floor((COLS - SHAPES[idx][0].length) / 2),
    y: 0,
  };
}

function rotatePiece(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function isValid(board: number[][], piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const bx = piece.x + c;
      const by = piece.y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && board[by][bx]) return false;
    }
  }
  return true;
}

function clearLines(board: number[][]): { newBoard: number[][]; cleared: number } {
  const newBoard = board.filter(row => row.some(cell => !cell));
  const cleared = ROWS - newBoard.length;
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(0));
  }
  return { newBoard, cleared };
}

function TetrisDropGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const tip = useRef(TIPS[Math.min(stage - 1, TIPS.length - 1)]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [board, setBoard] = useState<number[][]>([]);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');
  const [gameOver, setGameOver] = useState(false);

  const boardRef = useRef<number[][]>([]);
  const pieceRef = useRef<Piece | null>(null);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const gameActiveRef = useRef(false);

  const startGame = useCallback(() => {
    const b = createEmptyBoard();
    const p = randomPiece();
    const np = randomPiece();
    boardRef.current = b;
    pieceRef.current = p;
    setBoard(b);
    setPiece(p);
    setNextPiece(np);
    setScore(0);
    scoreRef.current = 0;
    setLines(0);
    linesRef.current = 0;
    setTimeLeft(config.time);
    setFeedback('');
    setGameOver(false);
    gameActiveRef.current = true;
    setPhase('playing');
  }, [config]);

  const lockPiece = useCallback(() => {
    if (!pieceRef.current) return;
    const b = boardRef.current.map(row => [...row]);
    const p = pieceRef.current;

    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (!p.shape[r][c]) continue;
        const bx = p.x + c;
        const by = p.y + r;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          b[by][bx] = COLORS.indexOf(p.color) + 1;
        }
      }
    }

    // Check game over
    if (p.y <= 0) {
      gameActiveRef.current = false;
      setBoard(b);
      setGameOver(true);
      setPhase('done');
      const stars = linesRef.current >= config.linesTarget ? 3 : linesRef.current >= config.linesTarget * 0.6 ? 2 : 1;
      onEnd({
        score: scoreRef.current,
        stars,
        summary: `Stacked to the top! You cleared ${linesRef.current} lines.`,
      });
      return;
    }

    const { newBoard, cleared } = clearLines(b);
    boardRef.current = newBoard;
    setBoard(newBoard);

    if (cleared > 0) {
      const pts = cleared === 1 ? 10 : cleared === 2 ? 30 : cleared === 3 ? 50 : 100;
      scoreRef.current += pts;
      linesRef.current += cleared;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      onScore(pts);
      onProgress(Math.min(1, linesRef.current / config.linesTarget));
      setFeedback(cleared === 4 ? '🔥 TETRIS! +100' : `✨ ${cleared} line${cleared > 1 ? 's' : ''} cleared! +${pts}`);
      setTimeout(() => setFeedback(''), 1500);

      if (linesRef.current >= config.linesTarget) {
        gameActiveRef.current = false;
        const timeBonus = config.time > 0 ? Math.floor(timeLeft / 3) : 50;
        scoreRef.current += timeBonus;
        setPhase('done');
        onEnd({
          score: scoreRef.current,
          stars: 3,
          summary: `Amazing! All ${config.linesTarget} lines cleared! You're a Tetris master! 🏆`,
        });
        return;
      }
    }

    const next = nextPiece || randomPiece();
    const freshPiece: Piece = { ...next, x: Math.floor((COLS - next.shape[0].length) / 2), y: 0 };
    pieceRef.current = freshPiece;
    setPiece(freshPiece);
    setNextPiece(randomPiece());
  }, [nextPiece, config, timeLeft, onScore, onProgress, onEnd]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!pieceRef.current || !gameActiveRef.current) return;
    const moved = { ...pieceRef.current, x: pieceRef.current.x + dx, y: pieceRef.current.y + dy };
    if (isValid(boardRef.current, moved)) {
      pieceRef.current = moved;
      setPiece(moved);
      return true;
    }
    return false;
  }, []);

  const rotatePieceAction = useCallback(() => {
    if (!pieceRef.current || !gameActiveRef.current) return;
    const rotated = { ...pieceRef.current, shape: rotatePiece(pieceRef.current.shape) };
    // Wall kick attempts
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      const kicked = { ...rotated, x: rotated.x + kick };
      if (isValid(boardRef.current, kicked)) {
        pieceRef.current = kicked;
        setPiece(kicked);
        return;
      }
    }
  }, []);

  const hardDrop = useCallback(() => {
    if (!pieceRef.current || !gameActiveRef.current) return;
    let dropped = { ...pieceRef.current };
    while (isValid(boardRef.current, { ...dropped, y: dropped.y + 1 })) {
      dropped.y++;
    }
    pieceRef.current = dropped;
    setPiece(dropped);
    lockPiece();
  }, [lockPiece]);

  // Key controls
  useEffect(() => {
    if (phase !== 'playing') return;
    const handleKey = (e: KeyboardEvent) => {
      if (!gameActiveRef.current) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece(0, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePieceAction();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, movePiece, rotatePieceAction, hardDrop]);

  // Game loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      if (!gameActiveRef.current || !pieceRef.current) return;
      if (!movePiece(0, 1)) {
        lockPiece();
      }
    }, config.dropInterval);
    return () => clearInterval(id);
  }, [phase, config.dropInterval, movePiece, lockPiece]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || config.time <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          gameActiveRef.current = false;
          setPhase('done');
          const stars = linesRef.current >= config.linesTarget ? 3 : linesRef.current >= config.linesTarget * 0.5 ? 2 : 1;
          onEnd({
            score: scoreRef.current,
            stars,
            summary: `Time's up! You cleared ${linesRef.current} lines.`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, config.time, config.linesTarget, onEnd]);

  const cellSize = 18;

  // Render board with current piece
  const displayBoard = board.map(row => [...row]);
  if (piece && phase === 'playing') {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const bx = piece.x + c;
        const by = piece.y + r;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          displayBoard[by][bx] = COLORS.indexOf(piece.color) + 1;
        }
      }
    }
  }

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🧱</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Tetris Drop</h2>
        <p className="text-text-dim mb-6 max-w-xs">Stack blocks and clear lines before they reach the top!</p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="text-xl mb-2">🎯 Clear {config.linesTarget} lines</div>
          {config.time > 0 && (
            <div className="text-warning">⏱️ {config.time} seconds</div>
          )}
          <div className="text-text-dim text-sm mt-2">← → Move | ↑ Rotate | ↓ Soft Drop | Space Hard Drop</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 🧱
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-accent font-bold">Score: {score}</span>
        <span className="text-success">Lines: {lines}/{config.linesTarget}</span>
        {config.time > 0 && (
          <span className={`font-bold ${timeLeft <= 15 ? 'text-danger' : 'text-warning'}`}>
            ⏱️ {timeLeft}
          </span>
        )}
      </div>

      <div className="flex gap-3 items-start">
        <div
          className="bg-card rounded-lg p-1"
          style={{ border: '2px solid var(--color-accent)' }}
        >
          {displayBoard.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => (
                <div
                  key={c}
                  className="rounded-sm"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: cell ? COLORS[cell - 1] : 'rgba(255,255,255,0.03)',
                    border: cell ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {nextPiece && (
          <div className="bg-card rounded-xl p-3">
            <div className="text-text-dim text-xs mb-2 text-center">Next</div>
            {nextPiece.shape.map((row, r) => (
              <div key={r} className="flex justify-center">
                {row.map((cell, c) => (
                  <div
                    key={c}
                    className="rounded-sm"
                    style={{
                      width: cellSize - 2,
                      height: cellSize - 2,
                      background: cell ? nextPiece.color : 'transparent',
                      border: cell ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => movePiece(-1, 0)}
          className="w-12 h-12 rounded-lg bg-surface text-text font-bold text-xl hover:bg-accent hover:text-bg active:scale-95 transition-all"
        >
          ←
        </button>
        <button
          onClick={() => movePiece(0, 1)}
          className="w-12 h-12 rounded-lg bg-surface text-text font-bold text-xl hover:bg-accent hover:text-bg active:scale-95 transition-all"
        >
          ↓
        </button>
        <button
          onClick={rotatePieceAction}
          className="w-12 h-12 rounded-lg bg-surface text-text font-bold text-xl hover:bg-accent hover:text-bg active:scale-95 transition-all"
        >
          ↻
        </button>
        <button
          onClick={() => movePiece(1, 0)}
          className="w-12 h-12 rounded-lg bg-surface text-text font-bold text-xl hover:bg-accent hover:text-bg active:scale-95 transition-all"
        >
          →
        </button>
        <button
          onClick={hardDrop}
          className="w-12 h-12 rounded-lg bg-accent text-bg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          DROP
        </button>
      </div>

      {feedback && (
        <div className="text-sm mt-2 text-center min-h-[22px]">{feedback}</div>
      )}
    </div>
  );
}

registerGame('tetris-drop', {
  name: 'Tetris Drop',
  emoji: '🧱',
  description: 'Stack blocks, clear lines, and don\'t let them reach the top!',
  category: 'motor',
  stages: 10,
  component: TetrisDropGame,
});

export default TetrisDropGame;
