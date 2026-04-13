import { useMemo, useState } from 'react';
import { generateCrossword } from '@/lib/puzzle-engine/crossword/generator';
import { EN_GB_CORE_WORDS, EN_GB_CORE_CLUES } from '@/data/words/en-gb-core';
import { CrosswordGrid } from './CrosswordGrid';
import { useCrossword } from './use-crossword';

function makePuzzleId() {
  return `crossword_${Date.now()}`;
}

export default function CrosswordGame() {
  const [puzzleId, setPuzzleId] = useState(() => makePuzzleId());
  const [seed, setSeed] = useState(() => Date.now());

  const puzzle = useMemo(() => {
    return generateCrossword(EN_GB_CORE_WORDS, EN_GB_CORE_CLUES, {
      gridSize: 9,
      seed,
      maxWords: 8,
      minCrossings: 1,
      targetDifficulty: 2,
      locale: 'en-GB',
    });
  }, [seed]);

  const {
    grid,
    activeWordId,
    setActiveWordId,
    activeCell,
    completed,
    inputRefs,
    numberMap,
    cellToWords,
    focusCell,
    handleKey,
    setCellValue,
    checkSolution,
    revealCell,
  } = useCrossword(puzzle, puzzleId);

  const across = puzzle.words.filter(w => w.direction === 'across');
  const down = puzzle.words.filter(w => w.direction === 'down');

  const handleNewGame = () => {
    setPuzzleId(makePuzzleId());
    setSeed(Date.now());
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Crossword</h1>
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
          <p className="text-success font-bold mt-1">Crossword Complete!</p>
        </div>
      )}

      <div className="flex-1 grid gap-4 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto flex items-start justify-center">
          <div className="bg-card rounded-xl p-3">
            <CrosswordGrid
              puzzle={puzzle}
              grid={grid}
              activeWordId={activeWordId}
              activeCell={activeCell}
              numberMap={numberMap}
              cellToWords={cellToWords}
              inputRefs={inputRefs}
              onCellClick={(r, c) => {
                const ids = cellToWords.get(`${r},${c}`) ?? [];
                if (ids.length > 1 && activeWordId === ids[0]) {
                  setActiveWordId(ids[1]);
                } else {
                  setActiveWordId(ids[0] ?? null);
                }
                focusCell(r, c);
              }}
              onKeyDown={handleKey}
              onChange={setCellValue}
            />
          </div>
        </div>

        <div className="overflow-auto space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={checkSolution}
              className="flex-1 bg-accent text-bg font-semibold px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition"
            >
              Check
            </button>
            <button
              onClick={() => {
                if (activeCell) revealCell(activeCell.r, activeCell.c);
              }}
              className="bg-card hover:bg-card-hover text-text px-3 py-2 rounded-xl transition"
              title="Reveal cell"
            >
              👁
            </button>
          </div>

          <div className="bg-card rounded-xl p-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Across
              </h3>
              <ul className="space-y-2">
                {across.map(w => (
                  <li
                    key={w.id}
                    className={`text-sm cursor-pointer rounded px-2 py-1 transition ${
                      activeWordId === w.id
                        ? 'bg-accent-soft text-accent'
                        : 'hover:bg-card-hover'
                    }`}
                    onClick={() => {
                      setActiveWordId(w.id);
                      focusCell(w.row, w.col);
                    }}
                  >
                    <span className="font-semibold mr-2">{w.number}.</span>
                    {w.clue}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Down
              </h3>
              <ul className="space-y-2">
                {down.map(w => (
                  <li
                    key={w.id}
                    className={`text-sm cursor-pointer rounded px-2 py-1 transition ${
                      activeWordId === w.id
                        ? 'bg-accent-soft text-accent'
                        : 'hover:bg-card-hover'
                    }`}
                    onClick={() => {
                      setActiveWordId(w.id);
                      focusCell(w.row, w.col);
                    }}
                  >
                    <span className="font-semibold mr-2">{w.number}.</span>
                    {w.clue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
