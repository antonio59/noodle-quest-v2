import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { Moon, Heart, Zap, Shield } from 'lucide-react';

// 4-7-8 Breathing: inhale 4s, hold 7s, exhale 8s

type Phase = 'inhale' | 'hold' | 'exhale' | 'idle' | 'info' | 'done';

const BENEFITS = [
  { icon: Moon, label: 'Reduces anxiety and aids sleep', color: 'text-accent' },
  { icon: Heart, label: 'Activates parasympathetic nervous system', color: 'text-danger' },
  { icon: Zap, label: 'Natural tranquilizer for the nervous system', color: 'text-warning' },
  { icon: Shield, label: 'Helps manage cravings and emotional reactions', color: 'text-success' },
];

const BEST_FOR = [
  'Before bed — helps you fall asleep faster',
  'During anxiety or panic episodes',
  'When you need to calm down quickly',
  'Managing cravings or compulsive behaviors',
];

function CalmBreathingGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const totalRounds = 2 + Math.floor(stage / 2);
  const [phase, setPhase] = useState<Phase>('info');
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('info');
  const roundRef = useRef(0);
  const endedRef = useRef(false);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      intervalsRef.current.forEach(clearInterval);
    };
  }, []);

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
    if (phase === 'idle' || phase === 'done' || phase === 'info') return;

    const id = setInterval(() => {
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
            onScore(15);
            onProgress(newRound / totalRounds);
            if (newRound > totalRounds) {
              setPhase('done');
              phaseRef.current = 'done';
              if (timerRef.current) clearInterval(timerRef.current);
              if (!endedRef.current) {
                endedRef.current = true;
                const stars = totalRounds >= 6 ? 3 : totalRounds >= 3 ? 2 : 1;
                onEnd({ score: totalRounds * 15, stars, summary: `${totalRounds} rounds of 4-7-8 breathing!` });
              }
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
    timerRef.current = id;
    intervalsRef.current.push(id);

    return () => {
      clearInterval(id);
      intervalsRef.current = intervalsRef.current.filter(x => x !== id);
    };
  }, [phase, totalRounds, onScore, onProgress, onMessage, onEnd]);

  const estimatedMinutes = Math.ceil(totalRounds * 19 / 60);

  if (phase === 'info') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🌊</div>
            <h2 className="text-2xl font-bold text-accent">4-7-8 Calm Breathing</h2>
            <p className="text-text-dim text-sm mt-1">Dr. Andrew Weil's natural tranquilizer</p>
          </div>

          <div className="bg-card rounded-2xl p-4 mb-5">
            <div className="text-xs font-semibold text-text-muted mb-3 text-center">THE PATTERN</div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg font-semibold">In 4s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-warning/20 text-warning px-3 py-1.5 rounded-lg font-semibold">Hold 7s</span>
              <span className="text-text-muted">→</span>
              <span className="bg-success/20 text-success px-3 py-1.5 rounded-lg font-semibold">Out 8s</span>
            </div>
          </div>

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
        <div className="text-6xl mb-4">🌊</div>
        <h2 className="text-2xl font-bold text-accent mb-2">4-7-8 Calm</h2>
        <p className="text-text-dim mb-4 max-w-xs">
          Inhale 4s → Hold 7s → Exhale 8s. Reduces anxiety and aids sleep.
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
      <div className="w-48 h-1.5 bg-card rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default CalmBreathingGame;
