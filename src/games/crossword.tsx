import { useState, useCallback, useMemo, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface PuzzleDef {
  gridSize: number;
  words: { word: string; clue: string; row: number; col: number; direction: 'across' | 'down' }[];
}

const PUZZLES: PuzzleDef[] = [
  {
    gridSize: 5,
    words: [
      { word: 'HEART', clue: 'Pumps blood', row: 0, col: 0, direction: 'across' },
      { word: 'HAT', clue: 'Worn on your head', row: 0, col: 0, direction: 'down' },
      { word: 'EAR', clue: 'Hearing organ', row: 0, col: 1, direction: 'down' },
      { word: 'RAT', clue: 'Small rodent', row: 2, col: 1, direction: 'across' },
      { word: 'TEA', clue: 'Hot drink', row: 0, col: 4, direction: 'down' },
    ],
  },
  {
    gridSize: 6,
    words: [
      { word: 'PLANET', clue: 'Earth is one of these', row: 0, col: 0, direction: 'across' },
      { word: 'PAT', clue: 'A light tap', row: 0, col: 0, direction: 'down' },
      { word: 'ANT', clue: 'Tiny hard worker', row: 0, col: 2, direction: 'down' },
      { word: 'TEA', clue: 'Hot drink', row: 0, col: 5, direction: 'down' },
      { word: 'TAR', clue: 'Dark thick liquid', row: 2, col: 0, direction: 'across' },
      { word: 'TEA', clue: 'Hot drink', row: 2, col: 2, direction: 'across' },
      { word: 'EAT', clue: 'Consume food', row: 2, col: 3, direction: 'down' },
      { word: 'TAR', clue: 'Dark thick liquid', row: 4, col: 3, direction: 'across' },
    ],
  },
  {
    gridSize: 7,
    words: [
      { word: 'CANDLE', clue: 'Makes light with a flame', row: 1, col: 0, direction: 'across' },
      { word: 'CAT', clue: 'Meows and purrs', row: 1, col: 0, direction: 'down' },
      { word: 'ANT', clue: 'Tiny hard worker', row: 1, col: 2, direction: 'down' },
      { word: 'ARK', clue: 'Noah\'s boat', row: 1, col: 1, direction: 'down' },
      { word: 'KID', clue: 'A child', row: 2, col: 1, direction: 'across' },
      { word: 'TEA', clue: 'Hot drink', row: 3, col: 2, direction: 'across' },
      { word: 'NEW', clue: 'Not old', row: 3, col: 3, direction: 'across' },
      { word: 'WET', clue: 'Not dry', row: 5, col: 3, direction: 'down' },
      { word: 'EAR', clue: 'Hearing organ', row: 0, col: 6, direction: 'down' },
      { word: 'RYE', clue: 'A grain', row: 2, col: 6, direction: 'down' },
    ],
  },
];

function getCellKey(w: { row: number; col: number; direction: string }, i: number): string {
  return w.direction === 'across' ? `${w.row},${w.col + i}` : `${w.row + i},${w.col}`;
}

function CrosswordGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const difficulty = aiDifficulty || 'medium';
  const maxStage = difficulty === 'hard' ? 10 : difficulty === 'medium' ? 7 : 3;
  const puzzleIdx = Math.min(stage - 1, PUZZLES.length - 1);
  const puzzle = PUZZLES[puzzleIdx];

  const [grid, setGrid] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);

  const gridSize = puzzle.gridSize;

  const cellMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const w of puzzle.words) {
      for (let i = 0; i < w.word.length; i++) {
        const key = getCellKey(w, i);
        if (!map[key]) map[key] = [];
        map[key].push(w.word[i]);
      }
    }
    return map;
  }, [puzzle]);

  const clueNumbers = useMemo(() => {
    const nums: Record<string, number> = {};
    puzzle.words.forEach((w, i) => {
      const key = `${w.row},${w.col}`;
      if (!nums[key]) nums[key] = i + 1;
    });
    return nums;
  }, [puzzle]);

  const acrossWords = puzzle.words.filter(w => w.direction === 'across');
  const downWords = puzzle.words.filter(w => w.direction === 'down');

  const handleCellTap = useCallback((r: number, c: number) => {
    const key = `${r},${c}`;
    if (!cellMap[key]) return;
    setSelectedCell(prev => prev === key ? null : key);
    onMessage('Type or tap a letter below');
  }, [cellMap, onMessage]);

  const handleLetter = useCallback((letter: string) => {
    if (!selectedCell) return;
    setGrid(prev => ({ ...prev, [selectedCell]: letter.toUpperCase() }));
  }, [selectedCell]);

  const handleErase = useCallback(() => {
    if (!selectedCell) return;
    setGrid(prev => {
      const next = { ...prev };
      delete next[selectedCell];
      return next;
    });
  }, [selectedCell]);

  const handleCheck = useCallback(() => {
    const wrong: Record<string, boolean> = {};
    let allCorrect = true;
    for (const key of Object.keys(cellMap)) {
      const expected = cellMap[key][0];
      if (grid[key] !== expected) {
        wrong[key] = true;
        allCorrect = false;
      }
    }
    setChecked(wrong);
    onMessage(allCorrect ? 'All correct!' : `${Object.keys(wrong).length} incorrect`);
    return allCorrect;
  }, [cellMap, grid, onMessage]);

  // Track completion on grid changes
  useEffect(() => {
    if (isComplete) return;
    let allCorrect = true;
    for (const key of Object.keys(cellMap)) {
      if (grid[key] !== cellMap[key][0]) { allCorrect = false; break; }
    }
    if (allCorrect && Object.keys(grid).length > 0) {
      setIsComplete(true);
      const stars = stage >= maxStage ? 3 : stage >= Math.ceil(maxStage / 2) ? 2 : 1;
      onScore(stage * 100);
      onProgress(1);
      setTimeout(() => {
        onEnd({ score: stage * 100, stars: Math.min(stars, 3), summary: 'Crossword solved!' });
      }, 600);
    }
  }, [grid, cellMap, stage, maxStage, isComplete, onScore, onProgress, onEnd]);

  const isWordDone = (w: { word: string; row: number; col: number; direction: string }) => {
    return Array.from({ length: w.word.length }, (_, j) => grid[getCellKey(w, j)] === w.word[j]).every(Boolean);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 bg-surface border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Crossword</h1>
          <div className="flex gap-2 text-xs">
            <span className="bg-card rounded-lg px-2 py-1 text-text-muted">Stage {stage}</span>
            <span className="bg-card rounded-lg px-2 py-1 text-accent">{gridSize}x{gridSize}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Grid */}
        <div className="flex justify-center mb-4">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gap: 1, maxWidth: `${gridSize * 40}px` }}>
            {Array.from({ length: gridSize * gridSize }, (_, idx) => {
              const r = Math.floor(idx / gridSize);
              const c = idx % gridSize;
              const key = `${r},${c}`;
              const has = !!cellMap[key];
              const sel = selectedCell === key;
              const wrong = checked[key];
              const num = clueNumbers[key];
              return (
                <button key={key} onClick={() => handleCellTap(r, c)} disabled={!has}
                  className={`w-9 h-9 relative flex items-center justify-center text-sm font-bold transition-all ${
                    has ? sel ? 'bg-accent text-white' : wrong ? 'bg-danger/30 text-danger' : 'bg-card text-text hover:bg-card-hover' : 'bg-transparent'
                  }`}>
                  {num && <span className="absolute top-0 left-0.5 text-[7px] text-text-muted">{num}</span>}
                  {grid[key] || ''}
                </button>
              );
            })}
          </div>
        </div>

        {!isComplete && (
          <>
            <div className="flex justify-center mb-4">
              <div className="flex flex-wrap gap-1 max-w-xs justify-center">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                  <button key={l} onClick={() => handleLetter(l)}
                    className="w-7 h-7 bg-card rounded text-xs font-bold hover:bg-card-hover active:scale-90 transition-all">{l}</button>
                ))}
                <button onClick={handleErase} className="w-7 h-7 bg-card-hover rounded text-xs font-bold text-text-muted active:scale-90">⌫</button>
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <button onClick={handleCheck} className="bg-accent text-bg font-semibold px-6 py-2 rounded-xl hover:opacity-90 active:scale-95 text-sm">
                Check Answers
              </button>
            </div>
          </>
        )}

        {/* Clues */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold text-accent mb-2">Across</h3>
            <div className="space-y-1.5">
              {acrossWords.map((w, i) => (
                <div key={i} className={`text-xs p-2 rounded-lg ${isWordDone(w) ? 'bg-success/20 text-success' : 'bg-card'}`}>
                  <span className="font-bold mr-1">{clueNumbers[`${w.row},${w.col}`] || i + 1}.</span>
                  {w.clue} {w.word.length > 0 && <span className="text-text-muted">({w.word.length})</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-accent mb-2">Down</h3>
            <div className="space-y-1.5">
              {downWords.map((w, i) => (
                <div key={i} className={`text-xs p-2 rounded-lg ${isWordDone(w) ? 'bg-success/20 text-success' : 'bg-card'}`}>
                  <span className="font-bold mr-1">{clueNumbers[`${w.row},${w.col}`] || i + 1}.</span>
                  {w.clue} {w.word.length > 0 && <span className="text-text-muted">({w.word.length})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isComplete && (
          <div className="text-center mt-4 p-4 bg-success/20 rounded-xl">
            <span className="text-2xl">🎉</span>
            <p className="text-success font-bold mt-1">Crossword Complete!</p>
          </div>
        )}
      </div>
    </div>
  );
}

registerGame('crossword', {
  name: 'Crossword',
  emoji: '📝',
  description: 'Solve crossword puzzles — tap to enter letters!',
  category: 'board',
  stages: 10,
  component: CrosswordGame,
  aiDifficulty: 'medium',
});

export default CrosswordGame;
