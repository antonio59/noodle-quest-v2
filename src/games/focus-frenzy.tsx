import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface Orb {
  id: number;
  x: number;
  y: number;
  size: number;
  isTarget: boolean;
  fading: boolean;
  hit: boolean;
  burst: boolean;
  burstX: number;
  burstY: number;
}

type Phase = 'intro' | 'playing' | 'done';

const CONFIG: Record<number, { spawnRate: number; duration: number; distractors: number; fadeTime: number; speed: number }> = {
  1: { spawnRate: 1400, duration: 25000, distractors: 0.2, fadeTime: 0, speed: 0.8 },
  2: { spawnRate: 1200, duration: 28000, distractors: 0.25, fadeTime: 0, speed: 0.9 },
  3: { spawnRate: 1100, duration: 30000, distractors: 0.3, fadeTime: 0, speed: 1 },
  4: { spawnRate: 1000, duration: 32000, distractors: 0.35, fadeTime: 0, speed: 1.1 },
  5: { spawnRate: 900, duration: 33000, distractors: 0.4, fadeTime: 1500, speed: 1.2 },
  6: { spawnRate: 850, duration: 35000, distractors: 0.45, fadeTime: 1500, speed: 1.3 },
  7: { spawnRate: 800, duration: 36000, distractors: 0.5, fadeTime: 1200, speed: 1.4 },
  8: { spawnRate: 750, duration: 38000, distractors: 0.55, fadeTime: 1000, speed: 1.5 },
  9: { spawnRate: 700, duration: 40000, distractors: 0.6, fadeTime: 800, speed: 1.6 },
  10: { spawnRate: 600, duration: 45000, distractors: 0.65, fadeTime: 600, speed: 1.8 },
};

const TIPS = [
  "💡 Tip: Look for the WARM colors (pink/purple glow) — those are your targets!",
  "💡 Tip: The blue orbs are distractions. Train your brain to ignore them!",
  "💡 Tip: Don't rush! It's better to skip an orb than tap the wrong one.",
  "💡 Tip: Focus on ONE area of the screen at a time, then shift your gaze.",
  "💡 Tip: Take a breath before you start — calm focus beats frantic tapping!",
];

const FEEDBACKS = ["Nice focus! 🎯", "Great eyes! 👀", "You're on fire! 🔥", "Keep it up! ⭐"];

let orbIdCounter = 0;

function FocusFrenzyGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [score, setScore] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  const totalTargetsRef = useRef(0);
  const [feedback, setFeedback] = useState('');
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const targetsHitRef = useRef(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  const spawnOrb = useCallback(() => {
    if (!gameActiveRef.current || !gameAreaRef.current) return;

    const isTarget = Math.random() > config.distractors;
    const size = 45 + Math.random() * 35;
    const maxX = Math.max(50, gameAreaRef.current.clientWidth - size);
    const maxY = Math.max(50, gameAreaRef.current.clientHeight - size);
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    const id = ++orbIdCounter;

    if (isTarget) {
      totalTargetsRef.current++;
    }

    const orb: Orb = { id, x, y, size, isTarget, fading: false, hit: false, burst: false, burstX: 0, burstY: 0 };
    setOrbs(prev => [...prev, orb]);

    if (isTarget && config.fadeTime > 0) {
      setTimeout(() => {
        setOrbs(prev => prev.map(o => o.id === id ? { ...o, fading: true } : o));
      }, config.fadeTime);
    }

    setTimeout(() => {
      setOrbs(prev => prev.filter(o => o.id !== id));
    }, 3500 / config.speed);
  }, [config]);

  const handleOrbClick = useCallback((orb: Orb) => {
    if (!gameActiveRef.current || orb.hit) return;

    setOrbs(prev => prev.map(o =>
      o.id === orb.id ? { ...o, hit: true, burst: true, burstX: orb.x + orb.size / 2, burstY: orb.y + orb.size / 2 } : o
    ));

    if (orb.isTarget) {
      scoreRef.current += 10;
      targetsHitRef.current++;
      setScore(scoreRef.current);
      setTargetsHit(targetsHitRef.current);
      onScore(10);

      if (targetsHitRef.current % 5 === 0) {
        const msg = FEEDBACKS[Math.floor(Math.random() * FEEDBACKS.length)];
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 1500);
      }
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      setFeedback('💡 That was a distraction! Look for the pink glow.');
      setTimeout(() => setFeedback(''), 2000);
    }

    setTimeout(() => {
      setOrbs(prev => prev.filter(o => o.id !== orb.id));
    }, 400);
  }, [onScore]);

  const startGame = useCallback(() => {
    setPhase('playing');
    gameActiveRef.current = true;
    scoreRef.current = 0;
    targetsHitRef.current = 0;
    totalTargetsRef.current = 0;
    setScore(0);
    setTargetsHit(0);
    setOrbs([]);
    setFeedback('');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;

    const spawnTimer = setInterval(spawnOrb, config.spawnRate);
    const progressTimer = setInterval(() => {
      if (gameActiveRef.current) onProgress(0.5);
    }, 1000);

    const gameTimer = setTimeout(() => {
      gameActiveRef.current = false;
      clearInterval(spawnTimer);
      clearInterval(progressTimer);

      const accuracy = totalTargetsRef.current > 0 ? targetsHitRef.current / totalTargetsRef.current : 0;
      const stars = accuracy > 0.75 ? 3 : accuracy > 0.5 ? 2 : 1;

      let summary = `You zapped ${targetsHitRef.current} orbs with ${Math.round(accuracy * 100)}% accuracy! `;
      if (accuracy > 0.75) summary += 'Amazing focus! Your brain is getting great at filtering distractions! 🌟';
      else if (accuracy > 0.5) summary += 'Good job! Try focusing on one area at a time to catch more targets.';
      else summary += 'Keep practicing! Remember: pink/purple = tap, blue = ignore!';

      setPhase('done');
      onEnd({ score: scoreRef.current, stars, summary });
    }, config.duration);

    return () => {
      gameActiveRef.current = false;
      clearInterval(spawnTimer);
      clearInterval(progressTimer);
      clearTimeout(gameTimer);
    };
  }, [phase, config, spawnOrb, onProgress, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔮</div>
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Focus Frenzy</h2>
        <p className="text-purple-300 mb-4 max-w-xs">
          Tap the glowing pink/purple orbs!<br />Ignore the blue distractions!
        </p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #ff6e6c, #c084fc)', boxShadow: '0 0 15px #ff6e6c' }} />
            <span className="text-green-400">✓ Tap these! (+10 points)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #67e8f9, #232146)', boxShadow: '0 0 8px #67e8f9' }} />
            <span className="text-red-400">✗ Ignore these! (-5 points)</span>
          </div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🎯
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-4 py-2 bg-[#232146] rounded-t-xl">
        <div className="text-purple-400 font-bold">Score: {score}</div>
        <div className="text-cyan-300 text-sm">🎯 {targetsHit} hits</div>
      </div>

      <div
        ref={gameAreaRef}
        className="flex-1 min-h-[280px] relative overflow-hidden cursor-crosshair"
        style={{ background: 'linear-gradient(180deg, #1a1833 0%, #0f0e17 100%)' }}
      >
        {orbs.map(orb => !orb.burst ? (
          <div
            key={orb.id}
            onPointerDown={(e) => { e.stopPropagation(); handleOrbClick(orb); }}
            className="absolute rounded-full cursor-pointer"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              opacity: orb.fading ? 0.4 : orb.hit ? 0 : 1,
              transform: orb.hit ? 'scale(1.5)' : 'scale(1)',
              transition: 'transform 0.1s, opacity 0.2s',
              ...(orb.isTarget
                ? { background: 'radial-gradient(circle at 30% 30%, #ff6e6c, #c084fc)', boxShadow: '0 0 20px #ff6e6c, 0 0 40px #c084fc' }
                : { background: 'radial-gradient(circle at 30% 30%, #67e8f9, #232146)', boxShadow: '0 0 10px #67e8f9', opacity: Math.min(0.8, orb.fading ? 0.4 : 0.8) }),
            }}
          />
        ) : (
          <div
            key={orb.id + '-burst'}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 20,
              height: 20,
              left: orb.burstX,
              top: orb.burstY,
              background: orb.isTarget ? '#ff6e6c' : '#67e8f9',
              transform: 'translate(-50%, -50%) scale(3)',
              opacity: 0,
              transition: 'all 0.4s ease-out',
            }}
          />
        ))}
      </div>

      <div className="text-center py-2 text-yellow-400 text-sm min-h-[24px]">{feedback}</div>
    </div>
  );
}

registerGame('focus-frenzy', {
  name: 'Focus Frenzy',
  emoji: '🔮',
  description: 'Tap the glowing orbs, but ignore the tricky distractions!',
  category: 'focus',
  stages: 10,
  component: FocusFrenzyGame,
});

export default FocusFrenzyGame;
