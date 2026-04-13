import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { Mountain, Brain, Leaf, Target } from 'lucide-react';

// Triangle Breathing: inhale 4s, hold 4s, exhale 4s (3 sides of a triangle)

type Phase = 'inhale' | 'hold' | 'exhale' | 'idle' | 'info' | 'done';

const BENEFITS = [
  { icon: Mountain, label: 'Grounds and centers the mind', color: 'text-accent' },
  { icon: Brain, label: 'Improves concentration and mental clarity', color: 'text-warning' },
  { icon: Leaf, label: 'Simple pattern — easy for beginners', color: 'text-success' },
  { icon: Target, label: 'Builds breath awareness and control', color: 'text-danger' },
];

const BEST_FOR = [
  'Beginners new to breathing exercises',
  'Quick grounding during busy days',
  'Before focused work or study sessions',
  'When you need a simple reset',
];

function TriangleBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const breathLen = Math.min(4 + Math.floor(stage / 3), 7);
  const totalRounds = 3 + stage;
  const [phase, setPhase] = useState<Phase>('info');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('info');
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
    if (phase === 'idle' || phase === 'done' || phase === 'info') return;
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

  const estimatedMinutes = Math.ceil(totalRounds * (breathLen * 3) / 60);

  if (phase === 'info') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🔺</div>
            <h2 className="text-2xl font-bold text-accent">Triangle Breathing</h2>
            <p className="text-text-dim text-sm mt-1">Equal inhale-hold-exhale, visual triangle guide</p>
          </div>

          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="text-xs font-semibold text-text-muted mb-3 text-center">THE PATTERN</div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg font-semibold">In {breathLen}s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-warning/20 text-warning px-3 py-1.5 rounded-lg font-semibold">Hold {breathLen}s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-success/20 text-success px-3 py-1.5 rounded-lg font-semibold">Out {breathLen}s</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Rounds</span>
              <span className="font-semibold text-text">{totalRounds}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-text-muted">Breath length</span>
              <span className="font-semibold text-text">{breathLen}s per phase</span>
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
        <div className="text-6xl mb-4">🔺</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Triangle Breathing</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale {breathLen}s → Hold {breathLen}s → Exhale {breathLen}s. Simple and grounding.
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
        <div className="text-6xl mb-4 animate-[celebrate_0.4s_ease]">✨</div>
        <h2 className="text-2xl font-bold mb-2">Grounded</h2>
        <p className="text-text-muted mb-6">{totalRounds} rounds completed</p>
        <button onClick={() => { setPhase('idle'); setRound(0); }} className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl">Again</button>
      </div>
    );
  }

  const sideProgress = (breathLen - secondsLeft) / breathLen;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-sm text-text-muted mb-4">Round {round}/{totalRounds} · {breathLen}s each</div>
      <div className="relative w-48 h-48 mb-6">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <polygon points="100,20 180,170 20,170" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="3" />
          {phase === 'inhale' && (
            <line x1="20" y1="170" x2={20 + sideProgress * 80} y2={170 - sideProgress * 150} stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
          )}
          {phase === 'hold' && (
            <>
              <line x1="20" y1="170" x2="100" y2="20" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
              <line x1="100" y1="20" x2={100 + sideProgress * 80} y2={20 + sideProgress * 150} stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {phase === 'exhale' && (
            <>
              <line x1="20" y1="170" x2="100" y2="20" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
              <line x1="100" y1="20" x2="180" y2="170" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
              <line x1="180" y1="170" x2={180 - sideProgress * 160} y2="170" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
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

export default TriangleBreathingGame;
