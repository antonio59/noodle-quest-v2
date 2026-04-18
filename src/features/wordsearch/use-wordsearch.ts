import { useEffect, useMemo, useRef, useState } from 'react';
import type { WordSearchPuzzle, WSPlacement } from '@/lib/puzzle-engine/wordsearch/types';
import { loadSession, saveSession } from '@/lib/puzzle-engine/persistence/local';

interface WSCellState {
  selected: boolean;
  found: boolean;
  highlightClass: string;
}

export function useWordSearch(puzzle: WordSearchPuzzle, puzzleId: string) {
  const [selection, setSelection] = useState<[number, number][]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(() => Date.now());
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const highlightClasses = [
    'bg-emerald-300/70',
    'bg-sky-300/70',
    'bg-amber-300/70',
    'bg-rose-300/70',
    'bg-violet-300/70',
    'bg-teal-300/70',
    'bg-fuchsia-300/70',
    'bg-lime-300/70',
  ];

  const [wordHighlights, setWordHighlights] = useState<Record<string, string>>({});

  // Hydrate
  useEffect(() => {
    const session = loadSession('wordsearch', puzzleId);
    if (session?.foundWords) {
      const next = new Set(session.foundWords);
      setFound(next);
      const map: Record<string, string> = {};
      let i = 0;
      for (const w of session.foundWords) {
        map[w] = highlightClasses[i % highlightClasses.length];
        i++;
      }
      setWordHighlights(map);
    }
  }, [puzzleId]);

  // Autosave
  useEffect(() => {
    saveSession('wordsearch', {
      puzzleId,
      answers: {},
      foundWords: Array.from(found),
      elapsedMs: Date.now() - startTime,
    });
  }, [found, puzzleId, startTime]);

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
    if (line) {
      setSelection(line);
    }
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
      const next = new Set(found);
      next.add(match.word);
      setFound(next);
      const colour = highlightClasses[found.size % highlightClasses.length];
      setWordHighlights(prev => ({ ...prev, [match.word]: colour }));
    }
    setSelection([]);
  };

  const cellStateFor = (r: number, c: number): WSCellState => {
    const inSelection = selection.some(([rr, cc]) => rr === r && cc === c);
    for (const p of puzzle.placements) {
      if (!found.has(p.word)) continue;
      if (p.cells.some(([rr, cc]) => rr === r && cc === c)) {
        return { selected: inSelection, found: true, highlightClass: wordHighlights[p.word] || '' };
      }
    }
    return { selected: inSelection, found: false, highlightClass: '' };
  };

  return {
    selection,
    found,
    completed,
    gridRef,
    isDraggingRef,
    startSelection,
    extendSelection,
    endSelection,
    cellStateFor,
    remaining: puzzle.placements.map(p => p.word).filter(w => !found.has(w)),
  };
}

function computeLine(r1: number, c1: number, r2: number, c2: number): [number, number][] | null {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  if (dr === 0 && dc === 0) return [[r1, c1]];
  // Allow only straight lines
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
