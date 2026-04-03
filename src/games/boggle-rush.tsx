import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const VALID_WORDS = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT',
  'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'DID',
  'LET', 'SAY', 'SHE', 'TOO', 'USE', 'RUN', 'CAT', 'DOG', 'SUN', 'FUN', 'HAT', 'BAT', 'CUP', 'MAP', 'PEN',
  'BOX', 'KEY', 'BIG', 'TOP', 'RED', 'BIG', 'HOT', 'COLD', 'TALL', 'FISH', 'BIRD', 'TREE', 'BOOK', 'LOVE',
  'PLAY', 'GAME', 'WORD', 'TIME', 'WORK', 'LIFE', 'HAND', 'HEAD', 'FOOT', 'EYES', 'NOSE', 'EARS', 'MOUTH',
  'WATER', 'FIRE', 'EARTH', 'WIND', 'RAIN', 'SNOW', 'SAND', 'ROCK', 'STAR', 'MOON', 'PLANET', 'SPACE',
  'MUSIC', 'DANCE', 'SONG', 'ART', 'COLOR', 'LIGHT', 'NIGHT', 'DREAM', 'THINK', 'LEARN', 'TEACH', 'READ',
  'WRITE', 'BUILD', 'MAKE', 'GROW', 'HELP', 'GIVE', 'TAKE', 'COME', 'GO', 'FIND', 'KEEP', 'KNOW', 'LOOK',
  'FEEL', 'HEAR', 'TASTE', 'SMELL', 'TOUCH', 'WALK', 'TALK', 'EAT', 'DRINK', 'SLEEP', 'JUMP', 'SWIM',
  'FLY', 'CLIMB', 'RUN', 'FAST', 'SLOW', 'HARD', 'SOFT', 'WARM', 'COOL', 'BRIGHT', 'DARK', 'LOUD', 'QUIET',
  'HAPPY', 'SAD', 'ANGRY', 'CALM', 'BRAVE', 'KIND', 'SMART', 'STRONG', 'GENTLE', 'PROUD', 'SHY', 'BOLD',
  'APPLE', 'BREAD', 'CHAIR', 'TABLE', 'HOUSE', 'SCHOOL', 'FRIEND', 'FAMILY', 'GARDEN', 'FLOWER', 'RIVER',
  'MOUNTAIN', 'OCEAN', 'FOREST', 'BRIDGE', 'CASTLE', 'ISLAND', 'KITTEN', 'PUPPY', 'BUNNY', 'TURTLE',
  'BALLOON', 'RAINBOW', 'BUTTER', 'FLYING', 'JUMPING', 'RUNNING', 'SINGING', 'DANCING', 'PLAYING',
  'THINKING', 'LEARNING', 'READING', 'WRITING', 'BUILDING', 'GROWING', 'HELPING', 'GIVING', 'TAKING',
  'COMING', 'GOING', 'FINDING', 'KEEPING', 'KNOWING', 'LOOKING', 'FEELING', 'HEARING', 'TASTING',
  'SMELLING', 'TOUCHING', 'WALKING', 'TALKING', 'EATING', 'DRINKING', 'SLEEPING', 'JUMPING', 'SWIMMING',
  'CLIMBING', 'FASTING', 'SLOWING', 'HARDEN', 'SOFTEN', 'WARMING', 'COOLING', 'BRIGHTEN', 'DARKEN',
  'LOUDEN', 'QUIET', 'HAPPY', 'SADDEN', 'ANGER', 'CALMING', 'BRAVER', 'KINDER', 'SMARTER', 'STRONGER',
]);

const VOWELS = 'AEIOU';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const LETTER_FREQ: [string, number][] = [
  ['E', 12], ['A', 9], ['I', 8], ['O', 8], ['N', 7], ['R', 7], ['T', 7], ['L', 5], ['S', 5], ['U', 5],
  ['D', 4], ['G', 3], ['B', 3], ['C', 3], ['M', 3], ['P', 3], ['F', 2], ['H', 2], ['W', 2], ['Y', 2],
  ['V', 1], ['K', 1], ['J', 1], ['X', 1], ['Q', 1], ['Z', 1],
];

const CONFIG: Record<number, { gridSize: number; time: number; targetWords: number }> = {
  1: { gridSize: 4, time: 60, targetWords: 3 },
  2: { gridSize: 4, time: 60, targetWords: 4 },
  3: { gridSize: 4, time: 70, targetWords: 5 },
  4: { gridSize: 4, time: 75, targetWords: 6 },
  5: { gridSize: 4, time: 80, targetWords: 7 },
  6: { gridSize: 5, time: 90, targetWords: 8 },
  7: { gridSize: 5, time: 90, targetWords: 10 },
  8: { gridSize: 5, time: 100, targetWords: 12 },
  9: { gridSize: 5, time: 100, targetWords: 14 },
  10: { gridSize: 5, time: 120, targetWords: 16 },
};

const TIPS = [
  '💡 Tip: Start with short words — 3-letter words are easiest to find!',
  '💡 Tip: Look for common letter pairs: TH, ER, ON, AN, RE.',
  '💡 Tip: Try to find prefixes (UN-, RE-) and suffixes (-ING, -ER).',
  '💡 Tip: Don\'t just go in straight lines — words can snake around!',
  '💡 Tip: Scan for vowels first, then build words around them.',
];

type Phase = 'intro' | 'playing' | 'done';

function weightedRandomLetter(): string {
  const total = LETTER_FREQ.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [letter, weight] of LETTER_FREQ) {
    r -= weight;
    if (r <= 0) return letter;
  }
  return 'E';
}

function generateGrid(size: number): string[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => weightedRandomLetter())
  );
}

function getScoreForLength(len: number): number {
  if (len <= 3) return 10;
  if (len === 4) return 20;
  if (len === 5) return 35;
  if (len === 6) return 50;
  return 50 + (len - 6) * 15;
}

function BoggleRushGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const tip = useRef(TIPS[Math.min(stage - 1, TIPS.length - 1)]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [grid, setGrid] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [wordCount, setWordCount] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastCell, setLastCell] = useState<[number, number] | null>(null);
  const [invalidFlash, setInvalidFlash] = useState(false);

  const gridRef = useRef<string[][]>([]);
  const scoreRef = useRef(0);
  const foundRef = useRef<Set<string>>(new Set());
  const wordCountRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback(() => {
    const g = generateGrid(config.gridSize);
    setGrid(g);
    gridRef.current = g;
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(config.time);
    setFeedback('');
    setCurrentWord('');
    setSelectedCells(new Set());
    setFoundWords(new Set());
    foundRef.current = new Set();
    setWordCount(0);
    wordCountRef.current = 0;
    setLastCell(null);
    setPhase('playing');
  }, [config]);

  const getCellKey = (r: number, c: number) => `${r}-${c}`;

  const isAdjacent = (r1: number, c1: number, r2: number, c2: number): boolean => {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return dr <= 1 && dc <= 1 && (dr + dc > 0);
  };

  const submitWord = useCallback((word: string) => {
    if (word.length < 3) {
      setInvalidFlash(true);
      setFeedback('Word must be at least 3 letters!');
      setTimeout(() => { setInvalidFlash(false); setFeedback(''); }, 1000);
      return;
    }

    if (foundRef.current.has(word)) {
      setFeedback(`Already found "${word}"!`);
      setTimeout(() => setFeedback(''), 1000);
      return;
    }

    if (VALID_WORDS.has(word)) {
      const pts = getScoreForLength(word.length);
      scoreRef.current += pts;
      wordCountRef.current++;
      foundRef.current.add(word);
      setScore(scoreRef.current);
      setWordCount(wordCountRef.current);
      setFoundWords(new Set(foundRef.current));
      onScore(pts);
      onProgress(Math.min(1, wordCountRef.current / config.targetWords));
      setFeedback(`✅ "${word}"! +${pts}`);

      if (wordCountRef.current >= config.targetWords) {
        const timeBonus = Math.floor(timeLeft / 2);
        scoreRef.current += timeBonus;
        setPhase('done');
        onEnd({
          score: scoreRef.current,
          stars: 3,
          summary: `Boggle Master! Found ${wordCountRef.current} words! Your vocabulary is amazing! 🏆`,
        });
      }
    } else {
      setInvalidFlash(true);
      setFeedback(`"${word}" is not a valid word. Try again!`);
      setTimeout(() => { setInvalidFlash(false); setFeedback(''); }, 1500);
    }
  }, [timeLeft, config.targetWords, onScore, onProgress, onEnd]);

  const getCellFromPointer = useCallback((clientX: number, clientY: number): [number, number] | null => {
    if (!gameAreaRef.current) return null;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cellSize = rect.width / config.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < config.gridSize && col >= 0 && col < config.gridSize) {
      return [row, col];
    }
    return null;
  }, [config.gridSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (cell) {
      setIsSelecting(true);
      const key = getCellKey(cell[0], cell[1]);
      setSelectedCells(new Set([key]));
      setCurrentWord(grid[cell[0]][cell[1]]);
      setLastCell(cell);
    }
  }, [phase, getCellFromPointer, grid]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isSelecting || !lastCell) return;
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    const key = getCellKey(cell[0], cell[1]);
    if (selectedCells.has(key)) return;

    if (!isAdjacent(lastCell[0], lastCell[1], cell[0], cell[1])) return;

    const newSelected = new Set(selectedCells);
    newSelected.add(key);
    setSelectedCells(newSelected);
    setCurrentWord(prev => prev + grid[cell[0]][cell[1]]);
    setLastCell(cell);
  }, [isSelecting, lastCell, selectedCells, grid, getCellFromPointer]);

  const handlePointerUp = useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);
    if (currentWord.length >= 3) {
      submitWord(currentWord);
    }
    setCurrentWord('');
    setSelectedCells(new Set());
    setLastCell(null);
  }, [isSelecting, currentWord, submitWord]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('done');
          const wc = wordCountRef.current;
          const stars = wc >= config.targetWords ? 3 : wc >= config.targetWords * 0.6 ? 2 : 1;
          onEnd({
            score: scoreRef.current,
            stars,
            summary: `Time's up! You found ${wc} words. ${wc >= 5 ? 'Great vocabulary!' : 'Keep practicing!'}`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, config.targetWords, onEnd]);

  const cellSize = Math.min(60, Math.floor(280 / config.gridSize));

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Boggle Rush</h2>
        <p className="text-text-dim mb-6 max-w-xs">Find as many words as you can by connecting adjacent letters!</p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="text-xl mb-2">🎯 Find {config.targetWords} words</div>
          <div className="text-info">{config.gridSize}×{config.gridSize} letter grid</div>
          <div className="text-warning mt-1">⏱️ {config.time} seconds</div>
          <div className="text-text-dim text-sm mt-2">Drag to connect letters. Min 3 letters per word.</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 📝
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-3 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-accent font-bold">Score: {score}</span>
        <span className="text-success">Words: {wordCount}/{config.targetWords}</span>
        <span className={`font-bold ${timeLeft <= 15 ? 'text-danger' : 'text-warning'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      {currentWord && (
        <div className={`text-2xl font-bold mb-2 min-h-[2rem] ${invalidFlash ? 'text-danger' : 'text-accent'}`}>
          {currentWord}
        </div>
      )}

      <div
        ref={gameAreaRef}
        className="bg-card rounded-xl p-2 select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          if (isSelecting) {
            if (currentWord.length >= 3) submitWord(currentWord);
            setCurrentWord('');
            setSelectedCells(new Set());
            setIsSelecting(false);
            setLastCell(null);
          }
        }}
        style={{ touchAction: 'none' }}
      >
        {grid.map((row, r) => (
          <div key={r} className="flex justify-center">
            {row.map((letter, c) => {
              const key = getCellKey(r, c);
              const isSelected = selectedCells.has(key);
              return (
                <div
                  key={c}
                  className="flex items-center justify-center font-bold rounded-lg transition-all"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    margin: 3,
                    fontSize: cellSize * 0.5,
                    background: isSelected ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isSelected ? 'var(--color-bg)' : 'var(--color-text)',
                    boxShadow: isSelected ? '0 0 12px var(--color-accent)' : '0 2px 4px rgba(0,0,0,0.3)',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {foundWords.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 max-w-[300px] justify-center">
          {Array.from(foundWords).slice(-8).map(w => (
            <span key={w} className="text-xs bg-surface text-success px-2 py-0.5 rounded-full">
              {w}
            </span>
          ))}
        </div>
      )}

      {feedback && (
        <div className="text-sm mt-2 text-center min-h-[22px]">{feedback}</div>
      )}
    </div>
  );
}

registerGame('boggle-rush', {
  name: 'Boggle Rush',
  emoji: '📝',
  description: 'Connect adjacent letters to form words — race against the clock!',
  category: 'focus',
  stages: 10,
  component: BoggleRushGame,
});

export default BoggleRushGame;
