import { useEffect, useMemo, useRef, useState } from 'react';
import { generateWordSearch } from '@/lib/puzzle-engine/wordsearch/generator';
import { EN_GB_CORE_WORDS } from '@/data/words/en-gb-core';
import { WordSearchGrid } from './WordSearchGrid';
import { useWordSearch } from './use-wordsearch';
import type { GameProps } from '@/types';
import { Check, Sparkles } from 'lucide-react';

function makePuzzleId() {
  return `wordsearch_${Date.now()}`;
}

function wordSearchCfg(stage: number) {
  const dirs: ('across' | 'down' | 'reverse' | 'diagonal')[] =
    stage <= 3 ? ['across', 'down']
    : stage <= 6 ? ['across', 'down', 'reverse']
    : ['across', 'down', 'reverse', 'diagonal'];
  return {
    gridSize: Math.min(22, 8 + Math.floor((stage - 1) * 0.7)),
    maxWords: Math.min(24, 5 + stage),
    directions: dirs,
  };
}

export default function WordSearchGame({ stage = 1, onScore, onProgress, onEnd }: Partial<GameProps>) {
  const cfg = wordSearchCfg(stage);
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
    foundOverlays,
    colorFor,
    remaining,
  } = useWordSearch(puzzle, puzzleId);

  // Score and progress
  useEffect(() => {
    const totalWords = puzzle.placements.length;
    const foundCount = found.size;
    if (totalWords === 0) return;

    const delta = foundCount - lastScoreRef.current;
    if (delta > 0 && onScore) onScore(delta * 20);
    lastScoreRef.current = foundCount;

    if (onProgress) onProgress(foundCount / totalWords);

    if (completed && !endedRef.current && onEnd) {
      endedRef.current = true;
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
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

  const totalWords = puzzle.placements.length;
  const foundCount = found.size;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-violet-50/5 to-transparent">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="text-sm font-semibold">
            {foundCount} / {totalWords} found
          </span>
        </div>
        <button
          onClick={handleNewGame}
          className="bg-card hover:bg-card-hover text-text px-3 py-1.5 rounded-lg text-xs font-semibold transition"
        >
          New Game
        </button>
      </div>

      {completed && (
        <div className="mx-4 mb-2 text-center p-2 bg-success/20 rounded-lg flex-shrink-0">
          <span className="text-success font-bold text-sm">🎉 Complete!</span>
        </div>
      )}

      {/* Board + word list */}
      <div className="flex-1 grid gap-3 lg:grid-cols-[1fr_260px] overflow-hidden px-3 pb-3">
        <div className="overflow-auto flex items-start justify-center">
          <div className="bg-white/95 rounded-2xl p-3 shadow-lg">
            <div ref={gridRef}>
              <WordSearchGrid
                grid={puzzle.grid}
                gridSize={puzzle.gridSize}
                cellStateFor={cellStateFor}
                foundOverlays={foundOverlays}
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
          <div className="bg-card rounded-xl p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              Words to find
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {puzzle.placements.map(p => {
                const isFound = found.has(p.word);
                const color = isFound ? colorFor(p.word) : undefined;
                return (
                  <span
                    key={p.word}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isFound ? 'text-white' : 'bg-surface text-text border border-card-hover'
                    }`}
                    style={isFound ? { backgroundColor: color } : undefined}
                  >
                    {isFound && <Check size={10} strokeWidth={3} />}
                    <span className={isFound ? '' : ''}>{p.word}</span>
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              {remaining.length === 0
                ? 'All words found!'
                : `${remaining.length} to go`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
