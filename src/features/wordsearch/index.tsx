import { useEffect, useMemo, useRef, useState } from 'react';
import { generateWordSearch } from '@/lib/puzzle-engine/wordsearch/generator';
import { EN_GB_CORE_WORDS } from '@/data/words/en-gb-core';
import { WordSearchGrid } from './WordSearchGrid';
import { useWordSearch } from './use-wordsearch';
import type { GameProps } from '@/types';

function makePuzzleId() {
  return `wordsearch_${Date.now()}`;
}

// Map stage (1-10) to grid size and word count for harder puzzles
const STAGE_CFG: Record<number, { gridSize: number; maxWords: number; directions: ('across' | 'down' | 'reverse' | 'diagonal')[] }> = {
  1: { gridSize: 8, maxWords: 5, directions: ['across', 'down'] },
  2: { gridSize: 9, maxWords: 6, directions: ['across', 'down'] },
  3: { gridSize: 10, maxWords: 7, directions: ['across', 'down'] },
  4: { gridSize: 10, maxWords: 8, directions: ['across', 'down', 'reverse'] },
  5: { gridSize: 11, maxWords: 9, directions: ['across', 'down', 'reverse'] },
  6: { gridSize: 12, maxWords: 10, directions: ['across', 'down', 'reverse'] },
  7: { gridSize: 12, maxWords: 11, directions: ['across', 'down', 'reverse', 'diagonal'] },
  8: { gridSize: 13, maxWords: 12, directions: ['across', 'down', 'reverse', 'diagonal'] },
  9: { gridSize: 14, maxWords: 13, directions: ['across', 'down', 'reverse', 'diagonal'] },
  10: { gridSize: 15, maxWords: 14, directions: ['across', 'down', 'reverse', 'diagonal'] },
};

export default function WordSearchGame({ stage = 1, onScore, onProgress, onEnd }: Partial<GameProps>) {
  const cfg = STAGE_CFG[stage] ?? STAGE_CFG[1];
  const [puzzleId, setPuzzleId] = useState(() => makePuzzleId());
  const [seed, setSeed] = useState(() => Date.now());
  const startedAtRef = useRef<number>(Date.now());
  const lastScoreRef = useRef<number>(0);
  const endedRef = useRef(false);

  const puzzle = useMemo(() => {
    return generateWordSearch(EN_GB_CORE_WORDS, {
      gridSize: cfg.gridSize,
      directions: cfg.directions,
      seed,
      maxWords: cfg.maxWords,
      allowOverlap: false,
      locale: 'en-GB',
    });
  }, [seed, cfg.gridSize, cfg.maxWords, cfg.directions]);

  const {
    found,
    completed,
    gridRef,
    startSelection,
    extendSelection,
    endSelection,
    cellStateFor,
    remaining,
  } = useWordSearch(puzzle, puzzleId);

  // Report score + progress as words are found; call onEnd when all words found.
  useEffect(() => {
    const totalWords = puzzle.placements.length;
    const foundCount = found.size;
    if (totalWords === 0) return;

    // Award +20 per newly found word
    const delta = foundCount - lastScoreRef.current;
    if (delta > 0 && onScore) {
      onScore(delta * 20);
    }
    lastScoreRef.current = foundCount;

    if (onProgress) onProgress(foundCount / totalWords);

    if (completed && !endedRef.current && onEnd) {
      endedRef.current = true;
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      // Stars: 3 if under 30s/word, 2 if under 60s/word, else 1
      const perWord = elapsedSec / totalWords;
      const stars = perWord < 30 ? 3 : perWord < 60 ? 2 : 1;
      onEnd({
        score: foundCount * 20,
        stars,
        summary: `Found all ${totalWords} words in ${elapsedSec}s!`,
      });
    }
  }, [found, completed, puzzle.placements.length, onScore, onProgress, onEnd]);

  const handleNewGame = () => {
    setPuzzleId(makePuzzleId());
    setSeed(Date.now());
    startedAtRef.current = Date.now();
    lastScoreRef.current = 0;
    endedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const r = Number((el as HTMLElement).dataset.r);
    const c = Number((el as HTMLElement).dataset.c);
    if (!Number.isNaN(r) && !Number.isNaN(c)) {
      extendSelection(r, c);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Word Search</h1>
        <button
          onClick={handleNewGame}
          className="bg-card hover:bg-card-hover text-text px-3 py-2 rounded-lg text-sm transition"
        >
          New Game
        </button>
      </div>

      {completed && (
        <div className="text-center p-3 bg-success/20 rounded-xl mb-4">
          <span className="text-2xl">🎉</span>
          <p className="text-success font-bold mt-1">Word Search Complete!</p>
        </div>
      )}

      <div className="flex-1 grid gap-4 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto flex items-start justify-center">
          <div className="bg-card rounded-xl p-3">
            <div ref={gridRef}>
              <WordSearchGrid
                grid={puzzle.grid}
                gridSize={puzzle.gridSize}
                cellStateFor={cellStateFor}
                onMouseDown={startSelection}
                onMouseEnter={extendSelection}
                onMouseUp={endSelection}
                onTouchStart={startSelection}
                onTouchMove={handleTouchMove}
                onTouchEnd={endSelection}
              />
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <div className="bg-card rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
              Words to find
            </h3>
            <div className="flex flex-wrap gap-2">
              {puzzle.placements.map(p => {
                const isFound = found.has(p.word);
                return (
                  <span
                    key={p.word}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium border ${
                      isFound
                        ? 'bg-card-hover text-text-muted line-through border-transparent'
                        : 'bg-surface text-text border-card-hover'
                    }`}
                  >
                    {p.word}
                  </span>
                );
              })}
            </div>
            {remaining.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">All words found!</p>
            ) : (
              <p className="mt-3 text-sm text-text-muted">
                {remaining.length} word{remaining.length === 1 ? '' : 's'} remaining
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
