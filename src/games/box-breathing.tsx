import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Box Breathing: inhale 4s, hold 4s, exhale 4s, hold 4s
// Stages increase number of rounds

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'idle' | 'done';

function BoxBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const totalRounds = 3 + stage; // 4 rounds stage 1, 13 rounds stage 10
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [progress2, setProgress2] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef(0);

  const phaseLabels: Record<string, string> = {
    inhale: 'Breathe In...',
    hold1: 'Hold...',
    exhale: 'Breathe Out...',
    hold2: 'Hold...',
  };

  const phaseColors: Record<string, string> = {
    inhale: 'bg-accent/30',
    hold1: 'bg-warning/30',
    exhale: 'bg-success/30',
    hold2: 'bg-primary/30',
  };

  const phaseDurations: Record<string, number> = {
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
  };

  const nextPhase = useCallback((current: Phase): Phase => {
    switch (current) {
      case 'inhale': return 'hold1';
      case 'hold1': return 'exhale';
      case 'exhale': return 'hold2';
      case 'hold2': return 'inhale';
      default: return 'inhale';
    }
  }, []);

  const startCycle = useCallback(() => {
    setPhase('inhale');
    phaseRef.current = 'inhale';
    setSecondsLeft(4);
    setRound(1);
    roundRef.current = 1;
    onMessage('Round 1 — Box Breathing');
  }, [onMessage]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return;

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Move to next phase
          const current = phaseRef.current;
          const next = nextPhase(current);
          phaseRef.current = next;
          setPhase(next);

          if (current === 'hold2') {
            // Completed a round
            const newRound = roundRef.current + 1;
            roundRef.current = newRound;
            setRound(newRound);
            setProgress2(newRound / totalRounds);
            onScore(10);
            onProgress(newRound / totalRounds);
            onMessage(`Round ${newRound}/${totalRounds}`);

            if (newRound > totalRounds) {
              setPhase('done');
              phaseRef.current = 'done';
              if (timerRef.current) clearInterval(timerRef.current);
              const stars = totalRounds >= 10 ? 3 : totalRounds >= 6 ? 2 : 1;
              onEnd({ score: totalRounds * 10, stars, summary: `Completed ${totalRounds} rounds of box breathing!` });
              return 0;
            }
          }

          return phaseDurations[next];
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, totalRounds, nextPhase, onScore, onProgress, onMessage, onEnd]);

  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Box Breathing</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat {totalRounds} rounds.
        </p>
        <div className="text-text-muted text-sm mb-6">
          Calms the nervous system and improves focus.
        </div>
        <button
          onClick={startCycle}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Begin
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4 animate-[celebrate_0.4s_ease]">🧘</div>
        <h2 className="text-2xl font-bold mb-2">Well Done</h2>
        <p className="text-text-muted mb-6">{totalRounds} rounds completed</p>
        <button
          onClick={() => { setPhase('idle'); setRound(0); }}
          className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl"
        >
          Again
        </button>
      </div>
    );
  }

  const totalPhaseTime = 4;
  const elapsed = totalPhaseTime - secondsLeft;
  const pct = (elapsed / totalPhaseTime) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-sm text-text-muted mb-4">Round {round}/{totalRounds}</div>

      {/* Breathing circle */}
      <div className="relative w-48 h-48 mb-6">
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 ${phaseColors[phase]}`}
          style={{
            transform: phase === 'inhale'
              ? `scale(${0.5 + (pct / 100) * 0.5})`
              : phase === 'exhale'
                ? `scale(${1 - (pct / 100) * 0.5})`
                : phase === 'hold1' ? 'scale(1)' : 'scale(0.5)',
            opacity: 0.8,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="text-3xl font-bold text-text">{secondsLeft}</div>
          <div className="text-sm text-text-muted mt-1">{phaseLabels[phase]}</div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 flex-wrap justify-center max-w-xs">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i < round - 1 ? 'bg-accent' : i === round - 1 ? 'bg-accent animate-pulse' : 'bg-card-hover'}`}
          />
        ))}
      </div>
    </div>
  );
}

registerGame('box-breathing', {
  name: 'Box Breathing',
  emoji: '📦',
  description: '4-4-4-4 breathing pattern for calm and focus',
  category: 'breathe',
  stages: 10,
  component: BoxBreathingGame,
});

export default BoxBreathingGame;
