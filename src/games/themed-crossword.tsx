import { useState, useCallback, useMemo, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface PuzzleDef {
  gridSize: number;
  theme: string;
  words: { word: string; clue: string; row: number; col: number; direction: 'across' | 'down' }[];
}

const THEMED_PUZZLES: PuzzleDef[] = [
  // Animals theme
  {
    gridSize: 6,
    theme: 'Animals',
    words: [
      { word: 'DOG', clue: 'Man\'s best friend', row: 0, col: 0, direction: 'across' },
      { word: 'CAT', clue: 'Meows and purrs', row: 0, col: 3, direction: 'across' },
      { word: 'LION', clue: 'King of the jungle', row: 2, col: 0, direction: 'down' },
      { word: 'BEAR', clue: 'Large furry mammal', row: 2, col: 4, direction: 'down' },
      { word: 'FISH', clue: 'Swims in water', row: 4, col: 0, direction: 'across' },
      { word: 'BIRD', clue: 'Has feathers and wings', row: 1, col: 0, direction: 'down' },
    ],
  },
  // Food theme
  {
    gridSize: 6,
    theme: 'Food',
    words: [
      { word: 'BREAD', clue: 'Used for sandwiches', row: 0, col: 0, direction: 'across' },
      { word: 'APPLE', clue: 'Red or green fruit', row: 0, col: 0, direction: 'down' },
      { word: 'PIZZA', clue: 'Italian round dish', row: 2, col: 0, direction: 'across' },
      { word: 'PASTA', clue: 'Italian noodles', row: 1, col: 3, direction: 'down' },
      { word: 'RICE', clue: 'White grains', row: 3, col: 2, direction: 'across' },
      { word: 'CAKE', clue: 'Birthday dessert', row: 5, col: 0, direction: 'across' },
    ],
  },
  // Sports theme
  {
    gridSize: 7,
    theme: 'Sports',
    words: [
      { word: 'SOCCER', clue: 'Played with feet', row: 0, col: 0, direction: 'across' },
      { word: 'TENNIS', clue: 'Played with rackets', row: 0, col: 0, direction: 'down' },
      { word: 'GOLF', clue: 'Placed with clubs', row: 1, col: 3, direction: 'across' },
      { word: 'SWIM', clue: 'In a pool', row: 3, col: 0, direction: 'down' },
      { word: 'RUN', clue: 'Fast movement', row: 2, col: 0, direction: 'across' },
      { word: 'BIKE', clue: 'Two wheels', row: 5, col: 0, direction: 'across' },
    ],
  },
  // Nature theme
  {
    gridSize: 7,
    theme: 'Nature',
    words: [
      { word: 'TREE', clue: 'Has leaves and bark', row: 0, col: 0, direction: 'across' },
      { word: 'FLOWER', clue: 'Blooms in spring', row: 0, col: 0, direction: 'down' },
      { word: 'RIVER', clue: 'Flows to the sea', row: 1, col: 4, direction: 'down' },
      { word: 'MOUNTAIN', clue: 'Very tall land', row: 3, col: 0, direction: 'across' },
      { word: 'SUN', clue: 'Gives us light', row: 2, col: 0, direction: 'across' },
      { word: 'RAIN', clue: 'Falls from clouds', row: 6, col: 0, direction: 'across' },
    ],
  },
  // Countries theme
  {
    gridSize: 7,
    theme: 'Countries',
    words: [
      { word: 'FRANCE', clue: 'Eiffel Tower location', row: 0, col: 0, direction: 'across' },
      { word: 'JAPAN', clue: 'Land of the rising sun', row: 0, col: 0, direction: 'down' },
      { word: 'ITALY', clue: 'Shaped like a boot', row: 1, col: 3, direction: 'down' },
      { word: 'SPAIN', clue: 'Flamenco dancers', row: 2, col: 0, direction: 'across' },
      { word: 'INDIA', clue: 'Taj Mahal country', row: 4, col: 0, direction: 'down' },
      { word: 'CHINA', clue: 'Great Wall location', row: 5, col: 0, direction: 'across' },
    ],
  },
  // Colors theme
  {
    gridSize: 6,
    theme: 'Colors',
    words: [
      { word: 'RED', clue: 'Color of fire', row: 0, col: 0, direction: 'across' },
      { word: 'BLUE', clue: 'Color of sky', row: 0, col: 0, direction: 'down' },
      { word: 'GREEN', clue: 'Color of grass', row: 1, col: 2, direction: 'down' },
      { word: 'YELLOW', clue: 'Color of sun', row: 2, col: 0, direction: 'across' },
      { word: 'BLACK', clue: 'Darkest color', row: 4, col: 0, direction: 'down' },
      { word: 'WHITE', clue: 'Color of snow', row: 5, col: 2, direction: 'across' },
    ],
  },
  // Numbers theme
  {
    gridSize: 6,
    theme: 'Numbers',
    words: [
      { word: 'ONE', clue: 'First number', row: 0, col: 0, direction: 'across' },
      { word: 'TWO', clue: 'Second number', row: 0, col: 0, direction: 'down' },
      { word: 'THREE', clue: 'After two', row: 1, col: 0, direction: 'across' },
      { word: 'FIVE', clue: 'Half of ten', row: 1, col: 3, direction: 'down' },
      { word: 'SIX', clue: 'After five', row: 3, col: 0, direction: 'across' },
      { word: 'TEN', clue: 'Double five', row: 5, col: 0, direction: 'across' },
    ],
  },
  // Space theme
  {
    gridSize: 7,
    theme: 'Space',
    words: [
      { word: 'MOON', clue: 'Earth\'s satellite', row: 0, col: 0, direction: 'across' },
      { word: 'STAR', clue: 'Twinkles at night', row: 0, col: 0, direction: 'down' },
      { word: 'PLANET', clue: 'Orbits the sun', row: 1, col: 3, direction: 'down' },
      { word: 'ROCKET', clue: 'Goes to space', row: 2, col: 0, direction: 'across' },
      { word: 'EARTH', clue: 'Our home', row: 4, col: 0, direction: 'down' },
      { word: 'COMET', clue: 'Shooting star', row: 5, col: 2, direction: 'across' },
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
                {'ABCDEFGHIKLMNOPRSTUVWYZX'.split('').map(l => (
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