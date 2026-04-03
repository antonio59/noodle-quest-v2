import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';

interface CellData {
  letter: string;
  userLetter: string;
  number?: number;
}

interface WordDef {
  word: string;
  clue: string;
}

const CONFIG: Record<number, { gridSize: number; words: WordDef[]; timeLimit: number }> = {
  1: { gridSize: 5, timeLimit: 180, words: [
    { word: 'CAT', clue: 'A furry pet that purrs' },
    { word: 'DOG', clue: 'A loyal pet that barks' },
    { word: 'SUN', clue: 'Shines in the sky during day' },
  ]},
  2: { gridSize: 5, timeLimit: 170, words: [
    { word: 'BAT', clue: 'Flies at night' },
    { word: 'CUP', clue: 'You drink from this' },
    { word: 'RUN', clue: 'Move faster than walking' },
    { word: 'BIG', clue: 'Opposite of small' },
  ]},
  3: { gridSize: 5, timeLimit: 160, words: [
    { word: 'FISH', clue: 'Lives in water, has fins' },
    { word: 'TREE', clue: 'Tall plant with leaves' },
    { word: 'BOOK', clue: 'You read this for stories' },
    { word: 'STAR', clue: 'Twinkles at night' },
  ]},
  4: { gridSize: 5, timeLimit: 150, words: [
    { word: 'BIRD', clue: 'Has feathers and wings' },
    { word: 'CAKE', clue: 'Sweet treat for birthdays' },
    { word: 'RAIN', clue: 'Water falling from clouds' },
    { word: 'FROG', clue: 'Green amphibian that hops' },
    { word: 'MILK', clue: 'White drink from cows' },
  ]},
  5: { gridSize: 6, timeLimit: 150, words: [
    { word: 'PIANO', clue: 'Musical instrument with keys' },
    { word: 'TIGER', clue: 'Big striped wild cat' },
    { word: 'OCEAN', clue: 'Vast body of salt water' },
    { word: 'BREAD', clue: 'Baked food made from flour' },
    { word: 'CLOUD', clue: 'White fluffy thing in sky' },
  ]},
  6: { gridSize: 6, timeLimit: 140, words: [
    { word: 'DANCE', clue: 'Moving to music' },
    { word: 'FRUIT', clue: 'Apple, banana, orange are these' },
    { word: 'HOUSE', clue: 'Where people live' },
    { word: 'NIGHT', clue: 'When the sun goes down' },
    { word: 'SMILE', clue: 'What your face does when happy' },
    { word: 'WATER', clue: 'Clear liquid we drink' },
  ]},
  7: { gridSize: 6, timeLimit: 130, words: [
    { word: 'PLANET', clue: 'Earth is one of these' },
    { word: 'FLOWER', clue: 'Colorful part of a plant' },
    { word: 'GARDEN', clue: 'Place where plants grow' },
    { word: 'SUMMER', clue: 'Hottest season of the year' },
    { word: 'SCHOOL', clue: 'Place where you learn' },
    { word: 'FAMILY', clue: 'People related to you' },
  ]},
  8: { gridSize: 7, timeLimit: 130, words: [
    { word: 'DOCTOR', clue: 'Helps sick people get better' },
    { word: 'FOREST', clue: 'Large area full of trees' },
    { word: 'BRIDGE', clue: 'Crosses over a river' },
    { word: 'CASTLE', clue: 'Where a king or queen lives' },
    { word: 'PENCIL', clue: 'Used for writing and drawing' },
    { word: 'WINTER', clue: 'Coldest season with snow' },
  ]},
  9: { gridSize: 7, timeLimit: 120, words: [
    { word: 'ISLAND', clue: 'Land surrounded by water' },
    { word: 'JUNGLE', clue: 'Dense tropical forest' },
    { word: 'KITTEN', clue: 'A baby cat' },
    { word: 'MUSEUM', clue: 'Place to see old things' },
    { word: 'PUZZLE', clue: 'A game that tests your mind' },
    { word: 'ROCKET', clue: 'Flies to space' },
    { word: 'SILVER', clue: 'Shiny grey precious metal' },
  ]},
  10: { gridSize: 7, timeLimit: 110, words: [
    { word: 'TEACHER', clue: 'Helps students learn' },
    { word: 'BALLOON', clue: 'Floats when filled with air' },
    { word: 'CAPTAIN', clue: 'Leader of a ship' },
    { word: 'DIAMOND', clue: 'Hardest natural gemstone' },
    { word: 'EAGLE', clue: 'Majestic bird of prey' },
    { word: 'FESTIVAL', clue: 'A big celebration event' },
    { word: 'GUITAR', clue: 'String instrument you strum' },
  ]},
  11: { gridSize: 8, timeLimit: 110, words: [
    { word: 'ADVENTURE', clue: 'An exciting experience' },
    { word: 'BUTTERFLY', clue: 'Insect with colorful wings' },
    { word: 'CHOCOLATE', clue: 'Sweet brown treat' },
    { word: 'DINOSAUR', clue: 'Ancient giant reptile' },
    { word: 'ELEPHANT', clue: 'Largest land animal' },
    { word: 'FIREWORK', clue: 'Colorful explosion in sky' },
    { word: 'GALAXY', clue: 'Huge group of stars' },
  ]},
  12: { gridSize: 8, timeLimit: 100, words: [
    { word: 'HARMONY', clue: 'Pleasant combination of sounds' },
    { word: 'IMAGINE', clue: 'Picture something in your mind' },
    { word: 'JOURNEY', clue: 'A long trip somewhere' },
    { word: 'KNOWLEDGE', clue: 'What you learn from study' },
    { word: 'LIBRARY', clue: 'Place full of books' },
    { word: 'MOUNTAIN', clue: 'Very tall natural hill' },
    { word: 'NOTEBOOK', clue: 'Book for writing notes' },
    { word: 'ORANGE', clue: 'Round citrus fruit and color' },
  ]},
  13: { gridSize: 8, timeLimit: 95, words: [
    { word: 'PAINTING', clue: 'Art made with brush and paint' },
    { word: 'QUESTION', clue: 'Something you ask for info' },
    { word: 'RAINBOW', clue: 'Arc of colors after rain' },
    { word: 'SNOWFLAKE', clue: 'Unique ice crystal from sky' },
    { word: 'TREASURE', clue: 'Valuable hidden riches' },
    { word: 'UMBRELLA', clue: 'Keeps you dry in rain' },
    { word: 'VACATION', clue: 'Time off from work or school' },
    { word: 'WONDER', clue: 'Feeling of amazement' },
  ]},
  14: { gridSize: 9, timeLimit: 95, words: [
    { word: 'XYLOPHONE', clue: 'Musical instrument with bars' },
    { word: 'YELLOW', clue: 'Color of bananas and lemons' },
    { word: 'ZEBRA', clue: 'Striped horse-like animal' },
    { word: 'BALANCE', clue: 'Staying steady and not falling' },
    { word: 'CAMPFIRE', clue: 'Outdoor fire for warmth' },
    { word: 'DOLPHIN', clue: 'Smart friendly sea mammal' },
    { word: 'EXPLORE', clue: 'Travel to discover new things' },
    { word: 'FEATHER', clue: 'Light covering on birds' },
  ]},
  15: { gridSize: 9, timeLimit: 90, words: [
    { word: 'GIRAFFE', clue: 'Tallest animal with long neck' },
    { word: 'HURRICANE', clue: 'Powerful tropical storm' },
    { word: 'INVENTOR', clue: 'Person who creates new things' },
    { word: 'JEWELRY', clue: 'Decorative items like rings' },
    { word: 'KEYBOARD', clue: 'Type on this for computers' },
    { word: 'LEMONADE', clue: 'Refreshing citrus drink' },
    { word: 'MAGNETIC', clue: 'Attracted to magnets' },
    { word: 'NOCTURNAL', clue: 'Active during the night' },
    { word: 'OCTOPUS', clue: 'Eight-armed sea creature' },
  ]},
  16: { gridSize: 9, timeLimit: 85, words: [
    { word: 'PENGUIN', clue: 'Black and white flightless bird' },
    { word: 'QUARTZ', clue: 'Common shiny mineral' },
    { word: 'RAINBOW', clue: 'Seven colors in the sky' },
    { word: 'SCULPTOR', clue: 'Artist who shapes stone' },
    { word: 'TORNADO', clue: 'Spinning column of wind' },
    { word: 'UNIVERSE', clue: 'Everything that exists' },
    { word: 'VOLCANO', clue: 'Mountain that erupts lava' },
    { word: 'WATERFALL', clue: 'Water dropping from height' },
    { word: 'SNOWMAN', clue: 'Figure made from snow' },
  ]},
  17: { gridSize: 9, timeLimit: 80, words: [
    { word: 'ARCHITECT', clue: 'Designs buildings' },
    { word: 'BUTTERCUP', clue: 'Small yellow wildflower' },
    { word: 'CATERPILLAR', clue: 'Larva that becomes butterfly' },
    { word: 'DAFFODIL', clue: 'Spring flower with trumpet' },
    { word: 'EARTHQUAKE', clue: 'Shaking of the ground' },
    { word: 'FIREPLACE', clue: 'Indoor place for a fire' },
    { word: 'GLACIER', clue: 'Slow-moving river of ice' },
    { word: 'HARMONICA', clue: 'Small wind instrument' },
    { word: 'ICEBERG', clue: 'Large floating ice mass' },
    { word: 'JASMINE', clue: 'Fragrant white flower' },
  ]},
  18: { gridSize: 9, timeLimit: 75, words: [
    { word: 'KALEIDOSCOPE', clue: 'Tube with changing patterns' },
    { word: 'LABYRINTH', clue: 'Complex maze-like path' },
    { word: 'MUSHROOM', clue: 'Fungi growing on forest floor' },
    { word: 'NEBULA', clue: 'Cloud of gas in space' },
    { word: 'ORCHARD', clue: 'Grove of fruit trees' },
    { word: 'PANTHER', clue: 'Large black wild cat' },
    { word: 'QUILTED', clue: 'Sewn with padded layers' },
    { word: 'RADIANT', clue: 'Glowing with light' },
    { word: 'SANDWICH', clue: 'Food between bread slices' },
    { word: 'THUNDER', clue: 'Sound after lightning' },
  ]},
  19: { gridSize: 9, timeLimit: 70, words: [
    { word: 'UNICORN', clue: 'Mythical horse with horn' },
    { word: 'VAMPIRE', clue: 'Mythical creature drinking blood' },
    { word: 'WARRIOR', clue: 'Brave fighter in battle' },
    { word: 'XENON', clue: 'Noble gas used in lights' },
    { word: 'YACHT', clue: 'Luxury sailing boat' },
    { word: 'ZENITH', clue: 'Highest point reached' },
    { word: 'BLOSSOM', clue: 'Flower on a tree' },
    { word: 'CRYSTAL', clue: 'Clear mineral formation' },
    { word: 'DRAGON', clue: 'Mythical fire-breathing beast' },
    { word: 'EMERALD', clue: 'Precious green gemstone' },
  ]},
  20: { gridSize: 9, timeLimit: 65, words: [
    { word: 'PHOENIX', clue: 'Mythical bird reborn from ashes' },
    { word: 'GRIFFIN', clue: 'Mythical lion-eagle creature' },
    { word: 'SPHINX', clue: 'Mythical riddle-asking beast' },
    { word: 'MERMAID', clue: 'Mythical half-fish woman' },
    { word: 'CENTAUR', clue: 'Mythical half-horse man' },
    { word: 'WIZARD', clue: 'Magic-using wise man' },
    { word: 'CASTLE', clue: 'Fortified medieval home' },
    { word: 'DRAGON', clue: 'Scaled fire-breathing beast' },
    { word: 'KNIGHT', clue: 'Armored medieval warrior' },
    { word: 'POTION', clue: 'Magical liquid drink' },
  ]},
};

const TIPS = [
  "💡 Tip: Start with the shortest words — they're easiest!",
  "💡 Tip: Look for crossing letters between words!",
  "💡 Tip: Read all clues first before filling in answers.",
  "💡 Tip: If stuck, try a different word and come back.",
  "💡 Tip: Common letters (E, A, T, S) are good starting points.",
];

function CrosswordGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [wordPlacements, setWordPlacements] = useState<{ word: string; clue: string; cells: [number, number][] }[]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [feedback, setFeedback] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const foundWordsRef = useRef<Set<string>>(new Set());

  const buildGrid = useCallback((): { grid: CellData[][]; placements: { word: string; clue: string; cells: [number, number][] }[] } => {
    const size = config.gridSize;
    const emptyGrid: CellData[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ letter: '', userLetter: '' }))
    );

    const FALLBACK_WORDS: WordDef[] = [
      { word: 'CAT', clue: 'A furry pet that purrs' },
      { word: 'DOG', clue: 'A loyal pet that barks' },
      { word: 'SUN', clue: 'Shines in the sky during day' },
      { word: 'RUN', clue: 'Move faster than walking' },
      { word: 'FUN', clue: 'Enjoyable time' },
    ];
    const filteredWords = config.words.filter(w => w.word.length <= size);
    const words = filteredWords.length > 0 ? filteredWords : FALLBACK_WORDS.filter(w => w.word.length <= size);
    const placements: { word: string; clue: string; cells: [number, number][] }[] = [];

    const canPlace = (word: string, row: number, col: number, dir: 'across' | 'down'): boolean => {
      if (dir === 'across') {
        if (col + word.length > size) return false;
        for (let i = 0; i < word.length; i++) {
          const cell = emptyGrid[row][col + i];
          if (cell.letter !== '' && cell.letter !== word[i]) return false;
        }
        return true;
      } else {
        if (row + word.length > size) return false;
        for (let i = 0; i < word.length; i++) {
          const cell = emptyGrid[row + i][col];
          if (cell.letter !== '' && cell.letter !== word[i]) return false;
        }
        return true;
      }
    };

    const placeWord = (word: string, clue: string, row: number, col: number, dir: 'across' | 'down') => {
      const cells: [number, number][] = [];
      for (let i = 0; i < word.length; i++) {
        const r = dir === 'down' ? row + i : row;
        const c = dir === 'across' ? col + i : col;
        emptyGrid[r][c].letter = word[i];
        cells.push([r, c]);
      }
      placements.push({ word, clue, cells });
    };

    const dirs: ('across' | 'down')[] = ['across', 'down'];
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      let placed = false;

      // First word: place in center going across
      if (wi === 0) {
        const row = Math.floor(size / 2);
        const col = Math.floor((size - w.word.length) / 2);
        if (canPlace(w.word, row, col, 'across')) {
          placeWord(w.word, w.clue, row, col, 'across');
          placed = true;
        }
      }

      // Subsequent words: try to intersect with already-placed letters
      if (!placed && placements.length > 0) {
        const oppositeDir = (d: 'across' | 'down'): 'across' | 'down' => d === 'across' ? 'down' : 'across';
        outer: for (const existingPlacement of placements) {
          for (let ei = 0; ei < existingPlacement.cells.length; ei++) {
            const [er, ec] = existingPlacement.cells[ei];
            const existingLetter = existingPlacement.word[ei];
            // Try to intersect: find positions in the new word that match this letter
            for (let wi2 = 0; wi2 < w.word.length; wi2++) {
              if (w.word[wi2] !== existingLetter) continue;
              const dir = oppositeDir(existingPlacement.cells.length > 1 &&
                existingPlacement.cells[0][0] === existingPlacement.cells[1][0] ? 'across' : 'down');
              let row: number, col: number;
              if (dir === 'across') {
                row = er;
                col = ec - wi2;
              } else {
                row = er - wi2;
                col = ec;
              }
              if (row >= 0 && col >= 0 && canPlace(w.word, row, col, dir)) {
                placeWord(w.word, w.clue, row, col, dir);
                placed = true;
                break outer;
              }
            }
          }
        }
      }

      // Fall back to random placement if intersection failed
      if (!placed) {
        for (let attempt = 0; attempt < 300 && !placed; attempt++) {
          const dir = dirs[Math.floor(Math.random() * 2)];
          const row = Math.floor(Math.random() * size);
          const col = Math.floor(Math.random() * size);
          if (canPlace(w.word, row, col, dir)) {
            placeWord(w.word, w.clue, row, col, dir);
            placed = true;
          }
        }
      }
    }

    // Add numbers to first cell of each word
    let num = 1;
    for (const p of placements) {
      const [r, c] = p.cells[0];
      if (!emptyGrid[r][c].number) {
        emptyGrid[r][c].number = num++;
      }
    }

    return { grid: emptyGrid, placements };
  }, [config]);

  const startGame = useCallback(() => {
    const { grid: newGrid, placements } = buildGrid();
    // If no words were placed, retry up to 5 times
    let finalGrid = newGrid;
    let finalPlacements = placements;
    let attempts = 0;
    while (finalPlacements.length === 0 && attempts < 5) {
      const retry = buildGrid();
      finalGrid = retry.grid;
      finalPlacements = retry.placements;
      attempts++;
    }

    setGrid(finalGrid);
    setWordPlacements(finalPlacements);
    setScore(0);
    setWordsFound(0);
    setTimeLeft(config.timeLimit);
    setFeedback('');
    setSelectedCell(null);
    setFoundWords(new Set());
    scoreRef.current = 0;
    foundWordsRef.current = new Set();
    gameActiveRef.current = true;
    setPhase('playing');
  }, [buildGrid, config]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const total = config.words.length;
          const found = foundWordsRef.current.size;
          const pct = total > 0 ? found / total : 0;
          const stars = pct >= 1 ? 3 : pct >= 0.6 ? 2 : 1;
          const summary = `Time's up! You found ${found}/${total} words. Try reading all clues first next time!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config.words.length, onEnd]);

  // Handle letter input (from on-screen keyboard or physical keyboard)
  const inputLetter = useCallback((letter: string) => {
    if (!selectedCell || !gameActiveRef.current) return;
    const [r, c] = selectedCell;
    const cell = grid[r]?.[c];
    if (!cell || cell.letter === '') return;

    const upper = letter.toUpperCase();
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[r][c].userLetter = upper;
    setGrid(newGrid);

    if (upper === cell.letter) {
      setScore(prev => prev + 5);
      scoreRef.current += 5;
      onScore(5);
      setFeedback('✅ Correct!');
      setTimeout(() => setFeedback(''), 800);
    } else {
      setFeedback('❌ Try again!');
      setTimeout(() => setFeedback(''), 800);
    }

    // Auto-advance to next cell in same word
    for (const wp of wordPlacements) {
      const idx = wp.cells.findIndex(([cr, cc]) => cr === r && cc === c);
      if (idx >= 0 && idx < wp.cells.length - 1) {
        setSelectedCell(wp.cells[idx + 1]);
        return;
      }
    }
  }, [selectedCell, grid, wordPlacements, onScore]);

  // Check for completed words
  useEffect(() => {
    if (phase !== 'playing') return;
    for (const wp of wordPlacements) {
      if (foundWordsRef.current.has(wp.word)) continue;
      const allFilled = wp.cells.every(([r, c]) => grid[r]?.[c]?.userLetter === grid[r]?.[c]?.letter && grid[r]?.[c]?.letter !== '');
      if (allFilled) {
        foundWordsRef.current.add(wp.word);
        setFoundWords(new Set(foundWordsRef.current));
        const newCount = foundWordsRef.current.size;
        setWordsFound(newCount);
        const points = wp.word.length * 20;
        scoreRef.current += points;
        setScore(scoreRef.current);
        onScore(points);
        onProgress(newCount / config.words.length);
        setFeedback(`🎉 "${wp.word}" found! +${points}`);
        setTimeout(() => setFeedback(''), 2000);

        if (newCount >= config.words.length) {
          gameActiveRef.current = false;
          const timeBonus = Math.floor(timeLeft / 3);
          scoreRef.current += timeBonus;
          const stars = timeLeft > config.timeLimit * 0.5 ? 3 : timeLeft > config.timeLimit * 0.25 ? 2 : 1;
          const summary = `All ${config.words.length} words found! Amazing vocabulary! 🏆 Time bonus: +${timeBonus}`;
          setTimeout(() => onEnd({ score: scoreRef.current, stars, summary }), 1500);
        }
        break;
      }
    }
  }, [grid, wordPlacements, phase, config.words.length, config.timeLimit, onScore, onProgress, onEnd, timeLeft]);

  // Physical keyboard support
  useEffect(() => {
    if (phase !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        inputLetter(e.key);
      } else if (e.key === 'Backspace' && selectedCell) {
        const [r, c] = selectedCell;
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[r][c].userLetter = '';
        setGrid(newGrid);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, inputLetter, selectedCell, grid]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">✏️</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Crossword Puzzle</h2>
        <p className="text-text-dim mb-4 max-w-xs">Fill in the grid using the clues!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-lg mb-1">📝 {config.words.length} words</div>
          <div className="text-warning">{config.gridSize}×{config.gridSize} grid</div>
          <div className="text-success mt-1">⏱️ {config.timeLimit}s</div>
        </div>
        <p className="text-text-dim text-sm mb-5 max-w-xs">{tip}</p>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start! ✏️
        </button>
      </div>
    );
  }

  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth - 40, 400)) / config.gridSize), 48);
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center">
      {/* Header */}
      <div className="flex gap-3 px-3 py-2 bg-card rounded-xl mb-2 w-full justify-center">
        <span className="text-accent font-bold text-sm">Words: {wordsFound}/{config.words.length}</span>
        <span className="text-text-dim text-sm">Score: {score}</span>
        <span className={`font-bold text-sm ${timeLeft <= 10 ? 'text-danger' : 'text-warning'}`}>⏱️ {timeLeft}</span>
      </div>

      {/* Grid */}
      <div className="grid gap-0.5 p-2 bg-card rounded-xl mb-2" style={{ gridTemplateColumns: `repeat(${config.gridSize}, ${cellSize}px)` }}>
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isSelected = selectedCell?.[0] === rIdx && selectedCell?.[1] === cIdx;
            const hasLetter = cell.letter !== '';
            const isCorrect = cell.userLetter !== '' && cell.userLetter === cell.letter;
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                onPointerDown={(e) => { e.stopPropagation(); if (hasLetter) setSelectedCell([rIdx, cIdx]); }}
                className={`flex items-center justify-center font-mono font-bold select-none transition-all relative
                  ${hasLetter ? (isCorrect ? 'bg-success/20' : 'bg-accent/20') : 'bg-surface'}
                  ${isSelected ? 'ring-2 ring-warning' : ''}
                  ${!hasLetter ? 'opacity-30' : 'cursor-pointer'}
                `}
                style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.45 }}
              >
                {cell.number && <span className="absolute top-0 left-0.5 text-[8px] text-text-muted">{cell.number}</span>}
                {cell.userLetter || (hasLetter ? '' : '')}
              </div>
            );
          })
        )}
      </div>

      {/* Clues */}
      <div className="w-full max-w-sm px-2 mb-2">
        <div className="text-xs text-text-dim font-bold mb-1">Clues:</div>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
          {wordPlacements.map((wp, idx) => {
            const isFound = foundWords.has(wp.word);
            return (
              <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full ${isFound ? 'bg-success/20 text-success line-through' : 'bg-card text-text-muted'}`}>
                {wp.clue} ({wp.word.length})
              </span>
            );
          })}
        </div>
      </div>

      {/* Letter keyboard */}
      <div className="flex flex-wrap justify-center gap-0.5 px-1 mb-1 max-w-sm">
        {LETTERS.map(l => (
          <button
            key={l}
            onPointerDown={(e) => { e.preventDefault(); inputLetter(l); }}
            className="w-7 h-7 bg-card hover:bg-card-hover rounded text-xs font-bold text-text active:scale-90 transition-transform"
          >
            {l}
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div className="text-center py-1 text-warning text-sm min-h-[24px]">{feedback}</div>
    </div>
  );
}

registerGame('crossword', {
  name: 'Crossword Puzzle',
  emoji: '✏️',
  description: 'Fill in the crossword grid using the clues!',
  category: 'sequence',
  stages: 20,
  component: CrosswordGame,
});

export default CrosswordGame;
