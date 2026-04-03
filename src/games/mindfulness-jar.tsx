import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'shaking' | 'settling' | 'breathing' | 'done';

const TIPS = [
  "💡 Tip: There's no wrong way to do this — just watch and breathe.",
  "💡 Tip: Breathe in for 4 seconds, hold for 3, breathe out for 4.",
  "💡 Tip: Focus on one glitter particle and follow it as it settles.",
  "💡 Tip: Use this when you feel stressed or need a moment to calm down.",
  "💡 Tip: Higher stages = longer breathing sessions. Let yourself relax!",
];

const CONFIG: Record<number, { shakeDuration: number; settleDuration: number; breathRounds: number }> = {
  1: { shakeDuration: 3, settleDuration: 20, breathRounds: 3 },
  2: { shakeDuration: 3, settleDuration: 25, breathRounds: 3 },
  3: { shakeDuration: 3, settleDuration: 30, breathRounds: 4 },
  4: { shakeDuration: 4, settleDuration: 30, breathRounds: 4 },
  5: { shakeDuration: 4, settleDuration: 35, breathRounds: 4 },
  6: { shakeDuration: 4, settleDuration: 35, breathRounds: 5 },
  7: { shakeDuration: 4, settleDuration: 40, breathRounds: 5 },
  8: { shakeDuration: 5, settleDuration: 40, breathRounds: 5 },
  9: { shakeDuration: 5, settleDuration: 45, breathRounds: 6 },
  10: { shakeDuration: 5, settleDuration: 45, breathRounds: 6 },
  11: { shakeDuration: 5, settleDuration: 50, breathRounds: 6 },
  12: { shakeDuration: 5, settleDuration: 50, breathRounds: 7 },
  13: { shakeDuration: 5, settleDuration: 55, breathRounds: 7 },
  14: { shakeDuration: 5, settleDuration: 55, breathRounds: 7 },
  15: { shakeDuration: 5, settleDuration: 60, breathRounds: 8 },
  16: { shakeDuration: 5, settleDuration: 60, breathRounds: 8 },
  17: { shakeDuration: 5, settleDuration: 60, breathRounds: 8 },
  18: { shakeDuration: 5, settleDuration: 60, breathRounds: 9 },
  19: { shakeDuration: 5, settleDuration: 60, breathRounds: 9 },
  20: { shakeDuration: 5, settleDuration: 60, breathRounds: 10 },
};

const PARTICLE_COLORS = ['#ff6e6c', '#4ade80', '#67e8f9', '#c084fc', '#fbbf24', '#fb923c', '#f472b6', '#a78bfa'];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speed: number;
}

function MindfulnessJarGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [settleProgress, setSettleProgress] = useState(0);
  const [breathRound, setBreathRound] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathText, setBreathText] = useState('');
  const [message, setMessage] = useState('');
  const gameActiveRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const createParticles = useCallback(() => {
    const count = 20 + stage * 2;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: 20 + Math.random() * 60,
        y: 10 + Math.random() * 80,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: 4 + Math.random() * 8,
        speed: 0.3 + Math.random() * 0.7,
      });
    }
    return newParticles;
  }, [stage]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    const p = createParticles();
    setParticles(p);
    setPhase('shaking');
    setMessage('🫧 Shake it up! Watch the glitter swirl!');

    setTimeout(() => {
      if (!gameActiveRef.current) return;
      setPhase('settling');
      setMessage('Watch the glitter settle... breathe slowly...');
      setSettleProgress(0);
    }, config.shakeDuration * 1000);
  }, [config, createParticles]);

  // Settling animation
  useEffect(() => {
    if (phase !== 'settling') return;

    const startTime = Date.now();
    const duration = config.settleDuration * 1000;

    const animate = () => {
      if (!gameActiveRef.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setSettleProgress(progress);
      onProgress(progress * 0.6);

      setParticles(prev => prev.map(p => ({
        ...p,
        y: Math.min(85 + (p.speed * 5), p.y + p.speed * progress * 0.5),
        x: p.x + Math.sin(Date.now() * 0.001 * p.speed + p.id) * (1 - progress) * 0.3,
      })));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('breathing');
        setBreathRound(1);
        setMessage('Now let\'s breathe together...');
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, config, onProgress]);

  // Breathing rounds
  useEffect(() => {
    if (phase !== 'breathing' || breathRound === 0) return;

    const breathCycle = () => {
      if (!gameActiveRef.current) return;

      setBreathPhase('in');
      setBreathText('Breathe in... 🌬️');
      const points = 10;
      onScore(points);

      const inTimer = setTimeout(() => {
        if (!gameActiveRef.current) return;
        setBreathPhase('hold');
        setBreathText('Hold... ✨');

        const holdTimer = setTimeout(() => {
          if (!gameActiveRef.current) return;
          setBreathPhase('out');
          setBreathText('Breathe out... 💨');

          const outTimer = setTimeout(() => {
            if (!gameActiveRef.current) return;
            const nextRound = breathRound + 1;
            onProgress(0.6 + (nextRound / config.breathRounds) * 0.4);

            if (nextRound > config.breathRounds) {
              gameActiveRef.current = false;
              const totalScore = config.breathRounds * 10 + 50;
              onEnd({
                score: totalScore,
                stars: 3,
                summary: `Wonderful mindfulness! You watched the jar settle and took ${config.breathRounds} deep breaths. You should feel calm and focused now! 🧘`,
              });
            } else {
              setBreathRound(nextRound);
            }
          }, 4000);
          return () => clearTimeout(outTimer);
        }, 3000);
        return () => clearTimeout(holdTimer);
      }, 4000);
      return () => clearTimeout(inTimer);
    };

    breathCycle();
  }, [phase, breathRound, config, onScore, onProgress, onEnd]);

  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🫧</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Mindfulness Jar</h2>
        <p className="text-text-dim mb-4 max-w-xs">Watch the glitter settle and calm your mind like a snow globe</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-text-muted text-sm mb-2">Shake, watch, breathe, and relax</div>
          <div className="text-warning">{config.breathRounds} breathing rounds</div>
          <div className="text-text-muted text-xs mt-1">No right or wrong answers — just be present</div>
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Begin 🫧
        </button>
      </div>
    );
  }

  const jarShaking = phase === 'shaking';
  const breathScale = breathPhase === 'in' ? 'scale-110' : breathPhase === 'out' ? 'scale-90' : 'scale-100';

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      {phase === 'breathing' && (
        <div className="text-text-muted text-sm mb-2">Breath {breathRound}/{config.breathRounds}</div>
      )}

      <div className="text-text-dim text-sm mb-3 text-center max-w-xs">{message}</div>

      {/* The jar */}
      <div
        className={`relative w-48 h-64 rounded-b-3xl rounded-t-xl border-2 border-white/20 bg-gradient-to-b from-blue-900/30 to-blue-950/60 overflow-hidden mb-4 transition-transform duration-200 ${jarShaking ? 'animate-pulse' : ''} ${phase === 'breathing' ? breathScale : ''}`}
        style={{ transition: 'transform 2s ease-in-out' }}
      >
        {/* Jar lid */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-36 h-4 bg-gray-600 rounded-t-lg border border-gray-500" />

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full transition-all"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: phase === 'shaking' ? 0.9 : 0.6 + settleProgress * 0.2,
              filter: `blur(${phase === 'shaking' ? 1 : 0}px)`,
              transition: phase === 'shaking' ? 'none' : 'all 2s ease-out',
            }}
          />
        ))}

        {/* Water line */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-blue-400/10" />
      </div>

      {phase === 'settling' && (
        <div className="w-48 h-2 bg-card rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${settleProgress * 100}%` }}
          />
        </div>
      )}

      {phase === 'breathing' && (
        <div className="text-2xl font-bold text-accent mt-2 text-center">
          {breathText}
        </div>
      )}
    </div>
  );
}

registerGame('mindfulness-jar', {
  name: 'Mindfulness Jar',
  emoji: '🫧',
  description: 'Watch the glitter settle and calm your mind',
  category: 'focus',
  stages: 20,
  component: MindfulnessJarGame,
});

export default MindfulnessJarGame;
