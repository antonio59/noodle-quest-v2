import { useState, useCallback, useMemo, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface PuzzleDef {
  gridSize: number;
  theme: string;
  words: { word: string; clue: string; row: number; col: number; direction: 'across' | 'down' }[];
}

const THEMED_PUZZLES: PuzzleDef[] = [
  {
    gridSize: 6,
    theme: 'Animals',
    words: [
      { word: 'BEAR', clue: 'Large furry mammal', row: 0, col: 0, direction: 'across' },
      { word: 'BEE', clue: 'Makes honey', row: 0, col: 0, direction: 'down' },
      { word: 'ELK', clue: 'Large deer', row: 0, col: 1, direction: 'down' },
      { word: 'APE', clue: 'A primate', row: 0, col: 3, direction: 'across' },
      { word: 'EAR', clue: 'Hearing organ', row: 0, col: 5, direction: 'down' },
      { word: 'KID', clue: 'A young goat', row: 2, col: 1, direction: 'across' },
      { word: 'ANT', clue: 'Tiny hard worker', row: 3, col: 3, direction: 'across' },
      { word: 'GOAT', clue: 'A farm animal', row: 4, col: 0, direction: 'across' },
      { word: 'OWL', clue: 'A night bird', row: 4, col: 1, direction: 'down' },
      { word: 'AXE', clue: 'A chopping tool', row: 4, col: 2, direction: 'down' },
      { word: 'TIE', clue: 'Neckwear', row: 4, col: 3, direction: 'down' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Food',
    words: [
      { word: 'SODA', clue: 'A fizzy drink', row: 0, col: 0, direction: 'across' },
      { word: 'SOUP', clue: 'A warm liquid meal', row: 0, col: 0, direction: 'down' },
      { word: 'OAR', clue: 'Rowing stick', row: 0, col: 1, direction: 'down' },
      { word: 'CAKE', clue: 'Birthday dessert', row: 0, col: 4, direction: 'down' },
      { word: 'EGG', clue: 'Breakfast oval', row: 0, col: 5, direction: 'down' },
      { word: 'RICE', clue: 'White grains', row: 3, col: 1, direction: 'across' },
      { word: 'PORK', clue: 'Pig meat', row: 4, col: 0, direction: 'across' },
      { word: 'KEY', clue: 'Unlocks doors', row: 4, col: 3, direction: 'down' },
      { word: 'YAM', clue: 'Sweet potato', row: 5, col: 3, direction: 'across' },
      { word: 'GUM', clue: 'Chewy candy', row: 3, col: 5, direction: 'down' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Sports',
    words: [
      { word: 'GOLF', clue: 'Played with clubs', row: 0, col: 0, direction: 'across' },
      { word: 'GAME', clue: 'A match or contest', row: 0, col: 0, direction: 'down' },
      { word: 'POLO', clue: 'Played on horses', row: 0, col: 1, direction: 'down' },
      { word: 'SKI', clue: 'Sliding on snow', row: 0, col: 2, direction: 'down' },
      { word: 'TAR', clue: 'Dark thick liquid', row: 0, col: 3, direction: 'down' },
      { word: 'RUN', clue: 'Fast movement', row: 0, col: 4, direction: 'down' },
      { word: 'MAT', clue: 'Gym floor cover', row: 0, col: 5, direction: 'down' },
      { word: 'SURF', clue: 'Ride ocean waves', row: 3, col: 2, direction: 'across' },
      { word: 'SKI', clue: 'Sliding on snow', row: 3, col: 2, direction: 'down' },
      { word: 'TEAM', clue: 'A group of players', row: 4, col: 0, direction: 'across' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Nature',
    words: [
      { word: 'TREE', clue: 'Has leaves and bark', row: 0, col: 0, direction: 'across' },
      { word: 'TIDE', clue: 'Rises and falls', row: 0, col: 0, direction: 'down' },
      { word: 'EEL', clue: 'A long fish', row: 0, col: 2, direction: 'down' },
      { word: 'SEA', clue: 'A large ocean', row: 0, col: 3, direction: 'down' },
      { word: 'SUN', clue: 'Gives us light', row: 0, col: 4, direction: 'down' },
      { word: 'FOX', clue: 'A sly animal', row: 1, col: 5, direction: 'down' },
      { word: 'DEER', clue: 'A woodland animal', row: 2, col: 0, direction: 'across' },
      { word: 'MOON', clue: 'Earth\'s satellite', row: 3, col: 1, direction: 'across' },
      { word: 'MUD', clue: 'Wet dirt', row: 3, col: 1, direction: 'down' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Countries',
    words: [
      { word: 'ITALY', clue: 'Shaped like a boot', row: 0, col: 0, direction: 'across' },
      { word: 'INDIA', clue: 'Taj Mahal country', row: 0, col: 0, direction: 'down' },
      { word: 'TAN', clue: 'A light brown shade', row: 0, col: 1, direction: 'down' },
      { word: 'CHILE', clue: 'Long South American country', row: 0, col: 5, direction: 'down' },
      { word: 'IRAN', clue: 'Middle Eastern country', row: 2, col: 2, direction: 'down' },
      { word: 'CUBA', clue: 'Caribbean island', row: 3, col: 1, direction: 'across' },
      { word: 'PERU', clue: 'Machu Picchu country', row: 5, col: 0, direction: 'across' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Colors',
    words: [
      { word: 'RED', clue: 'Color of fire', row: 0, col: 0, direction: 'across' },
      { word: 'ROSE', clue: 'A pinkish color', row: 0, col: 0, direction: 'down' },
      { word: 'SKY', clue: 'Blue above us', row: 0, col: 2, direction: 'down' },
      { word: 'LIME', clue: 'Bright green citrus', row: 0, col: 3, direction: 'down' },
      { word: 'BLUE', clue: 'Color of the ocean', row: 0, col: 4, direction: 'down' },
      { word: 'CYAN', clue: 'A blue-green shade', row: 2, col: 2, direction: 'across' },
      { word: 'GREY', clue: 'Between black and white', row: 3, col: 1, direction: 'across' },
      { word: 'PINK', clue: 'A pale red', row: 4, col: 0, direction: 'across' },
      { word: 'GOLD', clue: 'A shiny yellow metal', row: 5, col: 1, direction: 'across' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Numbers',
    words: [
      { word: 'TEN', clue: 'Double five', row: 0, col: 0, direction: 'across' },
      { word: 'TWO', clue: 'Second number', row: 0, col: 0, direction: 'down' },
      { word: 'EGG', clue: 'Breakfast oval', row: 0, col: 1, direction: 'down' },
      { word: 'ODD', clue: 'Not even', row: 0, col: 3, direction: 'down' },
      { word: 'GIN', clue: 'A clear spirit', row: 2, col: 1, direction: 'across' },
      { word: 'DOG', clue: 'Man\'s best friend', row: 2, col: 3, direction: 'across' },
      { word: 'NINE', clue: 'Before ten', row: 3, col: 0, direction: 'across' },
      { word: 'EAT', clue: 'Consume food', row: 4, col: 3, direction: 'across' },
      { word: 'TEA', clue: 'A hot drink', row: 3, col: 5, direction: 'down' },
    ],
  },
  {
    gridSize: 6,
    theme: 'Space',
    words: [
      { word: 'MOON', clue: 'Earth\'s satellite', row: 0, col: 0, direction: 'across' },
      { word: 'MARS', clue: 'The red planet', row: 0, col: 0, direction: 'down' },
      { word: 'RING', clue: 'Saturn has many', row: 2, col: 0, direction: 'across' },
      { word: 'SHIP', clue: 'A space vessel', row: 0, col: 3, direction: 'down' },
      { word: 'SUN', clue: 'A star', row: 0, col: 4, direction: 'down' },
      { word: 'MARS', clue: 'The red planet', row: 4, col: 0, direction: 'across' },
      { word: 'GAS', clue: 'A state of matter', row: 5, col: 3, direction: 'across' },
    ],
  },
];

function getCellKey(w: { row: number; col: number; direction: string }, i: number): string {
  return w.direction === 'across' ? `${w.row},${w.col + i}` : `${w.row + i},${w.col}`;
}

function ThemedCrosswordGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const difficulty = aiDifficulty || 'medium';
  const puzzleIdx = Math.min(stage - 1, THEMED_PUZZLES.length - 1);
  const puzzle = THEMED_PUZZLES[puzzleIdx];

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

  useEffect(() => {
    if (isComplete) return;
    let allCorrect = true;
    for (const key of Object.keys(cellMap)) {
      if (grid[key] !== cellMap[key][0]) { allCorrect = false; break; }
    }
    if (allCorrect && Object.keys(grid).length > 0) {
      setIsComplete(true);
      const stars = stage >= 8 ? 3 : stage >= 5 ? 2 : 1;
      onScore(stage * 100);
      onProgress(1);
      setTimeout(() => {
        onEnd({ score: stage * 100, stars: Math.min(stars, 3), summary: `${puzzle.theme} crossword solved!` });
      }, 600);
    }
  }, [grid, cellMap, stage, isComplete, onScore, onProgress, onEnd, puzzle.theme]);

  const isWordDone = (w: { word: string }) => {
    return Array.from({ length: w.word.length }, (_, j) => grid[getCellKey(w as any, j)] === w.word[j]).every(Boolean);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 bg-surface border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Themed Crossword</h1>
          <div className="flex gap-2 text-xs">
            <span className="bg-card rounded-lg px-2 py-1 text-accent">{puzzle.theme}</span>
            <span className="bg-card rounded-lg px-2 py-1 text-text-muted">Stage {stage}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
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
            <p className="text-success font-bold mt-1">{puzzle.theme} Complete!</p>
          </div>
        )}
      </div>
    </div>
  );
}

registerGame('themed-crossword', {
  name: 'Themed Crossword',
  emoji: '📚',
  description: 'Crosswords with fun themes — animals, food, sports!',
  category: 'board',
  stages: 10,
  component: ThemedCrosswordGame,
  aiDifficulty: 'medium',
});

export default ThemedCrosswordGame;