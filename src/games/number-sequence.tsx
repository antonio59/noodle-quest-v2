import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

interface SequenceRound {
  sequence: number[];
  answer: number;
  options: number[];
  pattern: string;
}

const CONFIG: Record<number, { rounds: number; timeLimit: number; patternTypes: string[]; maxStart: number; maxStep: number }> = {
  1: { rounds: 8, timeLimit: 60, patternTypes: ['add'], maxStart: 10, maxStep: 3 },
  2: { rounds: 8, timeLimit: 55, patternTypes: ['add'], maxStart: 15, maxStep: 5 },
  3: { rounds: 10, timeLimit: 55, patternTypes: ['add', 'subtract'], maxStart: 20, maxStep: 5 },
  4: { rounds: 10, timeLimit: 50, patternTypes: ['add', 'subtract'], maxStart: 25, maxStep: 7 },
  5: { rounds: 10, timeLimit: 45, patternTypes: ['add', 'subtract', 'multiply'], maxStart: 10, maxStep: 3 },
  6: { rounds: 12, timeLimit: 45, patternTypes: ['add', 'subtract', 'multiply'], maxStart: 15, maxStep: 5 },
  7: { rounds: 12, timeLimit: 40, patternTypes: ['add', 'subtract', 'multiply'], maxStart: 20, maxStep: 5 },
  8: { rounds: 12, timeLimit: 38, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci'], maxStart: 10, maxStep: 3 },
  9: { rounds: 14, timeLimit: 35, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci'], maxStart: 15, maxStep: 5 },
  10: { rounds: 14, timeLimit: 33, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci'], maxStart: 20, maxStep: 5 },
  11: { rounds: 14, timeLimit: 30, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square'], maxStart: 10, maxStep: 3 },
  12: { rounds: 15, timeLimit: 28, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square'], maxStart: 15, maxStep: 5 },
  13: { rounds: 15, timeLimit: 26, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square'], maxStart: 20, maxStep: 5 },
  14: { rounds: 15, timeLimit: 25, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 10, maxStep: 3 },
  15: { rounds: 16, timeLimit: 23, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 15, maxStep: 5 },
  16: { rounds: 16, timeLimit: 22, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 20, maxStep: 5 },
  17: { rounds: 18, timeLimit: 20, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 10, maxStep: 3 },
  18: { rounds: 18, timeLimit: 18, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 15, maxStep: 5 },
  19: { rounds: 20, timeLimit: 16, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 20, maxStep: 5 },
  20: { rounds: 20, timeLimit: 15, patternTypes: ['add', 'subtract', 'multiply', 'fibonacci', 'square', 'custom'], maxStart: 25, maxStep: 7 },
};

const TIPS = [
  "💡 Tip: Look at the differences between consecutive numbers first!",
  "💡 Tip: Is it adding the same amount each time? That's arithmetic!",
  "💡 Tip: Each number multiplied by the same factor? That's geometric!",
  "💡 Tip: Fibonacci: each number = sum of the two before it!",
  "💡 Tip: Square pattern: 1, 4, 9, 16... those are 1², 2², 3², 4²!",
];

function generateRound(patternTypes: string[], maxStart: number, maxStep: number): SequenceRound {
  const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
  let sequence: number[] = [];
  let answer = 0;
  let pattern = '';

  switch (type) {
    case 'add': {
      const start = Math.floor(Math.random() * maxStart) + 1;
      const step = Math.floor(Math.random() * maxStep) + 1;
      sequence = [start];
      for (let i = 1; i < 5; i++) sequence.push(sequence[i - 1] + step);
      answer = sequence[4] + step;
      pattern = `+${step}`;
      break;
    }
    case 'subtract': {
      const start = Math.floor(Math.random() * maxStart) + maxStep + 5;
      const step = Math.floor(Math.random() * maxStep) + 1;
      sequence = [start];
      for (let i = 1; i < 5; i++) sequence.push(sequence[i - 1] - step);
      answer = sequence[4] - step;
      pattern = `-${step}`;
      break;
    }
    case 'multiply': {
      const start = Math.floor(Math.random() * 5) + 1;
      const factor = Math.floor(Math.random() * 2) + 2;
      sequence = [start];
      for (let i = 1; i < 5; i++) sequence.push(sequence[i - 1] * factor);
      answer = sequence[4] * factor;
      pattern = `×${factor}`;
      break;
    }
    case 'fibonacci': {
      const a = Math.floor(Math.random() * 5) + 1;
      const b = Math.floor(Math.random() * 5) + 1;
      sequence = [a, b];
      for (let i = 2; i < 6; i++) sequence.push(sequence[i - 1] + sequence[i - 2]);
      answer = sequence[5] + sequence[4];
      sequence = sequence.slice(0, 5);
      pattern = 'fibonacci';
      break;
    }
    case 'square': {
      const offset = Math.floor(Math.random() * 3);
      sequence = [];
      for (let i = 1; i <= 5; i++) sequence.push((i + offset) * (i + offset));
      answer = (6 + offset) * (6 + offset);
      pattern = 'squares';
      break;
    }
    case 'custom': {
      const start = Math.floor(Math.random() * maxStart) + 1;
      const step1 = Math.floor(Math.random() * maxStep) + 1;
      const step2 = step1 + Math.floor(Math.random() * 3) + 1;
      sequence = [start];
      let currentStep = step1;
      for (let i = 1; i < 5; i++) {
        sequence.push(sequence[i - 1] + currentStep);
        currentStep += step2;
      }
      answer = sequence[4] + currentStep;
      pattern = 'increasing steps';
      break;
    }
    default: {
      sequence = [1, 2, 3, 4, 5];
      answer = 6;
      pattern = '+1';
    }
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const wrong = answer + (Math.random() > 0.5 ? offset : -offset);
    if (wrong > 0 && wrong !== answer && !sequence.includes(wrong)) {
      options.add(wrong);
    }
  }

  return { sequence, answer, options: Array.from(options).sort(() => Math.random() - 0.5), pattern };
}

function NumberSequenceGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [currentRound, setCurrentRound] = useState<SequenceRound | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);

  const nextRound = useCallback(() => {
    if (!gameActiveRef.current) return;
    const newRound = generateRound(config.patternTypes, config.maxStart, config.maxStep);
    setCurrentRound(newRound);
    setPhase('playing');
    setFeedback('');
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
    nextRound();
  }, [config, nextRound]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          const summary = `Time's up! ${correctRef.current}/${roundRef.current - 1} patterns found. Look at differences between numbers to spot the pattern!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  const handleAnswer = useCallback((answer: number) => {
    if (phase !== 'playing' || !gameActiveRef.current || !currentRound) return;

    if (answer === currentRound.answer) {
      const points = 20 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! Pattern: ${currentRound.pattern} → ${currentRound.answer} +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ Wrong! The answer was ${currentRound.answer} (pattern: ${currentRound.pattern})`);
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
        const timeBonus = Math.floor(timeLeft * 2);
        scoreRef.current += timeBonus;
        const summary = accuracy > 0.8
          ? `Pattern master! ${correctRef.current}/${config.rounds} correct! Your pattern recognition is incredible! 🧠`
          : accuracy > 0.5
            ? `Good job! ${correctRef.current}/${config.rounds} correct. Look at the differences between numbers!`
            : `You found ${correctRef.current}/${config.rounds} patterns. Practice spotting arithmetic and geometric sequences!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        nextRound();
      }
    }, 1000);
  }, [phase, currentRound, timeLeft, config, onScore, onProgress, onEnd, nextRound]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔢</div>
        <h2 className="text-2xl font-bold text-blue-400 mb-2">Number Sequence</h2>
        <p className="text-blue-300 mb-4 max-w-xs">Find the pattern and pick the next number!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-2xl text-blue-400 mb-2 font-mono">2, 4, 8, 16, ?</div>
          <div className="text-green-400">Answer: 32 (×2 pattern!)</div>
          <div className="text-yellow-400 mt-1">{config.rounds} rounds • ⏱️ {config.timeLimit}s</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-purple-300 text-sm">Arithmetic → Geometric → Fibonacci → Custom</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🔢
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-4 w-full justify-center">
        <span className="text-blue-400 font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-green-400">✅ {correctCount}</span>
        <span className="text-purple-400">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      {currentRound && (
        <>
          <div className="flex items-center gap-3 mb-2">
            {currentRound.sequence.map((num, idx) => (
              <span key={idx} className="text-3xl md:text-4xl font-bold text-white font-mono">
                {num}
              </span>
            ))}
            <span className="text-3xl md:text-4xl font-bold text-yellow-400 font-mono">?</span>
          </div>

          <div className="text-cyan-300 text-sm mb-6">What comes next?</div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {currentRound.options.map((opt, idx) => (
              <button
                key={idx}
                onPointerDown={(e) => { e.stopPropagation(); handleAnswer(opt); }}
                className="bg-[#232146] hover:bg-[#2a2850] border-2 border-blue-400/50 text-white font-bold text-2xl py-4 px-6 rounded-xl active:scale-95 transition-all min-h-[60px] font-mono"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-lg font-bold min-h-[28px] mt-4 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('number-sequence', {
  name: 'Number Sequence',
  emoji: '🔢',
  description: 'Find the pattern and pick the next number!',
  category: 'sequence',
  stages: 20,
  component: NumberSequenceGame,
});

export default NumberSequenceGame;
