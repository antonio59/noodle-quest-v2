import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

interface GridItem {
  id: number;
  emoji: string;
  row: number;
  col: number;
  found: boolean;
}

const EMOJI_SETS: Record<string, { target: string; distractors: string[] }> = {
  fruits: { target: '🍎', distractors: ['🍊', '🍋', '🍇', '🍒', '🍑', '🍓', '🫐', '🍌', '🥝'] },
  animals: { target: '🐱', distractors: ['🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'] },
  nature: { target: '🌸', distractors: ['🌺', '🌻', '🌹', '🌷', '💐', '🌼', '🪻', '🌿', '☘️'] },
  food: { target: '🍕', distractors: ['🍔', '🌮', '🍟', '🥪', '🍜', '🍣', '🥗', '🧁', '🍰'] },
  space: { target: '⭐', distractors: ['🌟', '✨', '💫', '🌙', '☀️', '🪐', '🌍', '🔭', '🚀'] },
  ocean: { target: '🐙', distractors: ['🦑', '🦐', '🦀', '🐚', '🐠', '🐡', '🦈', '🐬', '🐳'] },
  weather: { target: '⛈️', distractors: ['🌧️', '🌦️', '🌤️', '☀️', '❄️', '🌪️', '🌈', '💨', '☁️'] },
  sports: { target: '⚽', distractors: ['🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸'] },
};

const CONFIG: Record<number, { gridSize: number; targetCount: number; timeLimit: number; emojiSet: string; similarity: number; rounds: number }> = {
  1: { gridSize: 5, targetCount: 1, timeLimit: 30, emojiSet: 'fruits', similarity: 0, rounds: 5 },
  2: { gridSize: 5, targetCount: 1, timeLimit: 28, emojiSet: 'fruits', similarity: 0, rounds: 5 },
  3: { gridSize: 6, targetCount: 1, timeLimit: 25, emojiSet: 'animals', similarity: 0, rounds: 6 },
  4: { gridSize: 6, targetCount: 2, timeLimit: 25, emojiSet: 'animals', similarity: 0, rounds: 6 },
  5: { gridSize: 6, targetCount: 2, timeLimit: 23, emojiSet: 'nature', similarity: 0.3, rounds: 6 },
  6: { gridSize: 7, targetCount: 2, timeLimit: 22, emojiSet: 'nature', similarity: 0.3, rounds: 7 },
  7: { gridSize: 7, targetCount: 3, timeLimit: 20, emojiSet: 'food', similarity: 0.3, rounds: 7 },
  8: { gridSize: 7, targetCount: 3, timeLimit: 18, emojiSet: 'food', similarity: 0.5, rounds: 7 },
  9: { gridSize: 8, targetCount: 3, timeLimit: 18, emojiSet: 'space', similarity: 0.5, rounds: 8 },
  10: { gridSize: 8, targetCount: 4, timeLimit: 16, emojiSet: 'space', similarity: 0.5, rounds: 8 },
  11: { gridSize: 8, targetCount: 4, timeLimit: 15, emojiSet: 'ocean', similarity: 0.6, rounds: 8 },
  12: { gridSize: 8, targetCount: 5, timeLimit: 14, emojiSet: 'ocean', similarity: 0.6, rounds: 8 },
  13: { gridSize: 9, targetCount: 5, timeLimit: 13, emojiSet: 'weather', similarity: 0.6, rounds: 9 },
  14: { gridSize: 9, targetCount: 6, timeLimit: 12, emojiSet: 'weather', similarity: 0.7, rounds: 9 },
  15: { gridSize: 9, targetCount: 6, timeLimit: 11, emojiSet: 'sports', similarity: 0.7, rounds: 9 },
  16: { gridSize: 9, targetCount: 7, timeLimit: 10, emojiSet: 'sports', similarity: 0.7, rounds: 10 },
  17: { gridSize: 10, targetCount: 7, timeLimit: 10, emojiSet: 'fruits', similarity: 0.8, rounds: 10 },
  18: { gridSize: 10, targetCount: 8, timeLimit: 9, emojiSet: 'animals', similarity: 0.8, rounds: 10 },
  19: { gridSize: 10, targetCount: 8, timeLimit: 8, emojiSet: 'nature', similarity: 0.9, rounds: 10 },
  20: { gridSize: 10, targetCount: 10, timeLimit: 8, emojiSet: 'food', similarity: 0.9, rounds: 10 },
};

const TIPS = [
  "💡 Tip: Scan in a Z-pattern — left to right, then down and right to left!",
  "💡 Tip: Look for the unique shape, not just the color.",
  "💡 Tip: Don't stare — keep your eyes moving across the grid.",
  "💡 Tip: Focus on one row at a time to avoid missing items.",
  "💡 Tip: The target stands out more when you relax your eyes!",
];

function VisualSearchGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [items, setItems] = useState<GridItem[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const totalFoundRef = useRef(0);
  const roundRef = useRef(1);
  const targetCountRef = useRef(0);

  const generateGrid = useCallback((): GridItem[] => {
    const emojiSet = EMOJI_SETS[config.emojiSet];
    const totalCells = config.gridSize * config.gridSize;
    const targetCount = config.targetCount;
    targetCountRef.current = targetCount;

    let distractorPool = [...emojiSet.distractors];
    if (config.similarity > 0.5) {
      distractorPool = distractorPool.slice(0, Math.max(3, Math.floor(distractorPool.length * (1 - config.similarity * 0.5))));
    }

    const grid: GridItem[] = [];
    let idCounter = 0;

    const positions = Array.from({ length: totalCells }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(positions[i] / config.gridSize);
      const col = positions[i] % config.gridSize;

      if (i < targetCount) {
        grid.push({ id: idCounter++, emoji: emojiSet.target, row, col, found: false });
      } else {
        const distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)];
        grid.push({ id: idCounter++, emoji: distractor, row, col, found: false });
      }
    }

    return grid.sort((a, b) => a.row - b.row || a.col - b.col);
  }, [config]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    totalFoundRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setTotalFound(0);
    setFoundCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    setFeedback('');
    setItems(generateGrid());
    setPhase('playing');
  }, [config, generateGrid]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const stars = totalFoundRef.current >= 5 ? 3 : totalFoundRef.current >= 3 ? 2 : 1;
          const summary = `Time's up! You found ${totalFoundRef.current} targets total. Keep scanning systematically — row by row!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  const handleTap = useCallback((item: GridItem) => {
    if (!gameActiveRef.current || item.found) return;

    if (item.emoji === EMOJI_SETS[config.emojiSet].target) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, found: true } : i));
      const points = 25 + Math.floor(timeLeft);
      scoreRef.current += points;
      totalFoundRef.current++;
      setScore(scoreRef.current);
      setTotalFound(totalFoundRef.current);
      setFoundCount(prev => prev + 1);
      onScore(points);
      setFeedback(`🎯 Found one! +${points}`);
      setFeedbackColor('#4ade80');

      if (foundCount + 1 >= targetCountRef.current) {
        setTimeout(() => {
          if (!gameActiveRef.current) return;
          roundRef.current++;
          setRound(roundRef.current);
          onProgress(roundRef.current / config.rounds);

          if (roundRef.current > config.rounds) {
            gameActiveRef.current = false;
            const stars = totalFoundRef.current >= config.rounds * 1.5 ? 3 : totalFoundRef.current >= config.rounds ? 2 : 1;
            const timeBonus = Math.floor(timeLeft * 5);
            scoreRef.current += timeBonus;
            const summary = `You found ${totalFoundRef.current} targets across ${roundRef.current - 1} rounds! Eagle eyes! 🦅`;
            onEnd({ score: scoreRef.current, stars, summary });
          } else {
            setFoundCount(0);
            setItems(generateGrid());
            setTimeLeft(config.timeLimit);
            setFeedback(`Round ${roundRef.current}! Find ${config.targetCount} more!`);
            setTimeout(() => setFeedback(''), 1500);
          }
        }, 800);
      }
    } else {
      const penalty = 5;
      scoreRef.current = Math.max(0, scoreRef.current - penalty);
      setScore(scoreRef.current);
      setFeedback(`❌ That's not it! Looking for ${EMOJI_SETS[config.emojiSet].target}`);
      setFeedbackColor('#ff6e6c');
      setTimeout(() => setFeedback(''), 1000);
    }
  }, [config, timeLeft, foundCount, onScore, onProgress, onEnd, generateGrid]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-orange-400 mb-2">Visual Search</h2>
        <p className="text-orange-300 mb-4 max-w-xs">Find the hidden target among the crowd!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-4xl mb-2">Find: {EMOJI_SETS[config.emojiSet].target}</div>
          <div className="text-cyan-300">{config.gridSize}×{config.gridSize} grid</div>
          <div className="text-yellow-400 mt-1">Find {config.targetCount} target{config.targetCount > 1 ? 's' : ''}!</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-purple-300 text-sm">5 rounds per game • Tap the correct emoji!</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🔍
        </button>
      </div>
    );
  }

  const cellSize = config.gridSize > 8 ? 32 : config.gridSize > 6 ? 38 : 44;
  const emojiSize = config.gridSize > 8 ? 18 : config.gridSize > 6 ? 22 : 26;

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center p-2">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-2 w-full justify-center">
        <span className="text-orange-400 font-bold">Round: {round}/{config.rounds}</span>
        <span className="text-green-400">Found: {foundCount}/{targetCountRef.current}</span>
        <span className="text-purple-400">Total: {totalFound}</span>
        <span className="text-yellow-400">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      <div className="text-sm text-cyan-300 mb-2">
        Find: <span className="text-2xl">{EMOJI_SETS[config.emojiSet].target}</span>
      </div>

      <div
        className="grid gap-0.5 p-2 bg-[#232146] rounded-xl"
        style={{ gridTemplateColumns: `repeat(${config.gridSize}, ${cellSize}px)` }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => { e.stopPropagation(); handleTap(item); }}
            className={`flex items-center justify-center select-none cursor-pointer transition-all rounded
              ${item.found ? 'bg-green-500/30 scale-90' : 'bg-[#1a1833] hover:bg-[#2a2850] active:scale-90'}
            `}
            style={{ width: cellSize, height: cellSize, fontSize: emojiSize }}
          >
            {item.found ? '✅' : item.emoji}
          </div>
        ))}
      </div>

      <div className="text-lg font-bold min-h-[28px] mt-2 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('visual-search', {
  name: 'Visual Search',
  emoji: '🔍',
  description: 'Find the hidden target emoji among the crowd!',
  category: 'focus',
  stages: 20,
  component: VisualSearchGame,
});

export default VisualSearchGame;
