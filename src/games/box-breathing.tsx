import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';
import { Clock, Heart, Brain, Shield } from 'lucide-react';

// Box Breathing: inhale 4s, hold 4s, exhale 4s, hold 4s
// Stages increase number of rounds

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'idle' | 'info' | 'done';

const BENEFITS = [
  { icon: Brain, label: 'Reduces stress & anxiety', color: 'text-accent' },
  { icon: Heart, label: 'Lowers heart rate & blood pressure', color: 'text-danger' },
  { icon: Shield, label: 'Improves emotional regulation', color: 'text-success' },
  { icon: Clock, label: 'Used by Navy SEALs for calm under pressure', color: 'text-warning' },
];

const BEST_FOR = [
  'Before stressful situations (exams, presentations)',
  'When feeling overwhelmed or anxious',
  'To improve focus before work or study',
  'As a daily mindfulness practice',
];

function BoxBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const totalRounds = 3 + stage;
  const [phase, setPhase] = useState<Phase>('info');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('info');
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
    if (phase === 'idle' || phase === 'done' || phase === 'info') return;

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const current = phaseRef.current;
          const next = nextPhase(current);
          phaseRef.current = next;
          setPhase(next);

          if (current === 'hold2') {
            const newRound = roundRef.current + 1;
            roundRef.current = newRound;
            setRound(newRound);
            onScore(10);
            onProgress(newRound / totalRounds);
            onMessage(`Round ${newRound}/${totalRounds}`);

            if (newRound > totalRounds) {
              setPhase('done');
              phaseRef.current = 'done';
              if (timerRef.current) clearInterval(timerRef.current);
              onEnd({ score: totalRounds * 10, stars: totalRounds >= 10 ? 3 : totalRounds >= 6 ? 2 : 1, summary: `Completed ${totalRounds} rounds of box breathing!` });
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

  const estimatedMinutes = Math.ceil(totalRounds * 16 / 60);

  if (phase === 'info') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">📦</div>
            <h2 className="text-2xl font-bold text-accent">Box Breathing</h2>
            <p className="text-text-dim text-sm mt-1">4-4-4-4 breathing pattern</p>
          </div>

          {/* Pattern visualization */}
          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="text-xs font-semibold text-text-muted mb-3 text-center">THE PATTERN</div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg font-semibold">In 4s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-warning/20 text-warning px-3 py-1.5 rounded-lg font-semibold">Hold 4s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-success/20 text-success px-3 py-1.5 rounded-lg font-semibold">Out 4s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-semibold">Hold 4s</span>
            </div>
          </div>

          {/* Session info */}
          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Rounds</span>
              <span className="font-semibold text-text">{totalRounds}</span>
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

          {/* Benefits */}
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

          {/* Best for */}
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
            onClick={() => setPhase('idle')}
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
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Box Breathing</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat {totalRounds} rounds.
        </p>
        <div className="text-text-muted text-sm mb-2">
          ~{estimatedMinutes} min · Stage {stage}/10
        </div>
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
  benefits: ['Reduces stress', 'Lowers heart rate', 'Improves focus', 'Used by Navy SEALs'],
  duration: '3-13 min',
  bestFor: ['Stress relief', 'Pre-exam calm', 'Daily mindfulness'],
});

export default BoxBreathingGame;
