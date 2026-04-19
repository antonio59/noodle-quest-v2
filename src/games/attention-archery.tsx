import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

interface ArcheryTarget {
  id: number;
  x: number;
  y: number;
  isTarget: boolean;
  color: string;
  pos: number;
  moveOffset: number;
  hit: boolean;
  hitAnim: boolean;
}

type Phase = 'playing' | 'done';

const CONFIG: Record<number, { spawnRate: number; duration: number; speed: number; move: boolean; decoyChance: number }> = {
  1: { spawnRate: 1800, duration: 25000, speed: 2, move: false, decoyChance: 0.3 },
  2: { spawnRate: 1600, duration: 28000, speed: 2.5, move: false, decoyChance: 0.35 },
  3: { spawnRate: 1500, duration: 30000, speed: 3, move: false, decoyChance: 0.4 },
  4: { spawnRate: 1400, duration: 32000, speed: 3.5, move: false, decoyChance: 0.4 },
  5: { spawnRate: 1300, duration: 33000, speed: 4, move: true, decoyChance: 0.4 },
  6: { spawnRate: 1200, duration: 35000, speed: 4.5, move: true, decoyChance: 0.45 },
  7: { spawnRate: 1100, duration: 36000, speed: 5, move: true, decoyChance: 0.45 },
  8: { spawnRate: 1000, duration: 38000, speed: 5.5, move: true, decoyChance: 0.5 },
  9: { spawnRate: 900, duration: 40000, speed: 6, move: true, decoyChance: 0.5 },
  10: { spawnRate: 800, duration: 45000, speed: 7, move: true, decoyChance: 0.55 },
};

const TARGET_COLORS = ['#ff6e6c', '#c084fc', '#4ade80'];
const DECOY_COLORS = ['#ff8a88', '#d4a5ff', '#6ee7b7'];

const HIT_FEEDBACKS = ["Bullseye! 🎯", "Sharp shooter! 🏹", "Perfect aim! ⭐"];

let targetIdCounter = 0;

function AttentionArcheryGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = useMemo(() => scaleFromLast(stage, CONFIG, {
    spawnRate: -0.15, duration: 0.1, speed: 0.2, decoyChance: 0.1,
  }, {
    spawnRate: 400, duration: 70000, speed: 10, decoyChance: 0.85,
  }), [stage]);
  const [phase, setPhase] = useState<Phase>('playing');
  const [targets, setTargets] = useState<ArcheryTarget[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState('Hit the glowing targets! 🎯');
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const moveTimeRef = useRef(0);

  const spawnTarget = useCallback(() => {
    if (!gameActiveRef.current || !gameAreaRef.current) return;

    const isTarget = Math.random() > config.decoyChance;
    const colorIdx = Math.floor(Math.random() * 3);
    const color = isTarget ? TARGET_COLORS[colorIdx] : DECOY_COLORS[colorIdx];
    const maxY = Math.max(50, gameAreaRef.current.clientHeight - 70);
    const y = 10 + Math.random() * maxY;
    const id = ++targetIdCounter;

    const target: ArcheryTarget = { id, x: -50, y, isTarget, color, pos: -50, moveOffset: 0, hit: false, hitAnim: false };
    setTargets(prev => [...prev, target]);
  }, [config]);

  const handleTargetClick = useCallback((target: ArcheryTarget) => {
    if (!gameActiveRef.current || target.hit) return;

    setTargets(prev => prev.map(t =>
      t.id === target.id ? { ...t, hit: true, hitAnim: true } : t
    ));

    if (target.isTarget) {
      hitsRef.current++;
      setHits(hitsRef.current);
      scoreRef.current += 20;
      setScore(scoreRef.current);
      onScore(20);

      if (hitsRef.current % 4 === 0) {
        setFeedback(HIT_FEEDBACKS[Math.floor(Math.random() * HIT_FEEDBACKS.length)]);
      } else {
        setFeedback('+20 Hit! 🎯');
      }
    } else {
      missesRef.current++;
      setMisses(missesRef.current);
      scoreRef.current = Math.max(0, scoreRef.current - 10);
      setScore(scoreRef.current);
      setFeedback('💡 That was a decoy! Look for the bright glow.');
    }

    setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== target.id));
    }, 200);
  }, [onScore]);

  const startGame = useCallback(() => {
    setPhase('playing');
    gameActiveRef.current = true;
    scoreRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    moveTimeRef.current = 0;
    setScore(0);
    setHits(0);
    setMisses(0);
    setTargets([]);
    setFeedback('Hit the glowing targets! 🎯');
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const spawnTimer = setInterval(spawnTarget, config.spawnRate);
    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      if (gameActiveRef.current) {
        const elapsed = (Date.now() - startTime) / config.duration;
        onProgress(Math.min(elapsed, 1));
      }
    }, 500);

    const gameTimer = setTimeout(() => {
      gameActiveRef.current = false;
      clearInterval(spawnTimer);
      clearInterval(progressTimer);

      const total = hitsRef.current + missesRef.current;
      const accuracy = total > 0 ? hitsRef.current / total : 0;
      const stars = accuracy > 0.7 ? 3 : accuracy > 0.45 ? 2 : 1;

      let summary = `Bullseye! ${hitsRef.current} targets hit! `;
      if (accuracy > 0.7) summary += "You're an archery champion! Amazing focus on the right targets! 🏆";
      else if (accuracy > 0.45) summary += 'Good shooting! Remember: bright glow = real target!';
      else summary += 'Keep practicing! Focus on the GLOW to tell targets from decoys.';

      setPhase('done');
      onEnd({ score: scoreRef.current, stars, summary });
    }, config.duration);

    return () => {
      gameActiveRef.current = false;
      clearInterval(spawnTimer);
      clearInterval(progressTimer);
      clearTimeout(gameTimer);
    };
  }, [phase, config, spawnTarget, onProgress, onEnd]);

  // Animate targets moving across screen
  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      moveTimeRef.current += 16;

      setTargets(prev => {
        const updated = prev.map(t => {
          const newPos = t.pos + config.speed;
          const yOffset = config.move ? Math.sin(moveTimeRef.current * 0.003) * 25 : 0;
          return { ...t, pos: newPos, moveOffset: yOffset };
        });

        if (!gameAreaRef.current) return updated;

        return updated.filter(t => {
          if (t.pos > gameAreaRef.current!.clientWidth + 50) {
            if (t.isTarget && !t.hit) {
              missesRef.current++;
              setMisses(missesRef.current);
            }
            return false;
          }
          return true;
        });
      });
    }, 16);

    return () => clearInterval(interval);
  }, [phase, config]);

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-4 py-2 bg-[#232146] rounded-t-xl">
        <span className="text-green-400 font-bold">🎯 {hits}</span>
        <span className="text-yellow-400 text-sm">Score: {score}</span>
        <span className="text-red-400 font-bold">💨 {misses}</span>
      </div>

      <div
        ref={gameAreaRef}
        className="flex-1 min-h-[280px] relative overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #1a2e1a 0%, #232146 50%, #2e1a1a 100%)' }}
      >
        {targets.map(target => (
          <div
            key={target.id}
            onPointerDown={(e) => { e.stopPropagation(); handleTargetClick(target); }}
            className="absolute rounded-full border-2 border-white flex items-center justify-center text-2xl cursor-pointer"
            style={{
              width: 50,
              height: 50,
              left: target.pos,
              top: target.y,
              background: target.color,
              boxShadow: target.isTarget ? `0 0 15px ${target.color}` : 'none',
              opacity: target.hit ? 0 : target.isTarget ? 1 : 0.7,
              transform: `translateY(${target.moveOffset}px)${target.hitAnim ? ' scale(1.5)' : ''}`,
              transition: target.hitAnim ? 'transform 0.1s, opacity 0.2s' : 'none',
            }}
          >
            {target.isTarget ? '🎯' : '🎪'}
          </div>
        ))}
      </div>

      <div className="text-center py-2 text-purple-400 text-sm min-h-[24px]">{feedback}</div>
    </div>
  );
}

export default AttentionArcheryGame;
