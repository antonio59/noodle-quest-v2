import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// 4-7-8 Breathing: inhale 4s, hold 7s, exhale 8s

type Phase = 'inhale' | 'hold' | 'exhale' | 'idle' | 'done';

function CalmBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const totalRounds = 2 + Math.floor(stage / 2); // 2-7 rounds
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef(0);

  const phaseDurations: Record<string, number> = { inhale: 4, hold: 7, exhale: 8 };
  const phaseLabels: Record<string, string> = { inhale: 'Breathe In', hold: 'Hold', exhale: 'Breathe Out' };
  const phaseColors: Record<string, string> = { inhale: 'bg-accent/30', hold: 'bg-warning/30', exhale: 'bg-success/30' };

  const startCycle = useCallback(() => {
    setPhase('inhale');
    phaseRef.current = 'inhale';
    setSecondsLeft(4);
    setRound(1);
    roundRef.current = 1;
    onMessage('Round 1 — 4-7-8 Breathing');
  }, [onMessage]);

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
            // finished exhale — round done
            const newRound = roundRef.current + 1;
            roundRef.current = newRound;
            setRound(newRound);
            onScore(15);
            onProgress(newRound / totalRounds);
            if (newRound > totalRounds) {
              setPhase('done');
              phaseRef.current = 'done';
              if (timerRef.current) clearInterval(timerRef.current);
              onEnd({ score: totalRounds * 15, stars: 3, summary: `${totalRounds} rounds of 4-7-8 breathing!` });
              return 0;
            }
            onMessage(`Round ${newRound}/${totalRounds}`);
            next = 'inhale';
          }
          phaseRef.current = next;
          setPhase(next);
          return phaseDurations[next];
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, totalRounds, onScore, onProgress, onMessage, onEnd]);

  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🌊</div>
        <h2 className="text-2xl font-bold text-accent mb-2">4-7-8 Calm</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale 4s → Hold 7s → Exhale 8s. Reduces anxiety and aids sleep.
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
        <div className="text-6xl mb-4 animate-[celebrate_0.4s_ease]">😌</div>
        <h2 className="text-2xl font-bold mb-2">Deep Calm</h2>
        <p className="text-text-muted mb-6">{totalRounds} rounds completed</p>
        <button onClick={() => { setPhase('idle'); setRound(0); }} className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl">Again</button>
      </div>
    );
  }

  const dur = phaseDurations[phase];
  const pct = ((dur - secondsLeft) / dur) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-sm text-text-muted mb-4">Round {round}/{totalRounds}</div>
      <div className="relative w-48 h-48 mb-6">
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 ${phaseColors[phase]}`}
          style={{
            transform: phase === 'inhale'
              ? `scale(${0.4 + (pct / 100) * 0.6})`
              : phase === 'exhale'
                ? `scale(${1 - (pct / 100) * 0.6})`
                : 'scale(1)',
            opacity: 0.8,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="text-4xl font-bold text-text">{secondsLeft}</div>
          <div className="text-sm text-text-muted mt-1">{phaseLabels[phase]}</div>
        </div>
      </div>
      {/* Timer bar */}
      <div className="w-48 h-1.5 bg-card rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

registerGame('calm-breathing', {
  name: '4-7-8 Calm',
  emoji: '🌊',
  description: 'Inhale 4s, hold 7s, exhale 8s — reduces anxiety',
  category: 'breathe',
  stages: 10,
  component: CalmBreathingGame,
});

export default CalmBreathingGame;
