import { useEffect, useMemo, useRef, useState } from 'react';
import type { WordSearchPuzzle } from '@/lib/puzzle-engine/wordsearch/types';
import { loadSession, saveSession } from '@/lib/puzzle-engine/persistence/local';

interface WSCellState {
  selected: boolean;
  found: boolean;
}

export interface FoundOverlay {
  word: string;
  cells: [number, number][];
  color: string;
}

// Vivid palette matching the Word Search Master reference visuals.
const PILL_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#e11d48', // rose
  '#14b8a6', // teal
  '#a855f7', // purple
];

export function useWordSearch(puzzle: WordSearchPuzzle, puzzleId: string) {
  const [selection, setSelection] = useState<[number, number][]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundOrder, setFoundOrder] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(() => Date.now());
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  // Hydrate from session
  useEffect(() => {
    const session = loadSession('wordsearch', puzzleId);
    if (session?.foundWords?.length) {
      setFound(new Set(session.foundWords));
      setFoundOrder(session.foundWords);
    }
  }, [puzzleId]);

  // Autosave
  useEffect(() => {
    saveSession('wordsearch', {
      puzzleId,
      answers: {},
      foundWords: foundOrder,
      elapsedMs: Date.now() - startTime,
    });
  }, [foundOrder, puzzleId, startTime]);

  const allWords = useMemo(() => new Set(puzzle.placements.map(p => p.word)), [puzzle]);

  useEffect(() => {
    if (found.size === allWords.size && allWords.size > 0) {
      setCompleted(true);
    }
  }, [found, allWords]);

  const startSelection = (r: number, c: number) => {
    isDraggingRef.current = true;
    setSelection([[r, c]]);
  };

  const extendSelection = (r: number, c: number) => {
    if (!isDraggingRef.current) return;
    if (selection.length === 0) return;
    const [sr, sc] = selection[0];
    const line = computeLine(sr, sc, r, c);
    if (line) setSelection(line);
  };

  const endSelection = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const word = selection.map(([r, c]) => puzzle.grid[r][c]).join('');
    const reverse = [...selection].reverse().map(([r, c]) => puzzle.grid[r][c]).join('');
    const match = puzzle.placements.find(
      p =>
        !found.has(p.word) &&
        ((p.word === word && matchesCells(p.cells, selection)) ||
         (p.word === reverse && matchesCells(p.cells, [...selection].reverse())))
    );
    if (match) {
      setFound(prev => {
        const next = new Set(prev);
        next.add(match.word);
        return next;
      });
      setFoundOrder(prev => (prev.includes(match.word) ? prev : [...prev, match.word]));
    }
    setSelection([]);
  };

  const colorFor = (word: string): string => {
    const idx = foundOrder.indexOf(word);
    return PILL_COLORS[(idx >= 0 ? idx : foundOrder.length) % PILL_COLORS.length];
  };

  const foundOverlays: FoundOverlay[] = puzzle.placements
    .filter(p => found.has(p.word))
    .map(p => {
      const idx = foundOrder.indexOf(p.word);
      const color = PILL_COLORS[(idx >= 0 ? idx : foundOrder.length) % PILL_COLORS.length];
      return { word: p.word, cells: p.cells, color };
    });

  const cellStateFor = (r: number, c: number): WSCellState => {
    const inSelection = selection.some(([rr, cc]) => rr === r && cc === c);
    for (const p of puzzle.placements) {
      if (!found.has(p.word)) continue;
      if (p.cells.some(([rr, cc]) => rr === r && cc === c)) {
        return { selected: inSelection, found: true };
      }
    }
    return { selected: inSelection, found: false };
  };

  return {
    selection,
    found,
    foundOrder,
    foundOverlays,
    completed,
    gridRef,
    isDraggingRef,
    startSelection,
    extendSelection,
    endSelection,
    cellStateFor,
    remaining: puzzle.placements.map(p => p.word).filter(w => !found.has(w)),
    colorFor,
  };
}

function computeLine(r1: number, c1: number, r2: number, c2: number): [number, number][] | null {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  if (dr === 0 && dc === 0) return [[r1, c1]];
  if (dr !== 0 && dc !== 0 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null;
  const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  const line: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    line.push([r1 + dr * i, c1 + dc * i]);
  }
  return line;
}

function matchesCells(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false;
  return a.every(([r, c], i) => b[i][0] === r && b[i][1] === c);
}
