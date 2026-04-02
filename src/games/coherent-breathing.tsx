import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Coherent/Resonance Breathing: inhale 5s, exhale 5s (5.5 breaths/min)
// Activates parasympathetic nervous system

type Phase = 'inhale' | 'exhale' | 'idle' | 'done';

function CoherentBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const breathLen = Math.min(5 + Math.floor(stage / 3), 7); // 5s at stage 1, 7s at stage 7+
  const totalRounds = 2 + stage;
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('idle');
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
    if (phase === 'idle' || phase === 'done') return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const current = phaseRef.current;
          if (current === 'inhale') {
            phaseRef.current = 'exhale';
            setPhase('exhale');
            return breathLen;
          } else {
            // exhale done, round complete
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

  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">☯️</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Coherent Breathing</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale {breathLen}s, exhale {breathLen}s. ~{Math.round(60 / (breathLen * 2) * 10) / 10} breaths/min.
          Syncs heart rate and breath for maximum calm.
        </p>
        <div className="text-text-muted text-sm mb-6">{totalRounds} rounds</div>
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

      {/* Wave animation */}
      <div className="relative w-56 h-32 mb-6">
        <svg viewBox="0 0 220 100" className="w-full h-full">
          <defs>
            <linearGradient id="breathGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Breathing wave */}
          <path
            d={phase === 'inhale'
              ? `M 10,80 Q ${10 + pct * 2},80 ${20 + pct * 0.8},${80 - (pct / 100) * 60} T 210,80`
              : `M 10,80 Q ${10 + (100 - pct) * 2},80 ${20 + (100 - pct) * 0.8},${20 + (pct / 100) * 60} T 210,80`}
            fill="none"
            stroke="url(#breathGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Dot on wave */}
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

registerGame('coherent-breathing', {
  name: 'Coherent Breathing',
  emoji: '☯️',
  description: 'Equal inhale-exhale for heart-breath sync',
  category: 'breathe',
  stages: 10,
  component: CoherentBreathingGame,
});

export default CoherentBreathingGame;
