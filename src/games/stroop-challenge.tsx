import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#4ade80' },
  { name: 'YELLOW', hex: '#fbbf24' },
  { name: 'PURPLE', hex: '#a78bfa' },
];

type Mode = 'color' | 'word';
type Phase = 'ready' | 'playing' | 'done';

const CONFIG: Record<number, { rounds: number; timeLimit: number }> = {
  1: { rounds: 10, timeLimit: 5000 },
  2: { rounds: 12, timeLimit: 4500 },
  3: { rounds: 14, timeLimit: 4000 },
  4: { rounds: 16, timeLimit: 3500 },
  5: { rounds: 18, timeLimit: 3000 },
  6: { rounds: 20, timeLimit: 2800 },
  7: { rounds: 22, timeLimit: 2600 },
  8: { rounds: 24, timeLimit: 2400 },
  9: { rounds: 26, timeLimit: 2200 },
  10: { rounds: 30, timeLimit: 2000 },
};

export default function StroopChallenge({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = scaleFromLast(stage, CONFIG, {
    rounds: 0.1, timeLimit: -0.1,
  }, {
    rounds: 50, timeLimit: 800,
  });
  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mode, setMode] = useState<Mode>('color');
  const [wordColor, setWordColor] = useState(COLORS[0]);
  const [textColor, setTextColor] = useState(COLORS[1]);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(0);
  const nextRoundRef = useRef<() => void>(() => {});

  const generateRound = useCallback(() => {
    const wordIdx = Math.floor(Math.random() * COLORS.length);
    let textIdx = Math.floor(Math.random() * COLORS.length);
    while (textIdx === wordIdx && COLORS.length > 1) {
      textIdx = Math.floor(Math.random() * COLORS.length);
    }
    setWordColor(COLORS[wordIdx]);
    setTextColor(COLORS[textIdx]);
    setMode(Math.random() > 0.5 ? 'color' : 'word');
    setTimeLeft(config.timeLimit);
  }, [config.timeLimit]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  const nextRound = useCallback(() => {
    clearTimers();
    const next = roundRef.current + 1;
    roundRef.current = next;
    setRound(next);
    onProgress(Math.min(next / config.rounds, 1));

    if (next >= config.rounds) {
      const accuracy = config.rounds > 0 ? correctRef.current / config.rounds : 0;
      const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
      const summary = accuracy > 0.8
        ? `Amazing flexibility! ${correctRef.current}/${config.rounds} correct! 🧠`
        : accuracy > 0.5
          ? `Good job! ${correctRef.current}/${config.rounds} correct. Keep training your brain!`
          : `Keep practicing! The Stroop effect is tricky — focus on the task!`;
      setPhase('done');
      onEnd({ score: scoreRef.current, stars, summary });
      return;
    }

    setFeedback('');
    generateRound();

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, config.timeLimit - elapsed);
      setTimeLeft(remaining);
    }, 50);

    timerRef.current = setTimeout(() => {
      setStreak(0);
      setFeedback('⏰ Too slow!');
      setTimeout(() => nextRoundRef.current(), 600);
    }, config.timeLimit);
  }, [config, clearTimers, generateRound, onProgress, onEnd]);

  useEffect(() => {
    nextRoundRef.current = nextRound;
  }, [nextRound]);

  const handleAnswer = useCallback((chosen: typeof COLORS[0]) => {
    if (phase !== 'playing') return;
    clearTimers();

    const isCorrect = mode === 'color'
      ? chosen.name === textColor.name
      : chosen.name === wordColor.name;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const pts = 10 + Math.min(newStreak * 2, 20);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScore(pts);
      correctRef.current += 1;
      setCorrect(c => c + 1);
      setFeedback(`✅ +${pts}`);
    } else {
      setStreak(0);
      setFeedback(`❌ It was ${mode === 'color' ? textColor.name : wordColor.name}`);
    }

    setTimeout(() => nextRoundRef.current(), 600);
  }, [phase, mode, textColor, wordColor, streak, clearTimers, onScore]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 0;
    setScore(0);
    setRound(0);
    setCorrect(0);
    setStreak(0);
    setFeedback('');
    setPhase('playing');
    generateRound();

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, config.timeLimit - elapsed);
      setTimeLeft(remaining);
    }, 50);

    timerRef.current = setTimeout(() => {
      setStreak(0);
      setFeedback('⏰ Too slow!');
      setTimeout(() => nextRoundRef.current(), 600);
    }, config.timeLimit);
  }, [config.timeLimit, generateRound]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  if (phase === 'ready') {
    return (
      <div className="flex flex-col h-full min-h-[350px] items-center justify-center gap-4 px-4">
        <div className="text-6xl">🧩</div>
        <h2 className="text-xl font-bold text-text">Stroop Challenge</h2>
        <p className="text-text-muted text-sm text-center max-w-xs">
          The word and its color may not match!<br />
          <span className="text-accent font-semibold">&quot;TEXT COLOR&quot;</span> = tap the ink color.<br />
          <span className="text-accent font-semibold">&quot;WORD&quot;</span> = tap what the word says.
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
        <div className="text-text-muted text-sm">{round + 1}/{config.rounds}</div>
        <div className="text-warning text-sm">🔥 {streak}</div>
      </div>

      <div className="w-full h-1 bg-card">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${pct}%`, opacity: pct < 30 ? 0.6 : 1 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-text-muted text-sm font-semibold uppercase tracking-wide">
          {mode === 'color' ? 'Tap the TEXT COLOR' : 'Tap the WORD'}
        </div>

        <div
          className="text-5xl sm:text-6xl font-black tracking-wider"
          style={{ color: textColor.hex }}
        >
          {wordColor.name}
        </div>

        {feedback && (
          <div className="text-lg font-bold min-h-[28px] animate-bounce">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm">
          {COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => handleAnswer(c)}
              className="py-3 rounded-xl font-bold text-sm border-2 transition-all active:scale-95 hover:opacity-90"
              style={{
                borderColor: c.hex,
                color: c.hex,
                background: `${c.hex}15`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
