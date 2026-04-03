import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'question' | 'feedback' | 'done';

const CONFIG: Record<number, { maxNum: number; operations: string[]; timeLimit: number; rounds: number; options: number }> = {
  1: { maxNum: 10, operations: ['+'], timeLimit: 60, rounds: 8, options: 3 },
  2: { maxNum: 15, operations: ['+'], timeLimit: 55, rounds: 8, options: 3 },
  3: { maxNum: 20, operations: ['+', '-'], timeLimit: 55, rounds: 10, options: 3 },
  4: { maxNum: 25, operations: ['+', '-'], timeLimit: 50, rounds: 10, options: 4 },
  5: { maxNum: 30, operations: ['+', '-'], timeLimit: 50, rounds: 10, options: 4 },
  6: { maxNum: 12, operations: ['+', '-', '×'], timeLimit: 45, rounds: 12, options: 4 },
  7: { maxNum: 15, operations: ['+', '-', '×'], timeLimit: 45, rounds: 12, options: 4 },
  8: { maxNum: 20, operations: ['+', '-', '×'], timeLimit: 40, rounds: 12, options: 4 },
  9: { maxNum: 25, operations: ['+', '-', '×'], timeLimit: 40, rounds: 14, options: 4 },
  10: { maxNum: 30, operations: ['+', '-', '×'], timeLimit: 35, rounds: 14, options: 4 },
  11: { maxNum: 12, operations: ['+', '-', '×', '÷'], timeLimit: 35, rounds: 14, options: 4 },
  12: { maxNum: 15, operations: ['+', '-', '×', '÷'], timeLimit: 30, rounds: 15, options: 4 },
  13: { maxNum: 20, operations: ['+', '-', '×', '÷'], timeLimit: 30, rounds: 15, options: 4 },
  14: { maxNum: 25, operations: ['+', '-', '×', '÷'], timeLimit: 28, rounds: 15, options: 4 },
  15: { maxNum: 30, operations: ['+', '-', '×', '÷'], timeLimit: 25, rounds: 16, options: 4 },
  16: { maxNum: 50, operations: ['+', '-', '×', '÷'], timeLimit: 25, rounds: 16, options: 4 },
  17: { maxNum: 50, operations: ['+', '-', '×', '÷'], timeLimit: 22, rounds: 18, options: 4 },
  18: { maxNum: 100, operations: ['+', '-', '×', '÷'], timeLimit: 20, rounds: 18, options: 4 },
  19: { maxNum: 100, operations: ['+', '-', '×', '÷'], timeLimit: 18, rounds: 20, options: 4 },
  20: { maxNum: 100, operations: ['+', '-', '×', '÷'], timeLimit: 15, rounds: 20, options: 4 },
};

const TIPS = [
  "💡 Tip: For addition, round numbers first: 28 + 15 = 30 + 15 - 2 = 43!",
  "💡 Tip: For subtraction, count UP from the smaller number.",
  "💡 Tip: Know your times tables! They make everything faster.",
  "💡 Tip: For division, think: what number times the divisor gives the answer?",
  "💡 Tip: Eliminate obviously wrong answers first, then guess between the rest!",
];

function generateQuestion(maxNum: number, operations: string[]): { question: string; answer: number } {
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      b = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      answer = a * b;
      break;
    case '÷':
      b = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      answer = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      a = b * answer;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

function generateOptions(correct: number, count: number): number[] {
  const options = new Set<number>([correct]);
  while (options.size < count) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const wrong = correct + (Math.random() > 0.5 ? offset : -offset);
    if (wrong >= 0 && wrong !== correct) {
      options.add(wrong);
    }
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}

function SpeedMathGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
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

  const nextQuestion = useCallback(() => {
    if (!gameActiveRef.current) return;
    const { question: q, answer } = generateQuestion(config.maxNum, config.operations);
    setQuestion(q);
    setCorrectAnswer(answer);
    setOptions(generateOptions(answer, config.options));
    setPhase('question');
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
    nextQuestion();
  }, [config, nextQuestion]);

  useEffect(() => {
    if (phase !== 'question' && phase !== 'feedback') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const completed = Math.max(0, roundRef.current - 1);
          const accuracy = completed > 0 ? correctRef.current / completed : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          const summary = `Time's up! You got ${correctRef.current}/${completed} correct (${Math.round(accuracy * 100)}%). Practice your ${config.operations.join(', ')} tables!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  const handleAnswer = useCallback((answer: number) => {
    if (phase !== 'question' || !gameActiveRef.current) return;

    if (answer === correctAnswer) {
      const points = 15 + Math.floor(timeLeft / 3);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ Wrong! The answer was ${correctAnswer}`);
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
          ? `Math wizard! ${correctRef.current}/${config.rounds} correct! Your mental math is incredible! 🧙‍♂️`
          : accuracy > 0.5
            ? `Good job! ${correctRef.current}/${config.rounds} correct. Keep practicing to get faster!`
            : `You got ${correctRef.current}/${config.rounds}. Practice makes perfect — try again!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        nextQuestion();
      }
    }, 800);
  }, [phase, correctAnswer, timeLeft, config, onScore, onProgress, onEnd, nextQuestion]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Speed Math</h2>
        <p className="text-yellow-300 mb-4 max-w-xs">Solve math problems as fast as you can!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl text-yellow-400 mb-2">{config.operations.join(' + ')}</div>
          <div className="text-cyan-300">Numbers up to {config.maxNum}</div>
          <div className="text-green-400 mt-1">{config.rounds} questions • ⏱️ {config.timeLimit}s</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-purple-300 text-sm">Faster answers = more points!</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! ⚡
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-4 w-full justify-center">
        <span className="text-yellow-400 font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-green-400">✅ {correctCount}</span>
        <span className="text-purple-400">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      <div className="text-4xl md:text-5xl font-bold text-white mb-8 font-mono">
        {question}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onPointerDown={(e) => { e.stopPropagation(); handleAnswer(opt); }}
            className="bg-[#232146] hover:bg-[#2a2850] border-2 border-purple-400/50 text-white font-bold text-2xl py-4 px-6 rounded-xl active:scale-95 transition-all min-h-[60px]"
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="text-lg font-bold min-h-[28px] mt-4 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('speed-math', {
  name: 'Speed Math',
  emoji: '⚡',
  description: 'Solve math equations before time runs out!',
  category: 'sequence',
  stages: 20,
  component: SpeedMathGame,
});

export default SpeedMathGame;
