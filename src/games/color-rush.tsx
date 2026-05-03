import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameProps } from '@/types';

interface ColorEntry { name: string; hex: string }

const COLORS: ColorEntry[] = [
  { name: 'Red',    hex: '#ef4444' },
  { name: 'Blue',   hex: '#3b82f6' },
  { name: 'Green',  hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink',   hex: '#ec4899' },
  { name: 'Teal',   hex: '#14b8a6' },
  { name: 'Brown',  hex: '#92400e' },
  { name: 'Cyan',   hex: '#06b6d4' },
  { name: 'Lime',   hex: '#84cc16' },
  { name: 'Rose',   hex: '#f43f5e' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct: ColorEntry, all: ColorEntry[], count: number): ColorEntry[] {
  return shuffle(all.filter(c => c.name !== correct.name)).slice(0, count);
}

interface Question { color: ColorEntry; options: ColorEntry[] }

function buildQuestions(pool: ColorEntry[], count: number): Question[] {
  const sequence = Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
  return sequence.map(color => ({
    color,
    options: shuffle([color, ...pickDistractors(color, pool, 3)]),
  }));
}

const TOTAL_ROUNDS = 20;

export default function ColorRushGame({ stage, onScore, onProgress, onEnd, onMessage }: GameProps) {
  const pool = useMemo(() => {
    const count = Math.min(6 + stage, COLORS.length);
    return COLORS.slice(0, count);
  }, [stage]);

  const questions = useMemo(() => buildQuestions(pool, TOTAL_ROUNDS), [pool]);

  const [qi, setQi]             = useState(0);
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [chosen, setChosen]     = useState<string | null>(null);
  const [startMs, setStartMs]   = useState(0);

  const endedRef     = useRef(false);
  const timersRef    = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onEndRef     = useRef(onEnd);
  const onScoreRef   = useRef(onScore);
  const onProgressRef = useRef(onProgress);
  const onMessageRef  = useRef(onMessage);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    return () => {
      endedRef.current = true;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (qi < TOTAL_ROUNDS) {
      setChosen(null);
      setStartMs(performance.now());
      onMessageRef.current('What colour is this?');
    }
  }, [qi]);

  const q = questions[qi];

  const handlePick = useCallback((name: string) => {
    if (chosen || !q) return;
    const elapsed = performance.now() - startMs;
    setChosen(name);

    const correct = name === q.color.name;
    let pts: number;
    let msg: string;

    if (correct) {
      const speedBonus = elapsed < 600 ? 3 : elapsed < 1200 ? 2 : 1;
      const streakBonus = streak >= 4 ? 5 : 0;
      pts = 10 * speedBonus + streakBonus;
      setStreak(s => s + 1);
      msg = elapsed < 600
        ? `⚡ Lightning fast! +${pts}`
        : streak >= 4 ? `🔥 ${streak + 1} streak! +${pts}` : `✓ Correct! +${pts}`;
    } else {
      pts = -5;
      setStreak(0);
      msg = `✗ That was ${q.color.name}`;
    }

    const newScore = Math.max(0, score + pts);
    setScore(newScore);
    if (pts > 0) onScoreRef.current(pts);
    onProgressRef.current((qi + 1) / TOTAL_ROUNDS);
    onMessageRef.current(msg);

    schedule(() => {
      const next = qi + 1;
      if (next >= TOTAL_ROUNDS) {
        if (endedRef.current) return;
        endedRef.current = true;
        const pct = newScore / (TOTAL_ROUNDS * 10);
        const stars = pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1;
        onEndRef.current({ score: newScore, stars, summary: `Identified ${TOTAL_ROUNDS} colours — ${newScore} pts!` });
      } else {
        setQi(next);
      }
    }, 900);
  }, [chosen, q, startMs, streak, score, qi, schedule]);

  if (!q) return null;

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex justify-between items-center flex-shrink-0">
        <span className="text-sm font-bold text-text-muted">{qi + 1}/{TOTAL_ROUNDS}</span>
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold animate-pulse">
              🔥 {streak} streak!
            </span>
          )}
          <span className="bg-accent/20 text-accent rounded-lg px-2.5 py-1 text-sm font-bold">{score} pts</span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(qi / TOTAL_ROUNDS) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent), #67e8f9)' }} />
      </div>

      {/* Colour swatch */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-40 h-40 rounded-3xl shadow-2xl transition-all duration-200"
          style={{
            background: q.color.hex,
            boxShadow: `0 0 60px ${q.color.hex}66, 0 0 120px ${q.color.hex}33`,
            opacity: chosen ? 0.6 : 1,
          }}
        />
      </div>

      <p className="text-center text-text-muted text-sm font-medium flex-shrink-0">What colour is this?</p>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2.5 flex-shrink-0">
        {q.options.map(opt => {
          const isChosen  = chosen === opt.name;
          const isCorrect = opt.name === q.color.name;
          const revealed  = !!chosen;

          let bg = 'bg-card'; let border = 'border border-white/5'; let text = 'text-text';
          if (revealed) {
            if (isCorrect)      { bg = 'bg-emerald-500/20'; border = 'border-2 border-emerald-400'; text = 'text-emerald-300 font-bold'; }
            else if (isChosen)  { bg = 'bg-red-500/20';     border = 'border-2 border-red-400';     text = 'text-red-300'; }
            else                { bg = 'bg-card/40';         border = 'border border-white/5';       text = 'text-text-muted'; }
          }

          return (
            <button key={opt.name} onClick={() => handlePick(opt.name)} disabled={!!chosen}
              className={`${bg} ${border} ${text} rounded-2xl py-3.5 text-sm font-semibold text-center transition-all active:scale-95 disabled:cursor-default`}>
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
