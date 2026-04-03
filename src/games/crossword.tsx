import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';

interface Cell {
  row: number;
  col: number;
  letter: string;
  revealed: boolean;
  correct: boolean;
}

interface WordPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

const CONFIG: Record<number, { gridSize: number; wordCount: number; timeLimit: number; wordList: { word: string; clue: string }[] }> = {
  1: { gridSize: 5, wordCount: 4, timeLimit: 120, wordList: [
    { word: 'CAT', clue: 'A furry pet that purrs' },
    { word: 'DOG', clue: 'A loyal pet that barks' },
    { word: 'SUN', clue: 'Shines in the sky during day' },
    { word: 'HAT', clue: 'You wear this on your head' },
  ]},
  2: { gridSize: 5, wordCount: 4, timeLimit: 115, wordList: [
    { word: 'BAT', clue: 'Flies at night, uses echo' },
    { word: 'CUP', clue: 'You drink from this' },
    { word: 'RUN', clue: 'Move faster than walking' },
    { word: 'BIG', clue: 'Opposite of small' },
  ]},
  3: { gridSize: 5, wordCount: 5, timeLimit: 110, wordList: [
    { word: 'FISH', clue: 'Lives in water, has fins' },
    { word: 'TREE', clue: 'Tall plant with leaves' },
    { word: 'BOOK', clue: 'You read this for stories' },
    { word: 'STAR', clue: 'Twinkles in the night sky' },
    { word: 'MOON', clue: 'Glows at night in the sky' },
  ]},
  4: { gridSize: 5, wordCount: 5, timeLimit: 105, wordList: [
    { word: 'BIRD', clue: 'Has feathers and wings' },
    { word: 'CAKE', clue: 'Sweet treat for birthdays' },
    { word: 'RAIN', clue: 'Water falling from clouds' },
    { word: 'FROG', clue: 'Green amphibian that hops' },
    { word: 'MILK', clue: 'White drink from cows' },
  ]},
  5: { gridSize: 6, wordCount: 5, timeLimit: 100, wordList: [
    { word: 'PIANO', clue: 'Musical instrument with keys' },
    { word: 'TIGER', clue: 'Big striped wild cat' },
    { word: 'OCEAN', clue: 'Vast body of salt water' },
    { word: 'BREAD', clue: 'Baked food made from flour' },
    { word: 'CLOUD', clue: 'White fluffy thing in sky' },
  ]},
  6: { gridSize: 6, wordCount: 6, timeLimit: 95, wordList: [
    { word: 'DANCE', clue: 'Moving to music' },
    { word: 'FRUIT', clue: 'Apple, banana, orange are these' },
    { word: 'HOUSE', clue: 'Where people live' },
    { word: 'NIGHT', clue: 'When the sun goes down' },
    { word: 'SMILE', clue: 'What your face does when happy' },
    { word: 'WATER', clue: 'Clear liquid we drink' },
  ]},
  7: { gridSize: 6, wordCount: 6, timeLimit: 90, wordList: [
    { word: 'PLANET', clue: 'Earth is one of these' },
    { word: 'FLOWER', clue: 'Colorful part of a plant' },
    { word: 'GARDEN', clue: 'Place where plants grow' },
    { word: 'SUMMER', clue: 'Hottest season of the year' },
    { word: 'SCHOOL', clue: 'Place where you learn' },
    { word: 'FAMILY', clue: 'People related to you' },
  ]},
  8: { gridSize: 7, wordCount: 6, timeLimit: 90, wordList: [
    { word: 'DOCTOR', clue: 'Helps sick people get better' },
    { word: 'FOREST', clue: 'Large area full of trees' },
    { word: 'BRIDGE', clue: 'Crosses over a river' },
    { word: 'CASTLE', clue: 'Where a king or queen lives' },
    { word: 'PENCIL', clue: 'Used for writing and drawing' },
    { word: 'WINTER', clue: 'Coldest season with snow' },
  ]},
  9: { gridSize: 7, wordCount: 7, timeLimit: 85, wordList: [
    { word: 'ISLAND', clue: 'Land surrounded by water' },
    { word: 'JUNGLE', clue: 'Dense tropical forest' },
    { word: 'KITTEN', clue: 'A baby cat' },
    { word: 'MUSEUM', clue: 'Place to see old things' },
    { word: 'PUZZLE', clue: 'A game that tests your mind' },
    { word: 'ROCKET', clue: 'Flies to space' },
    { word: 'SILVER', clue: 'Shiny grey precious metal' },
  ]},
  10: { gridSize: 7, wordCount: 7, timeLimit: 80, wordList: [
    { word: 'TEACHER', clue: 'Helps students learn' },
    { word: 'BALLOON', clue: 'Floats when filled with air' },
    { word: 'CAPTAIN', clue: 'Leader of a ship' },
    { word: 'DIAMOND', clue: 'Hardest natural gemstone' },
    { word: 'EAGLE', clue: 'Majestic bird of prey' },
    { word: 'FESTIVAL', clue: 'A big celebration event' },
    { word: 'GUITAR', clue: 'String instrument you strum' },
  ]},
  11: { gridSize: 8, wordCount: 7, timeLimit: 80, wordList: [
    { word: 'ADVENTURE', clue: 'An exciting experience' },
    { word: 'BUTTERFLY', clue: 'Insect with colorful wings' },
    { word: 'CHOCOLATE', clue: 'Sweet brown treat' },
    { word: 'DINOSAUR', clue: 'Ancient giant reptile' },
    { word: 'ELEPHANT', clue: 'Largest land animal' },
    { word: 'FIREWORK', clue: 'Colorful explosion in sky' },
    { word: 'GALAXY', clue: 'Huge group of stars' },
  ]},
  12: { gridSize: 8, wordCount: 8, timeLimit: 75, wordList: [
    { word: 'HARMONY', clue: 'Pleasant combination of sounds' },
    { word: 'IMAGINE', clue: 'Picture something in your mind' },
    { word: 'JOURNEY', clue: 'A long trip somewhere' },
    { word: 'KNOWLEDGE', clue: 'What you learn from study' },
    { word: 'LIBRARY', clue: 'Place full of books' },
    { word: 'MOUNTAIN', clue: 'Very tall natural hill' },
    { word: 'NOTEBOOK', clue: 'Book for writing notes' },
    { word: 'ORANGE', clue: 'Round citrus fruit and color' },
  ]},
  13: { gridSize: 8, wordCount: 8, timeLimit: 70, wordList: [
    { word: 'PAINTING', clue: 'Art made with brush and paint' },
    { word: 'QUESTION', clue: 'Something you ask for info' },
    { word: 'RAINBOW', clue: 'Arc of colors after rain' },
    { word: 'SNOWFLAKE', clue: 'Unique ice crystal from sky' },
    { word: 'TREASURE', clue: 'Valuable hidden riches' },
    { word: 'UMBRELLA', clue: 'Keeps you dry in rain' },
    { word: 'VACATION', clue: 'Time off from work or school' },
    { word: 'WONDER', clue: 'Feeling of amazement' },
  ]},
  14: { gridSize: 9, wordCount: 8, timeLimit: 70, wordList: [
    { word: 'XYLOPHONE', clue: 'Musical instrument with bars' },
    { word: 'YELLOW', clue: 'Color of bananas and lemons' },
    { word: 'ZEBRA', clue: 'Striped horse-like animal' },
    { word: 'BALANCE', clue: 'Staying steady and not falling' },
    { word: 'CAMPFIRE', clue: 'Outdoor fire for warmth' },
    { word: 'DOLPHIN', clue: 'Smart friendly sea mammal' },
    { word: 'EXPLORE', clue: 'Travel to discover new things' },
    { word: 'FEATHER', clue: 'Light covering on birds' },
  ]},
  15: { gridSize: 9, wordCount: 9, timeLimit: 65, wordList: [
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
  16: { gridSize: 9, wordCount: 9, timeLimit: 60, wordList: [
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
  17: { gridSize: 9, wordCount: 10, timeLimit: 55, wordList: [
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
  18: { gridSize: 9, wordCount: 10, timeLimit: 50, wordList: [
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
  19: { gridSize: 9, wordCount: 10, timeLimit: 45, wordList: [
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
  20: { gridSize: 9, wordCount: 10, timeLimit: 40, wordList: [
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
  "💡 Tip: Start with the shortest words — they're easiest to place!",
  "💡 Tip: Look for crossing letters between words to help you!",
  "💡 Tip: Read all clues first before filling in any answers.",
  "💡 Tip: If stuck, try a different word and come back later.",
  "💡 Tip: Letters that appear often (E, A, T, S) are good starting points.",
];

function CrosswordGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [placements, setPlacements] = useState<WordPlacement[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [feedback, setFeedback] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const wordsFoundRef = useRef(0);

  const buildGrid = useCallback((): { grid: Cell[][]; placements: WordPlacement[] } => {
    const size = config.gridSize;
    const emptyGrid: Cell[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => ({
        row: r, col: c, letter: '', revealed: false, correct: false,
      }))
    );

    const words = config.wordList.slice(0, config.wordCount);
    const placed: WordPlacement[] = [];

    const canPlace = (word: string, row: number, col: number, dir: 'across' | 'down'): boolean => {
      if (dir === 'across') {
        if (col + word.length > size) return false;
        if (col > 0 && emptyGrid[row][col - 1].letter !== '') return false;
        if (col + word.length < size && emptyGrid[row][col + word.length].letter !== '') return false;
        for (let i = 0; i < word.length; i++) {
          const cell = emptyGrid[row][col + i];
          if (cell.letter !== '' && cell.letter !== word[i]) return false;
        }
        return true;
      } else {
        if (row + word.length > size) return false;
        if (row > 0 && emptyGrid[row - 1][col].letter !== '') return false;
        if (row + word.length < size && emptyGrid[row + word.length][col].letter !== '') return false;
        for (let i = 0; i < word.length; i++) {
          const cell = emptyGrid[row + i][col];
          if (cell.letter !== '' && cell.letter !== word[i]) return false;
        }
        return true;
      }
    };

    const placeWord = (word: string, clue: string, row: number, col: number, dir: 'across' | 'down') => {
      for (let i = 0; i < word.length; i++) {
        const r = dir === 'down' ? row + i : row;
        const c = dir === 'across' ? col + i : col;
        emptyGrid[r][c].letter = word[i];
      }
      placed.push({ word, clue, row, col, direction: dir });
    };

    const dirs: ('across' | 'down')[] = ['across', 'down'];
    for (const w of words) {
      let placedWord = false;
      for (let attempt = 0; attempt < 200 && !placedWord; attempt++) {
        const dir = dirs[Math.floor(Math.random() * 2)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        if (canPlace(w.word, row, col, dir)) {
          placeWord(w.word, w.clue, row, col, dir);
          placedWord = true;
        }
      }
    }

    return { grid: emptyGrid, placements: placed };
  }, [config]);

  const startGame = useCallback(() => {
    const { grid: newGrid, placements: newPlacements } = buildGrid();
    setGrid(newGrid);
    setPlacements(newPlacements);
    setScore(0);
    setWordsFound(0);
    setTimeLeft(config.timeLimit);
    setFeedback('');
    setSelectedCell(null);
    setActiveWordIdx(0);
    scoreRef.current = 0;
    wordsFoundRef.current = 0;
    gameActiveRef.current = true;
    setPhase('playing');
  }, [buildGrid, config]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const stars = wordsFoundRef.current >= config.wordCount ? 3 : wordsFoundRef.current >= config.wordCount * 0.6 ? 2 : 1;
          const summary = `Time's up! You found ${wordsFoundRef.current}/${config.wordCount} words. Try reading all clues first next time!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  const handleCellInput = useCallback((row: number, col: number, letter: string) => {
    if (!gameActiveRef.current) return;
    const upperLetter = letter.toUpperCase();
    setGrid(prev => prev.map(r => r.map(c =>
      c.row === row && c.col === col ? { ...c, revealed: true } : c
    )));

    const cell = grid[row]?.[col];
    if (cell && cell.letter === upperLetter) {
      setScore(prev => prev + 5);
      scoreRef.current += 5;
      onScore(5);
      setFeedback('✅ Correct letter!');
      setTimeout(() => setFeedback(''), 1000);
    } else if (cell && cell.letter !== '') {
      setFeedback('❌ Wrong letter!');
      setTimeout(() => setFeedback(''), 1000);
    }
  }, [grid, onScore]);

  const checkWordComplete = useCallback((placement: WordPlacement) => {
    let allCorrect = true;
    for (let i = 0; i < placement.word.length; i++) {
      const r = placement.direction === 'down' ? placement.row + i : placement.row;
      const c = placement.direction === 'across' ? placement.col + i : placement.col;
      const cell = grid[r]?.[c];
      if (!cell || !cell.revealed || cell.letter === '') {
        allCorrect = false;
        break;
      }
    }
    return allCorrect;
  }, [grid]);

  const selectCell = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
    setInputValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell || !gameActiveRef.current) return;
    const { row, col } = selectedCell;

    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      handleCellInput(row, col, e.key);
      // Move to next cell in active word
      const activeWord = placements[activeWordIdx];
      if (activeWord) {
        const idx = activeWord.direction === 'across'
          ? col - activeWord.col
          : row - activeWord.row;
        if (idx < activeWord.word.length - 1) {
          const nextRow = activeWord.direction === 'down' ? row + 1 : row;
          const nextCol = activeWord.direction === 'across' ? col + 1 : col;
          setSelectedCell({ row: nextRow, col: nextCol });
        }
      }
    } else if (e.key === 'Backspace') {
      setGrid(prev => prev.map(r => r.map(c =>
        c.row === row && c.col === col ? { ...c, revealed: false } : c
      )));
    } else if (e.key === 'ArrowRight' && col < grid.length - 1) {
      setSelectedCell({ row, col: col + 1 });
    } else if (e.key === 'ArrowLeft' && col > 0) {
      setSelectedCell({ row, col: col - 1 });
    } else if (e.key === 'ArrowDown' && row < grid.length - 1) {
      setSelectedCell({ row: row + 1, col });
    } else if (e.key === 'ArrowUp' && row > 0) {
      setSelectedCell({ row: row - 1, col });
    }
  }, [selectedCell, handleCellInput, placements, activeWordIdx, grid]);

  useEffect(() => {
    if (phase !== 'playing') return;
    for (const placement of placements) {
      if (checkWordComplete(placement)) {
        const alreadyCounted = wordsFoundRef.current > 0;
        wordsFoundRef.current++;
        setWordsFound(wordsFoundRef.current);
        const points = placement.word.length * 15;
        scoreRef.current += points;
        setScore(scoreRef.current);
        onScore(points);
        onProgress(wordsFoundRef.current / config.wordCount);
        setFeedback(`🎉 "${placement.word}" found! +${points}`);
        setTimeout(() => setFeedback(''), 2000);

        if (wordsFoundRef.current >= config.wordCount) {
          gameActiveRef.current = false;
          const timeBonus = Math.floor(timeLeft / 5);
          scoreRef.current += timeBonus;
          const stars = timeLeft > config.timeLimit * 0.5 ? 3 : timeLeft > config.timeLimit * 0.25 ? 2 : 1;
          const summary = `All ${config.wordCount} words found! Amazing vocabulary! 🏆 Time bonus: +${timeBonus}`;
          setTimeout(() => onEnd({ score: scoreRef.current, stars, summary }), 1500);
        }
        break;
      }
    }
  }, [grid, placements, checkWordComplete, config, onScore, onProgress, onEnd, timeLeft]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">✏️</div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Crossword Puzzle</h2>
        <p className="text-cyan-300 mb-4 max-w-xs">Fill in the grid using the clues!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl mb-2">📝 {config.wordCount} words to find</div>
          <div className="text-yellow-400">{config.gridSize}×{config.gridSize} grid</div>
          <div className="text-green-400 mt-1">⏱️ {config.timeLimit} seconds</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-purple-300 text-sm">Tap a cell, then type a letter!</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! ✏️
        </button>
      </div>
    );
  }

  const cellSize = config.gridSize > 7 ? 36 : config.gridSize > 5 ? 42 : 50;

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-3 w-full justify-center">
        <span className="text-cyan-400 font-bold">Words: {wordsFound}/{config.wordCount}</span>
        <span className="text-purple-400">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl px-2">
        <div
          className="grid gap-0.5 p-2 bg-[#232146] rounded-xl"
          style={{ gridTemplateColumns: `repeat(${config.gridSize}, ${cellSize}px)` }}
        >
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
              const hasLetter = cell.letter !== '';
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onPointerDown={(e) => { e.stopPropagation(); selectCell(rIdx, cIdx); }}
                  className={`flex items-center justify-center font-mono font-bold text-lg select-none cursor-pointer transition-all
                    ${hasLetter ? 'bg-purple-500/30' : 'bg-[#1a1833]'}
                    ${isSelected ? 'ring-2 ring-yellow-400' : ''}
                  `}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {cell.revealed ? cell.letter : ''}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-cyan-300 font-bold mb-2">Clues:</div>
          <div className="space-y-1 max-h-[250px] overflow-y-auto">
            {placements.map((p, idx) => (
              <button
                key={idx}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setActiveWordIdx(idx);
                  setSelectedCell({ row: p.row, col: p.col });
                }}
                className={`w-full text-left text-xs p-2 rounded-lg transition-colors
                  ${idx === activeWordIdx ? 'bg-purple-600/40' : 'bg-[#232146] hover:bg-[#2a2850]'}`}
              >
                <span className="text-yellow-400 font-bold">{p.direction === 'across' ? '→' : '↓'} </span>
                <span className="text-purple-300">{p.clue}</span>
                <span className="text-gray-500 ml-1">({p.word.length})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center py-2 text-yellow-400 text-sm min-h-[24px]">{feedback}</div>
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
