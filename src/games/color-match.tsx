import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

interface ColorOption {
  name: string;
  display: string;
}

const COLORS: ColorOption[] = [
  { name: 'RED', display: '#ef4444' },
  { name: 'BLUE', display: '#3b82f6' },
  { name: 'GREEN', display: '#22c55e' },
  { name: 'YELLOW', display: '#eab308' },
  { name: 'PURPLE', display: '#a855f7' },
  { name: 'ORANGE', display: '#f97316' },
  { name: 'PINK', display: '#ec4899' },
  { name: 'CYAN', display: '#06b6d4' },
];

const CONFIG: Record<number, { colorCount: number; timeLimit: number; rounds: number; showTime: number; distractors: number }> = {
  1: { colorCount: 3, timeLimit: 45, rounds: 8, showTime: 3000, distractors: 0 },
  2: { colorCount: 3, timeLimit: 42, rounds: 8, showTime: 2800, distractors: 0 },
  3: { colorCount: 4, timeLimit: 40, rounds: 10, showTime: 2500, distractors: 0 },
  4: { colorCount: 4, timeLimit: 38, rounds: 10, showTime: 2300, distractors: 0 },
  5: { colorCount: 5, timeLimit: 35, rounds: 10, showTime: 2000, distractors: 0 },
  6: { colorCount: 5, timeLimit: 33, rounds: 12, showTime: 1800, distractors: 0 },
  7: { colorCount: 6, timeLimit: 30, rounds: 12, showTime: 1600, distractors: 0 },
  8: { colorCount: 6, timeLimit: 28, rounds: 12, showTime: 1400, distractors: 0 },
  9: { colorCount: 6, timeLimit: 26, rounds: 14, showTime: 1200, distractors: 0 },
  10: { colorCount: 7, timeLimit: 25, rounds: 14, showTime: 1000, distractors: 0 },
  11: { colorCount: 7, timeLimit: 23, rounds: 14, showTime: 900, distractors: 0 },
  12: { colorCount: 7, timeLimit: 22, rounds: 15, showTime: 800, distractors: 0 },
  13: { colorCount: 8, timeLimit: 20, rounds: 15, showTime: 700, distractors: 0 },
  14: { colorCount: 8, timeLimit: 18, rounds: 15, showTime: 600, distractors: 0 },
  15: { colorCount: 8, timeLimit: 17, rounds: 16, showTime: 500, distractors: 0 },
  16: { colorCount: 8, timeLimit: 16, rounds: 16, showTime: 450, distractors: 0 },
  17: { colorCount: 8, timeLimit: 15, rounds: 18, showTime: 400, distractors: 0 },
  18: { colorCount: 8, timeLimit: 14, rounds: 18, showTime: 350, distractors: 0 },
  19: { colorCount: 8, timeLimit: 12, rounds: 20, showTime: 300, distractors: 0 },
  20: { colorCount: 8, timeLimit: 10, rounds: 20, showTime: 250, distractors: 0 },
};

const TIPS = [
  "💡 Tip: Ignore the WORD — focus only on the COLOR you see!",
  "💡 Tip: Your brain wants to read the word. Fight that urge!",
  "💡 Tip: Pause for a split second before tapping — accuracy beats speed.",
  "💡 Tip: Say the color out loud in your head before you tap.",
  "💡 Tip: The harder stages go fast — don't panic, stay calm!",
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ColorMatchGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [wordText, setWordText] = useState('');
  const [wordColor, setWordColor] = useState('');
  const [correctColorName, setCorrectColorName] = useState('');
  const [options, setOptions] = useState<ColorOption[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);

  const generateRound = useCallback(() => {
    const available = COLORS.slice(0, config.colorCount);
    const wordIdx = Math.floor(Math.random() * available.length);
    let colorIdx = Math.floor(Math.random() * available.length);
    while (colorIdx === wordIdx && config.colorCount > 1) {
      colorIdx = Math.floor(Math.random() * available.length);
    }

    const word = available[wordIdx];
    const color = available[colorIdx];

    setWordText(word.name);
    setWordColor(color.display);
    setCorrectColorName(color.name);

    const optionCount = Math.min(4, config.colorCount);
    const shuffled = shuffleArray(available).slice(0, optionCount);
    if (!shuffled.find(o => o.name === color.name)) {
      shuffled[Math.floor(Math.random() * shuffled.length)] = color;
    }
    setOptions(shuffleArray(shuffled));
  }, [config]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setCorrectCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    setFeedback('');
    generateRound();
    setPhase('playing');
  }, [config, generateRound]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          const summary = `Time's up! ${correctRef.current}/${roundRef.current - 1} correct. Your brain's flexibility is improving!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  const handleAnswer = useCallback((colorName: string) => {
    if (phase !== 'playing' || !gameActiveRef.current) return;

    if (colorName === correctColorName) {
      const points = 15 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! The color was ${correctColorName}! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ Wrong! The word said "${wordText}" but the color was ${correctColorName}`);
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
        const timeBonus = Math.floor(timeLeft * 3);
        scoreRef.current += timeBonus;
        const summary = accuracy > 0.8
          ? `Amazing cognitive flexibility! ${correctRef.current}/${config.rounds} correct! Your brain resists tricks! 🧠`
          : accuracy > 0.5
            ? `Good job! ${correctRef.current}/${config.rounds} correct. Remember: tap the COLOR, not the word!`
            : `You got ${correctRef.current}/${config.rounds}. The Stroop effect is real — keep practicing!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        generateRound();
        setPhase('playing');
        setFeedback('');
      }
    }, 800);
  }, [phase, correctColorName, wordText, timeLeft, config, onScore, onProgress, onEnd, generateRound]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🎨</div>
        <h2 className="text-2xl font-bold text-pink-400 mb-2">Color Match</h2>
        <p className="text-pink-300 mb-4 max-w-xs">Tap the COLOR of the text, not what the word says!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-4xl font-bold mb-2" style={{ color: '#3b82f6' }}>RED</div>
          <div className="text-green-400">The word says "RED" but it's BLUE!</div>
          <div className="text-yellow-400 mt-1">Tap BLUE, not RED! 🎯</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-cyan-300 text-sm">{config.rounds} rounds • {config.colorCount} colors</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🎨
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-4 w-full justify-center">
        <span className="text-pink-400 font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-green-400">✅ {correctCount}</span>
        <span className="text-purple-400">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      <div className="text-5xl md:text-6xl font-black mb-8 tracking-wider" style={{ color: wordColor }}>
        {wordText}
      </div>

      <div className="text-cyan-300 text-sm mb-4">What COLOR is this text?</div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onPointerDown={(e) => { e.stopPropagation(); handleAnswer(opt.name); }}
            className="py-4 px-6 rounded-xl font-bold text-lg active:scale-95 transition-all min-h-[56px] border-2 border-white/20 hover:border-white/40"
            style={{ background: opt.display, color: opt.name === 'YELLOW' ? '#000' : '#fff' }}
          >
            {opt.name}
          </button>
        ))}
      </div>

      <div className="text-lg font-bold min-h-[28px] mt-4 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('color-match', {
  name: 'Color Match',
  emoji: '🎨',
  description: 'Tap the color of the text, not what the word says!',
  category: 'flexibility',
  stages: 20,
  component: ColorMatchGame,
});

export default ColorMatchGame;
