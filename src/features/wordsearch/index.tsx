import { useMemo, useState } from 'react';
import { generateWordSearch } from '@/lib/puzzle-engine/wordsearch/generator';
import { EN_GB_CORE_WORDS } from '@/data/words/en-gb-core';
import { WordSearchGrid } from './WordSearchGrid';
import { useWordSearch } from './use-wordsearch';

function makePuzzleId() {
  return `wordsearch_${Date.now()}`;
}

export default function WordSearchGame() {
  const [puzzleId, setPuzzleId] = useState(() => makePuzzleId());
  const [seed, setSeed] = useState(() => Date.now());

  const puzzle = useMemo(() => {
    return generateWordSearch(EN_GB_CORE_WORDS, {
      gridSize: 10,
      directions: ['across', 'down', 'reverse'],
      seed,
      maxWords: 8,
      allowOverlap: false,
      locale: 'en-GB',
    });
  }, [seed]);

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

  const handleNewGame = () => {
    setPuzzleId(makePuzzleId());
    setSeed(Date.now());
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
