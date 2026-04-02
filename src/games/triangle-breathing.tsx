import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Triangle Breathing: inhale 4s, hold 4s, exhale 4s (3 sides of a triangle)

type Phase = 'inhale' | 'hold' | 'exhale' | 'idle' | 'done';

function TriangleBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const breathLen = Math.min(4 + Math.floor(stage / 3), 7); // 4s at stage 1, 7s at stage 9+
  const totalRounds = 3 + stage;
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef(0);

  const phaseLabels: Record<string, string> = { inhale: 'In', hold: 'Hold', exhale: 'Out' };

  const startCycle = useCallback(() => {
    setPhase('inhale');
    phaseRef.current = 'inhale';
    setSecondsLeft(breathLen);
    setRound(1);
    roundRef.current = 1;
    onMessage(`Round 1 — ${breathLen}s Triangle`);
  }, [breathLen, onMessage]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const current = phaseRef.current;
          let next: Phase;
          if (current === 'inhale') next = 'hold';
          else if (current === 'hold') next = 'exhale';
          else {
            const newRound = roundRef.current + 1;
            roundRef.current = newRound;
            setRound(newRound);
            onScore(10);
            onProgress(newRound / totalRounds);
            if (newRound > totalRounds) {
              setPhase('done');
              phaseRef.current = 'done';
              if (timerRef.current) clearInterval(timerRef.current);
              onEnd({ score: totalRounds * 10, stars: 3, summary: `${totalRounds} rounds of triangle breathing!` });
              return 0;
            }
            onMessage(`Round ${newRound}/${totalRounds}`);
            next = 'inhale';
          }
          phaseRef.current = next;
          setPhase(next);
          return breathLen;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, totalRounds, breathLen, onScore, onProgress, onMessage, onEnd]);

  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🔺</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Triangle Breathing</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale {breathLen}s → Hold {breathLen}s → Exhale {breathLen}s. Simple and grounding.
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
        <div className="text-6xl mb-4 animate-[celebrate_0.4s_ease]">✨</div>
        <h2 className="text-2xl font-bold mb-2">Grounded</h2>
        <p className="text-text-muted mb-6">{totalRounds} rounds completed</p>
        <button onClick={() => { setPhase('idle'); setRound(0); }} className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl">Again</button>
      </div>
    );
  }

  // Triangle path animation — each side represents a phase
  const sideProgress = (breathLen - secondsLeft) / breathLen;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-sm text-text-muted mb-4">Round {round}/{totalRounds} · {breathLen}s each</div>

      {/* Triangle visualization */}
      <div className="relative w-48 h-48 mb-6">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Background triangle */}
          <polygon points="100,20 180,170 20,170" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="3" />
          {/* Active side */}
          {phase === 'inhale' && (
            <line
              x1="20" y1="170" x2={20 + sideProgress * 80} y2={170 - sideProgress * 150}
              stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"
            />
          )}
          {phase === 'hold' && (
            <>
              <line x1="20" y1="170" x2="100" y2="20" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
              <line
                x1="100" y1="20" x2={100 + sideProgress * 80} y2={20 + sideProgress * 150}
                stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"
              />
            </>
          )}
          {phase === 'exhale' && (
            <>
              <line x1="20" y1="170" x2="100" y2="20" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
              <line x1="100" y1="20" x2="180" y2="170" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
              <line
                x1="180" y1="170" x2={180 - sideProgress * 160} y2="170"
                stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"
              />
            </>
          )}
          {/* Labels */}
          <text x="100" y="12" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="bold">Hold</text>
          <text x="8" y="190" textAnchor="start" fill="#a78bfa" fontSize="12" fontWeight="bold">In</text>
          <text x="192" y="190" textAnchor="end" fill="#a78bfa" fontSize="12" fontWeight="bold">Out</text>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center mt-6">
          <div className="text-4xl font-bold text-text">{secondsLeft}</div>
        </div>
      </div>

      <div className="text-lg font-semibold text-accent">{phaseLabels[phase]}</div>
    </div>
  );
}

registerGame('triangle-breathing', {
  name: 'Triangle Breathing',
  emoji: '🔺',
  description: 'Equal inhale-hold-exhale, visual triangle guide',
  category: 'breathe',
  stages: 10,
  component: TriangleBreathingGame,
});

export default TriangleBreathingGame;
