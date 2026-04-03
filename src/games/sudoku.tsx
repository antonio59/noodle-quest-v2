import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type GridSize = 4 | 6 | 9;

interface Cell {
  value: number;
  given: boolean;
  correct: boolean | null;
}

const CONFIG: Record<number, { size: GridSize; givens: number; time: number }> = {
  1: { size: 4, givens: 8, time: 0 },
  2: { size: 4, givens: 7, time: 0 },
  3: { size: 4, givens: 6, time: 0 },
  4: { size: 4, givens: 5, time: 120 },
  5: { size: 4, givens: 4, time: 100 },
  6: { size: 6, givens: 12, time: 180 },
  7: { size: 6, givens: 10, time: 160 },
  8: { size: 6, givens: 8, time: 140 },
  9: { size: 9, givens: 30, time: 300 },
  10: { size: 9, givens: 25, time: 240 },
};

const TIPS = [
  '💡 Tip: Start with rows or columns that have the most numbers already filled!',
  '💡 Tip: Look for "naked singles" — cells where only one number can fit.',
  '💡 Tip: In 4x4, each 2x2 box must have 1-4. Use elimination!',
  '💡 Tip: Don\'t guess! If you\'re stuck, look for constraints you missed.',
  '💡 Tip: Work systematically — check each number 1-N and see where it can go.',
];

type Phase = 'intro' | 'playing' | 'checking' | 'done';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(grid: number[][], row: number, col: number, num: number, size: number): boolean {
  const boxSize = size === 4 ? 2 : size === 6 ? 3 : 3;
  for (let i = 0; i < size; i++) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / boxSize) * boxSize;
  const boxCol = Math.floor(col / boxSize) * boxSize;
  for (let r = boxRow; r < boxRow + boxSize; r++) {
    for (let c = boxCol; c < boxCol + boxSize; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function generateSolvedGrid(size: number): number[][] {
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const boxSize = size === 4 ? 2 : size === 6 ? 3 : 3;

  function fill(pos: number): boolean {
    if (pos === size * size) return true;
    const row = Math.floor(pos / size);
    const col = pos % size;
    const nums = shuffle(Array.from({ length: size }, (_, i) => i + 1));
    for (const num of nums) {
      if (isValidPlacement(grid, row, col, num, size)) {
        grid[row][col] = num;
        if (fill(pos + 1)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  }

  fill(0);
  return grid;
}

function generatePuzzle(size: number, givens: number): { solution: number[][]; puzzle: Cell[][] } {
  const solution = generateSolvedGrid(size);
  const puzzle: Cell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      value: solution[r][c],
      given: true,
      correct: null,
    }))
  );

  const positions = shuffle(
    Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size] as [number, number])
  );

  let removed = 0;
  const toRemove = size * size - givens;
  for (const [r, c] of positions) {
    if (removed >= toRemove) break;
    puzzle[r][c].value = 0;
    puzzle[r][c].given = false;
    puzzle[r][c].correct = null;
    removed++;
  }

  return { solution, puzzle };
}

function SudokuGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const tip = useRef(TIPS[Math.min(stage - 1, TIPS.length - 1)]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [solution, setSolution] = useState<number[][]>([]);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [filledCount, setFilledCount] = useState(0);
  const [totalBlanks, setTotalBlanks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState(0);

  const gridRef = useRef({ solution: [] as number[][], grid: [] as Cell[][] });
  const scoreRef = useRef(0);
  const errorsRef = useRef(0);
  const filledRef = useRef(0);
  const totalBlanksRef = useRef(0);

  const startGame = useCallback(() => {
    const { solution: sol, puzzle } = generatePuzzle(config.size, config.givens);
    const blanks = puzzle.flat().filter(c => !c.given).length;
    setSolution(sol);
    setGrid(puzzle);
    gridRef.current = { solution: sol, grid: puzzle };
    setScore(0);
    scoreRef.current = 0;
    setFilledCount(0);
    filledRef.current = 0;
    setTotalBlanks(blanks);
    totalBlanksRef.current = blanks;
    setErrors(0);
    errorsRef.current = 0;
    setTimeLeft(config.time);
    setFeedback('');
    setSelectedCell(null);
    setPhase('playing');
  }, [config]);

  const selectCell = useCallback((r: number, c: number) => {
    if (!grid[r][c].given) {
      setSelectedCell([r, c]);
    }
  }, [grid]);

  const placeNumber = useCallback((num: number) => {
    if (phase !== 'playing' || !selectedCell) return;
    const [r, c] = selectedCell;
    if (grid[r][c].given) return;

    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[r][c].value = num;

    const isCorrect = num === gridRef.current.solution[r][c];
    newGrid[r][c].correct = isCorrect;

    if (isCorrect) {
      const pts = 15 + Math.floor(config.size * 2);
      scoreRef.current += pts;
      filledRef.current++;
      setScore(scoreRef.current);
      setFilledCount(filledRef.current);
      onScore(pts);
      onProgress(filledRef.current / totalBlanksRef.current);
      setFeedback(`✅ Correct! +${pts}`);

      if (filledRef.current >= totalBlanksRef.current) {
        const timeBonus = config.time > 0 ? Math.floor(timeLeft / 5) : 50;
        scoreRef.current += timeBonus;
        setPhase('done');
        const stars = errorsRef.current === 0 ? 3 : errorsRef.current <= 2 ? 2 : 1;
        onEnd({
          score: scoreRef.current,
          stars,
          summary: errorsRef.current === 0
            ? `Perfect Sudoku! Zero errors! Your logic is flawless! 🏆`
            : `Puzzle complete with ${errorsRef.current} error(s). Great logical thinking!`,
        });
      }
    } else {
      errorsRef.current++;
      setErrors(errorsRef.current);
      setFeedback(`❌ Wrong! The correct number was ${gridRef.current.solution[r][c]}`);
      newGrid[r][c].value = 0;
      newGrid[r][c].correct = false;
    }

    setGrid(newGrid);
    gridRef.current.grid = newGrid;
    setTimeout(() => setFeedback(''), 1500);
  }, [phase, selectedCell, grid, config, timeLeft, onScore, onProgress, onEnd]);

  const clearCell = useCallback(() => {
    if (phase !== 'playing' || !selectedCell) return;
    const [r, c] = selectedCell;
    if (grid[r][c].given) return;

    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[r][c].value = 0;
    newGrid[r][c].correct = null;
    setGrid(newGrid);
    gridRef.current.grid = newGrid;
  }, [phase, selectedCell, grid]);

  useEffect(() => {
    if (phase !== 'playing' || config.time <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('done');
          const stars = filledRef.current > totalBlanksRef.current * 0.7 ? 2 : 1;
          onEnd({
            score: scoreRef.current,
            stars,
            summary: `Time's up! You filled ${filledRef.current}/${totalBlanksRef.current} cells.`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, config.time, onEnd]);

  const size = config.size;
  const boxSize = size === 4 ? 2 : size === 6 ? 3 : 3;
  const cellSize = size === 9 ? 36 : size === 6 ? 44 : 52;
  const maxNum = size;

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🔢</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Sudoku</h2>
        <p className="text-text-dim mb-6 max-w-xs">Fill the grid so every row, column, and box has all numbers!</p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="text-xl mb-2">🎯 {size}×{size} grid</div>
          <div className="text-info">Numbers 1–{maxNum}</div>
          {config.time > 0 && (
            <div className="text-warning mt-1">⏱️ {config.time} seconds</div>
          )}
          <div className="text-text-dim text-sm mt-2">{totalBlanks || (size * size - config.givens)} cells to fill</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 🧩
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-3 bg-card rounded-xl px-4 py-2">
        <span className="text-accent font-bold">Score: {score}</span>
        <span className="text-success">Filled: {filledCount}/{totalBlanks}</span>
        {errors > 0 && <span className="text-danger">Errors: {errors}</span>}
        {config.time > 0 && (
          <span className={`font-bold ${timeLeft <= 15 ? 'text-danger' : 'text-warning'}`}>
            ⏱️ {timeLeft}
          </span>
        )}
      </div>

      <div
        className="bg-card rounded-xl p-2 inline-block"
        style={{ border: '2px solid var(--color-accent)' }}
      >
        {grid.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => {
              const isBoxBorder = c > 0 && c % boxSize === 0;
              const isRowBorder = r > 0 && r % boxSize === 0;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const cellColor = cell.given
                ? 'text-text'
                : cell.correct === true
                  ? 'text-success'
                  : cell.correct === false
                    ? 'text-danger'
                    : 'text-accent';

              return (
                <button
                  key={c}
                  onClick={() => selectCell(r, c)}
                  className={`flex items-center justify-center font-bold transition-colors
                    ${cell.given ? 'cursor-default' : 'cursor-pointer hover:bg-accent-soft'}
                    ${isSelected ? 'ring-2 ring-accent' : ''}
                  `}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    fontSize: cellSize * 0.45,
                    marginLeft: isBoxBorder ? 2 : 0,
                    marginTop: isRowBorder ? 2 : 0,
                    color: cellColor,
                    background: isSelected ? 'var(--color-accent-soft)' : 'transparent',
                    borderRight: (c + 1) % boxSize === 0 && c < size - 1 ? '1px solid var(--color-accent)' : undefined,
                    borderBottom: (r + 1) % boxSize === 0 && r < size - 1 ? '1px solid var(--color-accent)' : undefined,
                  }}
                >
                  {cell.value || ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selectedCell && !grid[selectedCell[0]][selectedCell[1]].given && phase === 'playing' && (
        <div className="flex gap-2 mt-3 flex-wrap justify-center max-w-[280px]">
          {Array.from({ length: maxNum }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onPointerDown={() => placeNumber(n)}
              className="w-10 h-10 rounded-lg bg-surface text-text font-bold text-lg hover:bg-accent hover:text-bg active:scale-95 transition-all"
            >
              {n}
            </button>
          ))}
          <button
            onClick={clearCell}
            className="w-10 h-10 rounded-lg bg-surface text-danger font-bold text-sm hover:bg-danger hover:text-bg active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>
      )}

      {feedback && (
        <div className="text-sm mt-2 text-center min-h-[22px]">
          {feedback}
        </div>
      )}
    </div>
  );
}

registerGame('sudoku', {
  name: 'Sudoku',
  emoji: '🧩',
  description: 'Fill the grid with numbers — every row, column, and box must be complete!',
  category: 'focus',
  stages: 10,
  component: SudokuGame,
});

export default SudokuGame;
