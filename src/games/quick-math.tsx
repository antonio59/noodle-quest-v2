import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

type Phase = 'ready' | 'playing' | 'done';

interface Problem {
  a: number;
  b: number;
  op: '+' | '-' | '×';
  answer: number;
}

const CONFIG: Record<number, { problems: number; timeLimit: number; maxNum: number }> = {
  1: { problems: 10, timeLimit: 8000, maxNum: 10 },
  2: { problems: 12, timeLimit: 7000, maxNum: 12 },
  3: { problems: 14, timeLimit: 6500, maxNum: 15 },
  4: { problems: 16, timeLimit: 6000, maxNum: 18 },
  5: { problems: 18, timeLimit: 5500, maxNum: 20 },
  6: { problems: 20, timeLimit: 5000, maxNum: 25 },
  7: { problems: 22, timeLimit: 4800, maxNum: 30 },
  8: { problems: 24, timeLimit: 4500, maxNum: 35 },
  9: { problems: 26, timeLimit: 4200, maxNum: 40 },
  10: { problems: 30, timeLimit: 4000, maxNum: 50 },
};

function makeProblem(maxNum: number): Problem {
  const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * maxNum) + 1;
  let b = Math.floor(Math.random() * maxNum) + 1;

  if (op === '+') {
    return { a, b, op, answer: a + b };
  } else if (op === '-') {
    if (a < b) [a, b] = [b, a];
    return { a, b, op, answer: a - b };
  } else {
    a = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
    b = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
    return { a, b, op, answer: a * b };
  }
}

function makeChoices(problem: Problem): number[] {
  const choices = new Set<number>();
  choices.add(problem.answer);
  while (choices.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const fake = problem.answer + offset;
    if (fake >= 0 && fake !== problem.answer) choices.add(fake);
  }
  return Array.from(choices).sort(() => Math.random() - 0.5);
}

export default function QuickMath({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = scaleFromLast(stage, CONFIG, {
    problems: 0.1, timeLimit: -0.1, maxNum: 0.1,
  }, {
    problems: 50, timeLimit: 1500, maxNum: 100,
  });
  const [phase, setPhase] = useState<Phase>('ready');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [problem, setProblem] = useState<Problem>(makeProblem(config.maxNum));
  const [choices, setChoices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  const loadProblem = useCallback((i: number) => {
    const p = makeProblem(config.maxNum);
    setProblem(p);
    setChoices(makeChoices(p));
    setTimeLeft(config.timeLimit);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeLeft(Math.max(0, config.timeLimit - elapsed));
    }, 50);

    timerRef.current = setTimeout(() => {
      setStreak(0);
      setFeedback(`⏰ Time's up! ${p.a} ${p.op} ${p.b} = ${p.answer}`);
      setTimeout(() => advance(i + 1), 800);
    }, config.timeLimit);
  }, [config.maxNum, config.timeLimit]);

  const advance = useCallback((nextIndex: number) => {
    clearTimers();
    setIndex(nextIndex);
    onProgress(Math.min(nextIndex / config.problems, 1));

    if (nextIndex >= config.problems) {
      const accuracy = config.problems > 0 ? correct / config.problems : 0;
      const stars = accuracy > 0.85 ? 3 : accuracy > 0.55 ? 2 : 1;
      const summary = accuracy > 0.85
        ? `Lightning fast! ${correct}/${config.problems} correct! ⚡`
        : accuracy > 0.55
          ? `Nice work! ${correct}/${config.problems} correct. Keep sharpening your mind!`
          : `Practice makes perfect! ${correct}/${config.problems} correct. Try again!`;
      setPhase('done');
      onEnd({ score: scoreRef.current, stars, summary });
      return;
    }

    setFeedback('');
    loadProblem(nextIndex);
  }, [clearTimers, config.problems, correct, onProgress, onEnd, loadProblem]);

  const handleAnswer = useCallback((choice: number) => {
    if (phase !== 'playing') return;
    clearTimers();

    if (choice === problem.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const speedBonus = timeLeft > config.timeLimit * 0.5 ? 5 : 0;
      const pts = 10 + Math.min(newStreak * 2, 20) + speedBonus;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScore(pts);
      setCorrect(c => c + 1);
      setFeedback(`✅ +${pts}`);
    } else {
      setStreak(0);
      setFeedback(`❌ ${problem.a} ${problem.op} ${problem.b} = ${problem.answer}`);
    }

    setTimeout(() => advance(index + 1), 700);
  }, [phase, problem, streak, timeLeft, config.timeLimit, clearTimers, advance, index, onScore]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setIndex(0);
    setCorrect(0);
    setStreak(0);
    setFeedback('');
    setPhase('playing');
    loadProblem(0);
  }, [loadProblem]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  if (phase === 'ready') {
    return (
      <div className="flex flex-col h-full min-h-[350px] items-center justify-center gap-4 px-4">
        <div className="text-6xl">🧮</div>
        <h2 className="text-xl font-bold text-text">Quick Math</h2>
        <p className="text-text-muted text-sm text-center max-w-xs">
          Solve as many problems as you can!<br />
          Faster answers = bonus points.<br />
          Build a streak for even more!
        </p>
        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start Game
        </button>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (timeLeft / config.timeLimit) * 100));

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-4 py-2 bg-surface rounded-t-xl border-b border-white/5">
        <div className="text-accent font-bold">Score: {score}</div>
        <div className="text-text-muted text-sm">{index + 1}/{config.problems}</div>
        <div className="text-warning text-sm">🔥 {streak}</div>
      </div>

      <div className="w-full h-1 bg-card">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${pct}%`, opacity: pct < 30 ? 0.6 : 1 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-4xl sm:text-5xl font-black text-text tracking-wide">
          {problem.a} <span className="text-accent">{problem.op}</span> {problem.b} = ?
        </div>

        {feedback && (
          <div className="text-lg font-bold min-h-[28px]">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {choices.map(c => (
            <button
              key={c}
              onClick={() => handleAnswer(c)}
              className="bg-card hover:bg-card-hover text-text font-bold py-4 rounded-xl text-xl border border-white/5 transition-all active:scale-95 active:bg-accent/20"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
