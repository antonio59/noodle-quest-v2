import { useEffect, useMemo, useRef, useState } from 'react';
import type { CrosswordPuzzle, PlacedWord } from '@/lib/puzzle-engine/crossword/types';
import { loadSession, saveSession } from '@/lib/puzzle-engine/persistence/local';

interface CellState {
  value: string;
  isRevealed: boolean;
  isError: boolean;
}

export function useCrossword(puzzle: CrosswordPuzzle, puzzleId: string) {
  const [grid, setGrid] = useState<CellState[][]>(() => buildBlankState(puzzle.gridSize));
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(() => Date.now());
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const wordMap = useMemo(() => {
    const map = new Map<string, PlacedWord>();
    for (const w of puzzle.words) map.set(w.id, w);
    return map;
  }, [puzzle]);

  const cellToWords = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const w of puzzle.words) {
      for (let i = 0; i < w.word.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        const key = `${r},${c}`;
        const arr = map.get(key) ?? [];
        arr.push(w.id);
        map.set(key, arr);
      }
    }
    return map;
  }, [puzzle]);

  // Hydrate from localStorage
  useEffect(() => {
    const session = loadSession('crossword', puzzleId);
    if (session?.answers) {
      const next = buildBlankState(puzzle.gridSize);
      for (const [key, val] of Object.entries(session.answers)) {
        const [r, c] = key.split(',').map(Number);
        if (r >= 0 && r < puzzle.gridSize && c >= 0 && c < puzzle.gridSize) {
          next[r][c] = { ...next[r][c], value: val };
        }
      }
      setGrid(next);
    }
  }, [puzzle.gridSize, puzzleId]);

  // Autosave
  useEffect(() => {
    const answers: Record<string, string> = {};
    for (let r = 0; r < puzzle.gridSize; r++) {
      for (let c = 0; c < puzzle.gridSize; c++) {
        if (grid[r][c].value) answers[`${r},${c}`] = grid[r][c].value;
      }
    }
    saveSession('crossword', {
      puzzleId,
      answers,
      foundWords: [],
      elapsedMs: Date.now() - startTime,
    });
  }, [grid, puzzleId, startTime, puzzle.gridSize]);

  const setCellValue = (r: number, c: number, value: string) => {
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c] = { ...next[r][c], value: value.toUpperCase().slice(0, 1) };
      return next;
    });
  };

  const focusCell = (r: number, c: number) => {
    const key = `${r},${c}`;
    const el = inputRefs.current[key];
    if (el) {
      el.focus();
      el.select();
    }
    setActiveCell({ r, c });
  };

  const moveFocus = (fromR: number, fromC: number, direction: 'across' | 'down', delta: number) => {
    const wordIds = cellToWords.get(`${fromR},${fromC}`);
    const activeId = activeWordId ?? wordIds?.[0] ?? null;
    if (!activeId) return;
    const word = wordMap.get(activeId);
    if (!word) return;
    const isAligned = word.direction === direction;
    if (!isAligned) return;
    const index = word.direction === 'across'
      ? fromC - word.col
      : fromR - word.row;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= word.word.length) return;
    const nr = word.direction === 'across' ? word.row : word.row + nextIndex;
    const nc = word.direction === 'across' ? word.col + nextIndex : word.col;
    focusCell(nr, nc);
  };

  const handleKey = (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const wordIds = cellToWords.get(`${r},${c}`) ?? [];
    const activeId = activeWordId ?? wordIds[0] ?? null;
    const word = activeId ? wordMap.get(activeId) : undefined;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (grid[r][c].value) {
        setCellValue(r, c, '');
      } else if (word) {
        moveFocus(r, c, word.direction, -1);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(r, c, 'across', 1);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(r, c, 'across', -1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(r, c, 'down', 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(r, c, 'down', -1);
      return;
    }

    if (/^[A-Za-z]$/.test(e.key)) {
      e.preventDefault();
      setCellValue(r, c, e.key);
      if (word) {
        moveFocus(r, c, word.direction, 1);
      }
    }
  };

  const checkSolution = () => {
    let allCorrect = true;
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      for (const w of puzzle.words) {
        for (let i = 0; i < w.word.length; i++) {
          const r = w.direction === 'across' ? w.row : w.row + i;
          const c = w.direction === 'across' ? w.col + i : w.col;
          const expected = w.word[i];
          const correct = next[r][c].value.toUpperCase() === expected;
          next[r][c] = { ...next[r][c], isError: !correct };
          if (!correct) allCorrect = false;
        }
      }
      return next;
    });
    if (allCorrect) setCompleted(true);
  };

  const revealCell = (r: number, c: number) => {
    const ids = cellToWords.get(`${r},${c}`) ?? [];
    for (const id of ids) {
      const w = wordMap.get(id);
      if (!w) continue;
      const i = w.direction === 'across' ? c - w.col : r - w.row;
      setGrid(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })));
        next[r][c] = { ...next[r][c], value: w.word[i], isRevealed: true };
        return next;
      });
    }
  };

  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of puzzle.words) {
      const key = `${w.row},${w.col}`;
      if (!map.has(key)) map.set(key, w.number);
    }
    return map;
  }, [puzzle]);

  const isCellPartOfWord = (r: number, c: number) => !!cellToWords.get(`${r},${c}`);

  return {
    grid,
    activeWordId,
    setActiveWordId,
    activeCell,
    setActiveCell,
    completed,
    inputRefs,
    wordMap,
    cellToWords,
    numberMap,
    isCellPartOfWord,
    focusCell,
    handleKey,
    setCellValue,
    checkSolution,
    revealCell,
  };
}

function buildBlankState(size: number): CellState[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ value: '', isRevealed: false, isError: false }))
  );
}
