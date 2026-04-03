import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

interface PuzzleSet {
  items: string[];
  oddIndex: number;
  category: string;
  reason: string;
}

const TIPS = [
  "💡 Tip: Look for the category first — what do 3 of them have in common?",
  "💡 Tip: The odd one out is often a different type of thing entirely!",
  "💡 Tip: Check for colour, shape, or function differences.",
  "💡 Tip: If stuck, ask yourself: 'Which one would NOT go in the same drawer?'",
  "💡 Tip: Speed increases each stage — trust your first instinct!",
];

const PUZZLE_BANK: PuzzleSet[] = [
  { items: ['🍎', '🍊', '🍋', '🚗'], oddIndex: 3, category: 'Fruits', reason: 'Not a fruit' },
  { items: ['🐶', '🐱', '🐭', '🌳'], oddIndex: 3, category: 'Animals', reason: 'Not an animal' },
  { items: ['🔴', '🟢', '🔵', '⭐'], oddIndex: 3, category: 'Shapes', reason: 'Not a circle' },
  { items: ['🏠', '🏢', '🏰', '🌊'], oddIndex: 3, category: 'Buildings', reason: 'Not a building' },
  { items: ['✈️', '🚗', '🚂', '🍕'], oddIndex: 3, category: 'Transport', reason: 'Not transport' },
  { items: ['🎸', '🥁', '🎺', '📚'], oddIndex: 3, category: 'Instruments', reason: 'Not an instrument' },
  { items: ['👟', '🥾', '👢', '🎩'], oddIndex: 3, category: 'Footwear', reason: 'Not footwear' },
  { items: ['🌞', '🌙', '⭐', '🍎'], oddIndex: 3, category: 'Sky', reason: 'Not in the sky' },
  { items: ['📱', '💻', '📺', '🌸'], oddIndex: 3, category: 'Devices', reason: 'Not a device' },
  { items: ['🍕', '🍔', '🌮', '📖'], oddIndex: 3, category: 'Food', reason: 'Not food' },
  { items: ['⚽', '🏀', '🎾', '🎨'], oddIndex: 3, category: 'Balls', reason: 'Not a ball' },
  { items: ['🦁', '🐯', '🐻', '🐟'], oddIndex: 3, category: 'Land animals', reason: 'Lives in water' },
  { items: ['🥕', '🥦', '🌽', '🍰'], oddIndex: 3, category: 'Vegetables', reason: 'Not a vegetable' },
  { items: ['🟥', '🟧', '🟨', '🟦'], oddIndex: 3, category: 'Warm colors', reason: 'Cool color' },
  { items: ['👨', '👩', '👶', '🤖'], oddIndex: 3, category: 'People', reason: 'Not a person' },
  { items: ['🌧️', '❄️', '🌪️', '🎂'], oddIndex: 3, category: 'Weather', reason: 'Not weather' },
  { items: ['🎹', '🎸', '🎻', '🎮'], oddIndex: 3, category: 'Instruments', reason: 'Not an instrument' },
  { items: ['🐝', '🦋', '🐛', '🐘'], oddIndex: 3, category: 'Insects', reason: 'Not an insect' },
  { items: ['🏊', '🏃', '🚴', '😴'], oddIndex: 3, category: 'Exercise', reason: 'Not exercise' },
  { items: ['2️⃣', '4️⃣', '6️⃣', '3️⃣'], oddIndex: 3, category: 'Even numbers', reason: 'Odd number' },
  { items: ['🍎', '🍓', '🫐', '🍌'], oddIndex: 3, category: 'Red/Blue fruits', reason: 'Yellow fruit' },
  { items: ['🐄', '🐑', '🐖', '🦈'], oddIndex: 3, category: 'Farm animals', reason: 'Ocean animal' },
  { items: ['🎂', '🍰', '🧁', '🥩'], oddIndex: 3, category: 'Desserts', reason: 'Not a dessert' },
  { items: ['🔨', '🪛', '🔧', '🎈'], oddIndex: 3, category: 'Tools', reason: 'Not a tool' },
  { items: ['📝', '✏️', '🖊️', '🔑'], oddIndex: 3, category: 'Writing', reason: 'Not for writing' },
  { items: ['🌍', '🌏', '🌎', '🌕'], oddIndex: 3, category: 'Earth', reason: 'Not Earth' },
  { items: ['👑', '💍', '📿', '🧲'], oddIndex: 3, category: 'Jewellery', reason: 'Not jewellery' },
  { items: ['🚒', '🚑', '🚓', '🚲'], oddIndex: 3, category: 'Emergency', reason: 'Not emergency' },
  { items: ['🧊', '❄️', '⛄', '🔥'], oddIndex: 3, category: 'Cold things', reason: 'Hot thing' },
  { items: ['🐸', '🐊', '🦎', '🐇'], oddIndex: 3, category: 'Reptiles', reason: 'Not a reptile' },
];

const CONFIG: Record<number, { itemCount: number; timeLimit: number; rounds: number; showTime: number }> = {
  1: { itemCount: 4, timeLimit: 60, rounds: 6, showTime: 0 },
  2: { itemCount: 4, timeLimit: 55, rounds: 6, showTime: 0 },
  3: { itemCount: 4, timeLimit: 50, rounds: 8, showTime: 0 },
  4: { itemCount: 4, timeLimit: 45, rounds: 8, showTime: 0 },
  5: { itemCount: 4, timeLimit: 42, rounds: 8, showTime: 0 },
  6: { itemCount: 4, timeLimit: 40, rounds: 10, showTime: 0 },
  7: { itemCount: 4, timeLimit: 38, rounds: 10, showTime: 0 },
  8: { itemCount: 4, timeLimit: 35, rounds: 10, showTime: 0 },
  9: { itemCount: 4, timeLimit: 33, rounds: 12, showTime: 0 },
  10: { itemCount: 4, timeLimit: 30, rounds: 12, showTime: 0 },
  11: { itemCount: 4, timeLimit: 28, rounds: 12, showTime: 0 },
  12: { itemCount: 4, timeLimit: 26, rounds: 14, showTime: 0 },
  13: { itemCount: 4, timeLimit: 25, rounds: 14, showTime: 0 },
  14: { itemCount: 4, timeLimit: 23, rounds: 14, showTime: 0 },
  15: { itemCount: 4, timeLimit: 22, rounds: 16, showTime: 0 },
  16: { itemCount: 4, timeLimit: 20, rounds: 16, showTime: 0 },
  17: { itemCount: 4, timeLimit: 18, rounds: 18, showTime: 0 },
  18: { itemCount: 4, timeLimit: 17, rounds: 18, showTime: 0 },
  19: { itemCount: 4, timeLimit: 15, rounds: 20, showTime: 0 },
  20: { itemCount: 4, timeLimit: 14, rounds: 20, showTime: 0 },
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function OddOneOutGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [currentPuzzle, setCurrentPuzzle] = useState<{ items: string[]; oddIdx: number; reason: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);
  const usedRef = useRef<Set<number>>(new Set());

  const generatePuzzle = useCallback(() => {
    if (usedRef.current.size >= PUZZLE_BANK.length) {
      usedRef.current = new Set();
    }
    let idx: number;
    do {
      idx = Math.floor(Math.random() * PUZZLE_BANK.length);
    } while (usedRef.current.has(idx) && usedRef.current.size < PUZZLE_BANK.length);
    usedRef.current.add(idx);

    const puzzle = PUZZLE_BANK[idx];
    const shuffled = shuffleArray(puzzle.items.map((item, i) => ({ item, isOdd: i === puzzle.oddIndex })));
    const oddIdx = shuffled.findIndex(s => s.isOdd);
    setCurrentPuzzle({ items: shuffled.map(s => s.item), oddIdx, reason: puzzle.reason });
    setPhase('playing');
    setFeedback('');
  }, []);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 1;
    usedRef.current = new Set();
    setScore(0);
    setCorrectCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    setFeedback('');
    generatePuzzle();
  }, [config, generatePuzzle]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          onEnd({ score: scoreRef.current, stars, summary: `Time's up! ${correctRef.current}/${roundRef.current - 1} correct. Look for what doesn't belong!` });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onEnd]);

  const handleTap = useCallback((idx: number) => {
    if (phase !== 'playing' || !gameActiveRef.current || !currentPuzzle) return;

    if (idx === currentPuzzle.oddIdx) {
      const points = 20 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! ${currentPuzzle.reason} +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ Nope! The odd one was ${currentPuzzle.items[currentPuzzle.oddIdx]} — ${currentPuzzle.reason}`);
      setFeedbackColor('#ff6e6c');
    }

    setPhase('feedback');
    setTimeout(() => {
      if (!gameActiveRef.current) return;
      roundRef.current++;
      setRound(roundRef.current);
      onProgress(roundRef.current / config.rounds);

      if (roundRef.current > config.rounds) {
        gameActiveRef.current = false;
        const accuracy = correctRef.current / config.rounds;
        const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
        const summary = accuracy > 0.8
          ? `Pattern master! ${correctRef.current}/${config.rounds} correct! You spot differences like a hawk! 🦅`
          : `You found ${correctRef.current}/${config.rounds} odd ones. Look for what doesn't fit the group!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        generatePuzzle();
      }
    }, 1200);
  }, [phase, currentPuzzle, timeLeft, config, onScore, onProgress, onEnd, generatePuzzle]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Odd One Out</h2>
        <p className="text-text-dim mb-4 max-w-xs">Which one doesn't belong? Tap the odd one!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl mb-2">🍎 🍊 🍋 🚗</div>
          <div className="text-success">The car doesn't belong!</div>
          <div className="text-warning mt-1">{config.rounds} rounds - ⏱️ {config.timeLimit}s</div>
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Game! 🤔
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-card rounded-xl mb-6 w-full justify-center">
        <span className="text-accent font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-success">✅ {correctCount}</span>
        <span className="text-primary">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-warning'}`}>⏱️ {timeLeft}</span>
      </div>

      <div className="text-text-dim text-sm mb-4">Which one doesn't belong?</div>

      {currentPuzzle && (
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          {currentPuzzle.items.map((item, idx) => (
            <button
              key={idx}
              onPointerDown={(e) => { e.stopPropagation(); handleTap(idx); }}
              className="w-24 h-24 rounded-2xl bg-card hover:bg-card-hover text-5xl flex items-center justify-center active:scale-90 transition-all border-2 border-white/10 hover:border-accent/50"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <div className="text-lg font-bold min-h-[28px] mt-6 text-center max-w-xs" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('odd-one-out', {
  name: 'Odd One Out',
  emoji: '🤔',
  description: 'Spot which one doesn\'t belong in the group!',
  category: 'focus',
  stages: 20,
  component: OddOneOutGame,
});

export default OddOneOutGame;
