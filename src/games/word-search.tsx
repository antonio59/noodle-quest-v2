import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const WORD_LISTS: Record<string, string[]> = {
  easy: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'HAT', 'BAT', 'CUP', 'MAP', 'PEN', 'BOX', 'KEY', 'RED', 'BIG', 'TOP'],
  medium: ['APPLE', 'BREAD', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HEART', 'LIGHT', 'MUSIC', 'NIGHT', 'OCEAN', 'PIANO', 'RIVER', 'STONE'],
  hard: ['PLANET', 'GARDEN', 'BRIDGE', 'CASTLE', 'FOREST', 'ISLAND', 'JUNGLE', 'KITTEN', 'MARKET', 'ORANGE', 'PENCIL', 'ROCKET', 'SILVER', 'TIGER', 'VIOLET'],
  expert: ['BALLOON', 'CHICKEN', 'DIAMOND', 'ELEPHANT', 'FESTIVAL', 'GUITARS', 'HURRICANE', 'JOURNEY', 'KITCHEN', 'LIBRARY', 'MOUNTAIN', 'NOTEBOOK', 'PUMPKIN', 'RAINBOW', 'EXPLORE'],
};

const ALL_WORDS = [...new Set([...WORD_LISTS.easy, ...WORD_LISTS.medium, ...WORD_LISTS.hard, ...WORD_LISTS.expert])];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const CONFIG: Record<number, { gridSize: number; wordCount: number; wordLen: number; time: number; wordPool: string[] }> = {
  1: { gridSize: 6, wordCount: 3, wordLen: 3, time: 90, wordPool: WORD_LISTS.easy },
  2: { gridSize: 7, wordCount: 3, wordLen: 3, time: 90, wordPool: WORD_LISTS.easy },
  3: { gridSize: 8, wordCount: 4, wordLen: 3, time: 100, wordPool: WORD_LISTS.easy },
  4: { gridSize: 8, wordCount: 4, wordLen: 4, time: 110, wordPool: WORD_LISTS.medium },
  5: { gridSize: 9, wordCount: 5, wordLen: 4, time: 120, wordPool: WORD_LISTS.medium },
  6: { gridSize: 9, wordCount: 5, wordLen: 5, time: 130, wordPool: WORD_LISTS.medium },
  7: { gridSize: 10, wordCount: 6, wordLen: 5, time: 140, wordPool: WORD_LISTS.hard },
  8: { gridSize: 10, wordCount: 6, wordLen: 6, time: 150, wordPool: WORD_LISTS.hard },
  9: { gridSize: 11, wordCount: 7, wordLen: 6, time: 160, wordPool: WORD_LISTS.expert },
  10: { gridSize: 12, wordCount: 8, wordLen: 7, time: 180, wordPool: WORD_LISTS.expert },
  11: { gridSize: 12, wordCount: 8, wordLen: 7, time: 175, wordPool: WORD_LISTS.expert },
  12: { gridSize: 13, wordCount: 9, wordLen: 7, time: 170, wordPool: WORD_LISTS.expert },
  13: { gridSize: 13, wordCount: 9, wordLen: 8, time: 165, wordPool: ALL_WORDS },
  14: { gridSize: 14, wordCount: 10, wordLen: 8, time: 160, wordPool: ALL_WORDS },
  15: { gridSize: 14, wordCount: 10, wordLen: 8, time: 155, wordPool: ALL_WORDS },
  16: { gridSize: 15, wordCount: 11, wordLen: 9, time: 150, wordPool: ALL_WORDS },
  17: { gridSize: 15, wordCount: 11, wordLen: 9, time: 145, wordPool: ALL_WORDS },
  18: { gridSize: 16, wordCount: 12, wordLen: 9, time: 140, wordPool: ALL_WORDS },
  19: { gridSize: 16, wordCount: 12, wordLen: 10, time: 135, wordPool: ALL_WORDS },
  20: { gridSize: 17, wordCount: 14, wordLen: 10, time: 130, wordPool: ALL_WORDS },
};

const TIPS = [
  '💡 Tip: Scan for short words first — they\'re easier to spot!',
  '💡 Tip: Look for unusual letter combos like QU, TH, or ING.',
  '💡 Tip: Check diagonals too — words hide in all 8 directions!',
  '💡 Tip: Find one letter of a word, then look around it for the rest.',
  '💡 Tip: Work through the word list one at a time instead of scanning randomly.',
];

type Phase = 'intro' | 'playing' | 'done';

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function generateGrid(size: number, words: string[]): { grid: string[][]; placedWords: string[] } {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placed: string[] = [];

  for (const word of words) {
    if (word.length > size) continue;
    let attempts = 0;
    let ok = false;
    while (attempts < 200 && !ok) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const startRow = Math.floor(Math.random() * size);
      const startCol = Math.floor(Math.random() * size);
      const endRow = startRow + dir[0] * (word.length - 1);
      const endCol = startCol + dir[1] * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
        attempts++;
        continue;
      }
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir[0] * i;
        const c = startCol + dir[1] * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          grid[startRow + dir[0] * i][startCol + dir[1] * i] = word[i];
        }
        placed.push(word);
        ok = true;
      }
      attempts++;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = LETTERS[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, placedWords: placed };
}

function getCellsInLine(sel: Selection): [number, number][] {
  const { startRow, startCol, endRow, endCol } = sel;
  const dr = endRow - startRow;
  const dc = endCol - startCol;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return [[startRow, startCol]];
  const stepR = dr / steps;
  const stepC = dc / steps;
  if (stepR !== 0 && stepC !== 0 && Math.abs(stepR) !== Math.abs(stepC)) return [];
  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push([Math.round(startRow + stepR * i), Math.round(startCol + stepC * i)]);
  }
  return cells;
}

function WordSearchGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const tip = useRef(TIPS[Math.min(stage - 1, TIPS.length - 1)]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [grid, setGrid] = useState<string[][]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [foundCellSets, setFoundCellSets] = useState<Set<string>>(new Set());

  const gridRef = useRef<string[][]>([]);
  const wordsRef = useRef<string[]>([]);
  const foundRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback(() => {
    const shuffled = shuffle(config.wordPool.filter(w => w.length <= config.gridSize));
    const selected = shuffled.slice(0, config.wordCount);
    const { grid: g, placedWords } = generateGrid(config.gridSize, selected);
    setGrid(g);
    gridRef.current = g;
    setWords(placedWords);
    wordsRef.current = placedWords;
    setFoundWords(new Set());
    foundRef.current = new Set();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(config.time);
    setFeedback('');
    setSelection(null);
    setHighlightedCells(new Set());
    setFoundCellSets(new Set());
    setPhase('playing');
  }, [config]);

  const getCellFromPointer = useCallback((clientX: number, clientY: number): [number, number] | null => {
    if (!gameAreaRef.current) return null;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cellSize = rect.width / config.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < config.gridSize && col >= 0 && col < config.gridSize) {
      return [row, col];
    }
    return null;
  }, [config.gridSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (cell) {
      setIsSelecting(true);
      setSelection({ startRow: cell[0], startCol: cell[1], endRow: cell[0], endCol: cell[1] });
    }
  }, [phase, getCellFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isSelecting || !selection) return;
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (cell) {
      setSelection({ ...selection, endRow: cell[0], endCol: cell[1] });
      const cells = getCellsInLine({ ...selection, endRow: cell[0], endCol: cell[1] });
      const highlighted = new Set(cells.map(([r, c]) => `${r}-${c}`));
      setHighlightedCells(highlighted);
    }
  }, [isSelecting, selection, getCellFromPointer]);

  const handlePointerUp = useCallback(() => {
    if (!isSelecting || !selection) {
      setIsSelecting(false);
      return;
    }
    setIsSelecting(false);
    const cells = getCellsInLine(selection);
    if (cells.length < 2) {
      setSelection(null);
      setHighlightedCells(new Set());
      return;
    }
    const word = cells.map(([r, c]) => grid[r]?.[c] || '').join('');
    const reversed = word.split('').reverse().join('');
    const checkWord = wordsRef.current.find(w => w === word || w === reversed);

    if (checkWord && !foundRef.current.has(checkWord)) {
      foundRef.current.add(checkWord);
      const pts = checkWord.length * 10;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScore(pts);
      const newFound = new Set(foundRef.current);
      setFoundWords(newFound);
      onProgress(newFound.size / wordsRef.current.length);
      setFeedback(`✅ Found "${checkWord}"! +${pts}`);

      const cellKeys = cells.map(([r, c]) => `${r}-${c}`);
      setFoundCellSets(prev => new Set([...prev, ...cellKeys]));

      if (newFound.size >= wordsRef.current.length) {
        const timeBonus = Math.floor(timeLeft / 3);
        scoreRef.current += timeBonus;
        setPhase('done');
        onEnd({
          score: scoreRef.current,
          stars: 3,
          summary: `All words found! Incredible word hunting! 🏆`,
        });
      }
      setTimeout(() => setFeedback(''), 1500);
    }

    setSelection(null);
    setHighlightedCells(new Set());
  }, [isSelecting, selection, grid, timeLeft, onScore, onProgress, onEnd]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('done');
          const found = foundRef.current.size;
          const total = wordsRef.current.length;
          const stars = found >= total ? 3 : found >= Math.ceil(total * 0.75) ? 2 : 1;
          onEnd({
            score: scoreRef.current,
            stars,
            summary: `Time's up! Found ${found}/${total} words.`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, onEnd]);

  const cellSize = Math.min(36, Math.floor(320 / config.gridSize));

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Word Search</h2>
        <p className="text-text-dim mb-6 max-w-xs">Find hidden words in the letter grid!</p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="text-xl mb-2">🎯 {config.wordCount} words to find</div>
          <div className="text-info">{config.gridSize}×{config.gridSize} grid</div>
          <div className="text-warning mt-1">⏱️ {config.time} seconds</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 🔍
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-accent font-bold">Score: {score}</span>
        <span className="text-success">Found: {foundWords.size}/{words.length}</span>
        <span className={`font-bold ${timeLeft <= 15 ? 'text-danger' : 'text-warning'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      <div className="flex gap-3 w-full max-w-lg">
        <div
          ref={gameAreaRef}
          className="bg-card rounded-xl p-2 select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => { setIsSelecting(false); setSelection(null); setHighlightedCells(new Set()); }}
          style={{ touchAction: 'none' }}
        >
          {grid.map((row, r) => (
            <div key={r} className="flex">
              {row.map((letter, c) => {
                const key = `${r}-${c}`;
                const isHighlighted = highlightedCells.has(key);
                const isFound = foundCellSets.has(key);
                return (
                  <div
                    key={c}
                    className="flex items-center justify-center font-bold rounded-sm transition-colors"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      fontSize: cellSize * 0.5,
                      background: isFound ? 'var(--color-success)' : isHighlighted ? 'var(--color-accent)' : 'transparent',
                      color: isFound ? 'var(--color-bg)' : isHighlighted ? 'var(--color-bg)' : 'var(--color-text)',
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-3 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
          {words.map(word => {
            const isFound = foundWords.has(word);
            return (
              <div
                key={word}
                className={`text-sm font-mono px-2 py-1 rounded transition-all ${
                  isFound ? 'text-success line-through opacity-60' : 'text-text'
                }`}
              >
                {isFound ? '✓ ' : '○ '}{word}
              </div>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="text-sm mt-2 text-center min-h-[22px]">{feedback}</div>
      )}
    </div>
  );
}

registerGame('word-search', {
  name: 'Word Search',
  emoji: '🔍',
  description: 'Find hidden words in a grid of letters — drag to select!',
  category: 'focus',
  stages: 20,
  component: WordSearchGame,
});

export default WordSearchGame;
