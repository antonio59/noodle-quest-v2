import { useState, useCallback, useMemo, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Word lists for different stages/stages
const WORD_BANK: string[][] = [
  // Stage 1: Simple 4-5 letter words
  ['SUN', 'CAT', 'DOG', 'RUN'],
  // Stage 2: 5-6 letter words
  ['MOON', 'BIRD', 'FISH', 'RAIN', 'WAVE'],
  // Stage 3
  ['APPLE', 'MUSIC', 'DANCE', 'CLOUD', 'LIGHT', 'STORM'],
  // Stage 4
  ['PLANET', 'ORANGE', 'TIGER', 'FOREST', 'RIVER', 'CASTLE', 'SPRING'],
  // Stage 5
  ['BALLOON', 'DOLPHIN', 'RAINBOW', 'GARDEN', 'THUNDER', 'SUNRISE', 'MUSEUM', 'JOURNEY'],
  // Stage 6
  ['BUTTERFLY', 'ADVENTURE', 'CHOCOLATE', 'EARTHQUAKE', 'VOLCANO', 'FIREWORK', 'DINOSAUR', 'UMBRELLA', 'TREASURE'],
  // Stage 7
  ['EQUILIBRIUM', 'TECHNOLOGY', 'WONDERLAND', 'KALEIDOSCOPE', 'BIOLOGICAL', 'MYSTERIOUS', 'CHAMPIONSH', 'NAVIGATOR'],
  ['BIOGRAPHY', 'LANDSCAPE', 'ELECTRONICS'],
];

const GRID_SIZES = [6, 7, 8, 9, 10, 12, 13];
type Dir = 'across' | 'down' | 'diagonal' | 'reverse' | 'diag-reverse';
const DIRECTIONS_FULL: Dir[] = ['across', 'down', 'diagonal', 'reverse', 'diag-reverse'];

// Stage configuration: which directions are enabled based on difficulty
function getStageConfig(stage: number, difficulty: string) {
  const maxStage = difficulty === 'hard' ? 10 : difficulty === 'medium' ? 7 : 3;
  const safeStage = Math.min(stage, maxStage);
  const gridSize = GRID_SIZES[Math.min(safeStage - 1, GRID_SIZES.length - 1)];
  
  let directions: Dir[];
  if (stage <= 2) directions = ['across', 'down'];
  else if (stage <= 4) directions = ['across', 'down', 'reverse'];
  else if (stage <= 6) directions = ['across', 'down', 'diagonal', 'reverse'];
  else directions = DIRECTIONS_FULL;

  return { gridSize, directions, maxStage };
}

function generateWordSearch(words: string[], gridSize: number, directions: Dir[]): { grid: string[][]; placements: { word: string; cells: [number, number][] }[] } {
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const placements: { word: string; cells: [number, number][] }[] = [];
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  const directionVectors: Record<string, [number, number]> = {
    across: [0, 1],
    down: [1, 0],
    diagonal: [1, 1],
    reverse: [0, -1],
    'diag-reverse': [1, -1],
  };

  for (const word of sortedWords) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const [dr, dc] = directionVectors[dir];

      const minRow = dr > 0 ? 0 : word.length - 1;
      const maxRow = dr > 0 ? gridSize - word.length : gridSize - 1;
      const minCol = dc > 0 ? 0 : word.length - 1;
      const maxCol = dc > 0 ? gridSize - word.length : gridSize - 1;

      if (minRow > maxRow || minCol > maxCol) continue;

      const sr = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
      const sc = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));

      const cells: [number, number][] = [];
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = sr + dr * i;
        const c = sc + dc * i;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) { canPlace = false; break; }
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) { canPlace = false; break; }
        cells.push([r, c]);
      }

      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          grid[cells[i][0]][cells[i][1]] = word[i];
        }
        placements.push({ word, cells });
        placed = true;
      }
    }
  }

  // Fill remaining cells with random letters
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return { grid, placements };
}

function WordSearchGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const difficulty = aiDifficulty || 'medium';
  const { gridSize, directions, maxStage } = getStageConfig(stage, difficulty);

  const wordListIndex = Math.min(stage - 1, WORD_BANK.length - 1);
  const wordList = WORD_BANK[wordListIndex] || WORD_BANK[0];

  const puzzleData = useMemo(() => {
    return generateWordSearch(wordList, gridSize, directions);
  }, [wordList, gridSize, directions.join(',')]);

  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  const grid = puzzleData.grid;

  const handleCellDown = useCallback((r: number, c: number) => {
    setSelecting(true);
    setStartCell([r, c]);
    setCurrentHighlight(new Set([`${r},${c}`]));
  }, []);

  const handleCellOver = useCallback((r: number, c: number) => {
    if (!selecting || !startCell) return;
    const cells = new Set<string>();
    const [sr, sc] = startCell;
    
    // Determine direction and build highlight line
    const dr = Math.sign(r - sr);
    const dc = Math.sign(c - sc);
    const steps = Math.max(Math.abs(r - sr), Math.abs(c - sc));
    
    if (steps === 0) {
      cells.add(`${sr},${sc}`);
    } else {
      for (let i = 0; i <= steps; i++) {
        const cr = sr + dr * i;
        const cc = sc + dc * i;
        if (cr >= 0 && cr < gridSize && cc >= 0 && cc < gridSize) {
          cells.add(`${cr},${cc}`);
        }
      }
    }
    setCurrentHighlight(cells);
  }, [selecting, startCell, gridSize]);

  const handleCellUp = useCallback(() => {
    setSelecting(false);
    
    // Check if current selection matches any word
    const selectedCells = Array.from(currentHighlight);
    const selectedLetters = selectedCells
      .map(key => {
        const [r, c] = key.split(',').map(Number);
        return grid[r]?.[c] || '';
      })
      .join('')
      .trim();

    const reversedLetters = selectedLetters.split('').reverse().join('');

    for (const p of puzzleData.placements) {
      const word = p.word;
      const wordCells = p.cells.map(([r, c]) => `${r},${c}`);
      
      if ((!foundWords.has(word)) && (selectedLetters === word || reversedLetters === word)) {
        if (JSON.stringify(selectedCells.sort()) === JSON.stringify(wordCells.sort())) {
          const newFound = new Set(foundWords);
          newFound.add(word);
          setFoundWords(newFound);
          
          const newCells = new Set(foundCells);
          wordCells.forEach(c => newCells.add(c));
          setFoundCells(newCells);
          
          const pct = (newFound.size / wordList.length) * 100;
          onProgress(pct / 100);
          onMessage(`${newFound.size}/${wordList.length} found!`);
          onScore(100);

          if (newFound.size >= wordList.length) {
            const stars = stage >= maxStage ? 3 : stage >= Math.ceil(maxStage / 2) ? 2 : 1;
            setTimeout(() => {
              onEnd({ score: stage * 100, stars: Math.min(stars, 3), summary: `Found all ${wordList.length} words!` });
            }, 500);
          }
          break;
        }
      }
    }
    
    setCurrentHighlight(new Set());
    setStartCell(null);
  }, [currentHighlight, foundWords, puzzleData.placements, foundCells, wordList.length, stage, maxStage, onProgress, onMessage, onScore, onEnd, grid]);

  // For mobile touch support
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!gridRef.current) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element?.getAttribute('data-cell')) {
      const [r, c] = element.getAttribute('data-cell')!.split(',').map(Number);
      handleCellOver(r, c);
    }
  }, [handleCellOver]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 bg-surface border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Word Search</h1>
          <div className="flex gap-2 text-xs">
            <span className="bg-card rounded-lg px-2 py-1 text-text-muted">Stage {stage}</span>
            <span className="bg-card rounded-lg px-2 py-1 text-accent">{foundWords.size}/{wordList.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Grid */}
        <div ref={gridRef} className="flex justify-center mb-4" onTouchMove={handleTouchMove}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gap: 1, maxWidth: `${gridSize * 36}px`, margin: '0 auto' }}>
            {Array.from({ length: gridSize * gridSize }, (_, idx) => {
              const r = Math.floor(idx / gridSize);
              const c = idx % gridSize;
              const key = `${r},${c}`;
              const isFound = foundCells.has(key);
              const isHighlighted = currentHighlight.has(key);
              return (
                <div
                  key={key}
                  data-cell={key}
                  onMouseDown={(e) => { e.preventDefault(); handleCellDown(r, c); }}
                  onMouseEnter={() => handleCellOver(r, c)}
                  onMouseUp={() => handleCellUp()}
                  onTouchStart={() => handleCellDown(r, c)}
                  onTouchEnd={() => handleCellUp()}
                  className={`w-9 h-9 flex items-center justify-center text-xs font-bold select-none cursor-pointer transition-all ${
                    isFound
                      ? 'bg-success/40 text-success'
                      : isHighlighted
                      ? 'bg-accent text-white'
                      : 'bg-card text-text hover:bg-card-hover active:scale-90'
                  }`}
                >
                  {grid[r][c]}
                </div>
              );
            })}
          </div>
        </div>

        {/* Words to find */}
        <div className="bg-card rounded-xl p-3 mb-3">
          <h3 className="text-sm font-bold text-text-dim mb-2">Words to Find</h3>
          <div className="flex flex-wrap gap-1.5">
            {wordList.map(word => (
              <span
                key={word}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                  foundWords.has(word)
                    ? 'bg-success/30 text-success line-through'
                    : 'bg-card-hover text-text'
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {foundWords.size === wordList.length && (
          <div className="text-center p-4 bg-success/20 rounded-xl">
            <span className="text-2xl">🎉</span>
            <p className="text-success font-bold mt-1">All Words Found!</p>
          </div>
        )}

        <p className="text-xs text-text-muted text-center mt-2">
          Drag across letters to select words
        </p>
      </div>
    </div>
  );
}

registerGame('wordsearch', {
  name: 'Word Search',
  emoji: '🔍',
  description: 'Find hidden words in a letter grid!',
  category: 'board',
  stages: 10,
  component: WordSearchGame,
  aiDifficulty: 'medium',
});

export default WordSearchGame;
