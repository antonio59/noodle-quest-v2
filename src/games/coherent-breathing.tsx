import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { Waves, Heart, Battery, Activity } from 'lucide-react';

// Coherent/Resonance Breathing: inhale 5s, exhale 5s (5.5 breaths/min)
// Activates parasympathetic nervous system

type Phase = 'inhale' | 'exhale' | 'idle' | 'info' | 'done';

const BENEFITS = [
  { icon: Heart, label: 'Syncs heart rate variability (HRV)', color: 'text-danger' },
  { icon: Waves, label: 'Activates parasympathetic nervous system', color: 'text-accent' },
  { icon: Battery, label: 'Increases energy and reduces fatigue', color: 'text-success' },
  { icon: Activity, label: 'Lowers blood pressure naturally', color: 'text-warning' },
];

const BEST_FOR = [
  'Daily wellness practice (5-20 min)',
  'Heart rate variability training',
  'Sustained calm throughout the day',
  'Recovery after exercise or stress',
];

function CoherentBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const breathLen = Math.min(5 + Math.floor(stage / 3), 7);
  const totalRounds = 2 + stage;
  const [phase, setPhase] = useState<Phase>('info');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('info');
  const roundRef = useRef(0);

  const startCycle = useCallback(() => {
    setPhase('inhale');
    phaseRef.current = 'inhale';
    setSecondsLeft(breathLen);
    setRound(1);
    roundRef.current = 1;
    onMessage(`Round 1 — ${breathLen}s Coherent Breathing`);
  }, [breathLen, onMessage]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || phase === 'info') return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const current = phaseRef.current;
          if (current === 'inhale') {
            phaseRef.current = 'exhale';
            setPhase('exhale');
            return breathLen;
          } else {
            const newRound = roundRef.current + 1;
            roundRef.current = newRound;
            setRound(newRound);
            onScore(12);
            onProgress(newRound / totalRounds);
            if (newRound > totalRounds) {
              setPhase('done');
              phaseRef.current = 'done';
              if (timerRef.current) clearInterval(timerRef.current);
              onEnd({ score: totalRounds * 12, stars: 3, summary: `${totalRounds} rounds of coherent breathing!` });
              return 0;
            }
            onMessage(`Round ${newRound}/${totalRounds}`);
            phaseRef.current = 'inhale';
            setPhase('inhale');
            return breathLen;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, totalRounds, breathLen, onScore, onProgress, onMessage, onEnd]);

  const breathsPerMin = Math.round(60 / (breathLen * 2) * 10) / 10;
  const estimatedMinutes = Math.ceil(totalRounds * (breathLen * 2) / 60);

  if (phase === 'info') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">☯️</div>
            <h2 className="text-2xl font-bold text-accent">Coherent Breathing</h2>
            <p className="text-text-dim text-sm mt-1">Heart-breath synchronization at ~{breathsPerMin} breaths/min</p>
          </div>

          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="text-xs font-semibold text-text-muted mb-3 text-center">THE PATTERN</div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg font-semibold">Inhale {breathLen}s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-success/20 text-success px-3 py-1.5 rounded-lg font-semibold">Exhale {breathLen}s</span>
            </div>
            <div className="text-center text-xs text-text-muted mt-2">
              ~{breathsPerMin} breaths per minute (optimal HRV zone)
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Rounds</span>
              <span className="font-semibold text-text">{totalRounds}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-text-muted">Breath length</span>
              <span className="font-semibold text-text">{breathLen}s in, {breathLen}s out</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-text-muted">Estimated time</span>
              <span className="font-semibold text-text">~{estimatedMinutes} min</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-text-muted">Stage</span>
              <span className="font-semibold text-accent">{stage}/10</span>
            </div>
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-bold text-text-dim mb-3">Benefits</h3>
            <div className="space-y-2">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-3 bg-card rounded-xl p-3">
                  <b.icon size={18} className={b.color} />
                  <span className="text-sm text-text">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-text-dim mb-3">Best For</h3>
            <div className="space-y-2">
              {BEST_FOR.map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-card rounded-xl p-3">
                  <span className="text-accent text-xs mt-0.5">◆</span>
                  <span className="text-sm text-text-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startCycle}
            className="w-full bg-accent text-bg font-bold py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
          >
            Start Session
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">☯️</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Coherent Breathing</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale {breathLen}s, exhale {breathLen}s. ~{breathsPerMin} breaths/min.
          Syncs heart rate and breath for maximum calm.
        </p>
        <div className="text-text-muted text-sm mb-2">
          ~{estimatedMinutes} min · {totalRounds} rounds · Stage {stage}/10
        </div>
        <button onClick={startCycle} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95">
          Begin
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4 animate-[celebrate_0.4s_ease]">☮️</div>
        <h2 className="text-2xl font-bold mb-2">In Sync</h2>
        <p className="text-text-muted mb-6">{totalRounds} rounds completed</p>
        <button onClick={() => { setPhase('idle'); setRound(0); }} className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl">Again</button>
      </div>
    );
  }

  const pct = ((breathLen - secondsLeft) / breathLen) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-sm text-text-muted mb-4">Round {round}/{totalRounds}</div>
      <div className="relative w-56 h-32 mb-6">
        <svg viewBox="0 0 220 100" className="w-full h-full">
          <defs>
            <linearGradient id="breathGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d={phase === 'inhale'
              ? `M 10,80 Q ${10 + pct * 2},80 ${20 + pct * 0.8},${80 - (pct / 100) * 60} T 210,80`
              : `M 10,80 Q ${10 + (100 - pct) * 2},80 ${20 + (100 - pct) * 0.8},${20 + (pct / 100) * 60} T 210,80`}
            fill="none"
            stroke="url(#breathGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx={110}
            cy={phase === 'inhale' ? 80 - (pct / 100) * 60 : 20 + (pct / 100) * 60}
            r="6"
            fill="#a78bfa"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl font-bold text-text">{secondsLeft}</div>
        </div>
      </div>
      <div className="text-lg font-semibold text-accent">
        {phase === 'inhale' ? 'Inhale' : 'Exhale'}
      </div>
      <div className="text-xs text-text-muted mt-1">{breathLen}s per breath</div>
    </div>
  );
}

export default CoherentBreathingGame;
