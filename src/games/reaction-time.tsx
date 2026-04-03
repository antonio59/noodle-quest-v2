import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type ScreenPhase = 'idle' | 'waiting' | 'ready' | 'tooEarly' | 'result';
type GamePhase = 'intro' | 'playing' | 'done';

const CONFIG: Record<number, { rounds: number; minDelay: number; maxDelay: number; fakeOutChance: number }> = {
  1: { rounds: 5, minDelay: 2000, maxDelay: 4000, fakeOutChance: 0 },
  2: { rounds: 5, minDelay: 1800, maxDelay: 3800, fakeOutChance: 0 },
  3: { rounds: 6, minDelay: 1500, maxDelay: 3500, fakeOutChance: 0 },
  4: { rounds: 6, minDelay: 1200, maxDelay: 3200, fakeOutChance: 0.1 },
  5: { rounds: 7, minDelay: 1000, maxDelay: 3000, fakeOutChance: 0.1 },
  6: { rounds: 7, minDelay: 800, maxDelay: 2800, fakeOutChance: 0.15 },
  7: { rounds: 8, minDelay: 700, maxDelay: 2500, fakeOutChance: 0.15 },
  8: { rounds: 8, minDelay: 600, maxDelay: 2300, fakeOutChance: 0.2 },
  9: { rounds: 8, minDelay: 500, maxDelay: 2000, fakeOutChance: 0.2 },
  10: { rounds: 9, minDelay: 400, maxDelay: 1800, fakeOutChance: 0.25 },
  11: { rounds: 9, minDelay: 350, maxDelay: 1600, fakeOutChance: 0.25 },
  12: { rounds: 10, minDelay: 300, maxDelay: 1500, fakeOutChance: 0.3 },
  13: { rounds: 10, minDelay: 250, maxDelay: 1400, fakeOutChance: 0.3 },
  14: { rounds: 10, minDelay: 200, maxDelay: 1200, fakeOutChance: 0.35 },
  15: { rounds: 11, minDelay: 200, maxDelay: 1000, fakeOutChance: 0.35 },
  16: { rounds: 11, minDelay: 150, maxDelay: 900, fakeOutChance: 0.4 },
  17: { rounds: 12, minDelay: 150, maxDelay: 800, fakeOutChance: 0.4 },
  18: { rounds: 12, minDelay: 100, maxDelay: 700, fakeOutChance: 0.45 },
  19: { rounds: 12, minDelay: 100, maxDelay: 600, fakeOutChance: 0.5 },
  20: { rounds: 15, minDelay: 100, maxDelay: 500, fakeOutChance: 0.5 },
};

const TIPS = [
  "💡 Tip: Stay relaxed and focused — tension slows you down!",
  "💡 Tip: Keep your finger hovering just above the screen.",
  "💡 Tip: Watch for the exact moment the color changes.",
  "💡 Tip: Don't anticipate — wait for the actual green!",
  "💡 Tip: Take a deep breath between rounds to reset your focus.",
];

function ReactionTimeGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('idle');
  const [round, setRound] = useState(1);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [lastReaction, setLastReaction] = useState(0);
  const [fakeOuts, setFakeOuts] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const roundRef = useRef(1);
  const timesRef = useRef<number[]>([]);
  const fakeOutsRef = useRef(0);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fakeOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFakeOutRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fakeOutTimeoutRef.current) clearTimeout(fakeOutTimeoutRef.current);
    timeoutRef.current = null;
    fakeOutTimeoutRef.current = null;
  }, []);

  const startRound = useCallback(() => {
    if (!gameActiveRef.current) return;
    setScreenPhase('waiting');
    isFakeOutRef.current = false;

    const delay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay);

    if (Math.random() < config.fakeOutChance) {
      const fakeOutDelay = delay * (0.3 + Math.random() * 0.4);
      fakeOutTimeoutRef.current = setTimeout(() => {
        if (!gameActiveRef.current) return;
        isFakeOutRef.current = true;
        setScreenPhase('ready');
        setTimeout(() => {
          if (!gameActiveRef.current) return;
          setScreenPhase('waiting');
          isFakeOutRef.current = false;
        }, 300 + Math.random() * 200);
      }, fakeOutDelay);
    }

    timeoutRef.current = setTimeout(() => {
      if (!gameActiveRef.current) return;
      setScreenPhase('ready');
      startTimeRef.current = Date.now();
    }, delay);
  }, [config]);

  const handleTap = useCallback(() => {
    if (!gameActiveRef.current) return;

    if (screenPhase === 'waiting') {
      clearTimers();
      setScreenPhase('tooEarly');
      fakeOutsRef.current++;
      setFakeOuts(fakeOutsRef.current);
      setTimeout(() => {
        if (gameActiveRef.current) startRound();
      }, 1000);
      return;
    }

    if (screenPhase === 'ready' && !isFakeOutRef.current) {
      const reactionTime = Date.now() - startTimeRef.current;
      timesRef.current.push(reactionTime);
      setLastReaction(reactionTime);
      setReactionTimes([...timesRef.current]);

      const points = Math.max(5, Math.floor(50 - reactionTime / 10));
      onScore(points);

      setScreenPhase('result');
      onProgress(roundRef.current / config.rounds);

      setTimeout(() => {
        if (!gameActiveRef.current) return;
        roundRef.current++;
        setRound(roundRef.current);

        if (roundRef.current > config.rounds) {
          gameActiveRef.current = false;
          const avg = timesRef.current.reduce((a, b) => a + b, 0) / timesRef.current.length;
          const stars = avg < 300 && fakeOutsRef.current === 0 ? 3 : avg < 400 ? 2 : 1;
          const summary = `Average reaction: ${Math.round(avg)}ms with ${fakeOutsRef.current} false start${fakeOutsRef.current !== 1 ? 's' : ''}. ${avg < 300 ? 'Lightning fast! ⚡' : avg < 400 ? 'Great reflexes!' : 'Keep practicing to get faster!'}`;
          onEnd({ score: timesRef.current.reduce((a, b) => a + Math.max(5, Math.floor(50 - b / 10)), 0), stars, summary });
        } else {
          setScreenPhase('idle');
          setTimeout(() => startRound(), 500);
        }
      }, 1200);
    }
  }, [screenPhase, config, onScore, onProgress, onEnd, startRound, clearTimers]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    roundRef.current = 1;
    timesRef.current = [];
    fakeOutsRef.current = 0;
    setRound(1);
    setReactionTimes([]);
    setFakeOuts(0);
    setLastReaction(0);
    setPhase('playing');
    setScreenPhase('idle');
    setTimeout(() => startRound(), 500);
  }, [startRound]);

  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">Reaction Time</h2>
        <p className="text-green-300 mb-4 max-w-xs">Wait for GREEN, then tap as fast as you can!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-500" />
            <span className="text-red-400">Wait for it...</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500" />
            <span className="text-green-400">TAP NOW! ⚡</span>
          </div>
          {config.fakeOutChance > 0 && (
            <div className="text-yellow-400 mt-2">⚠️ Watch out for fake-outs!</div>
          )}
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-cyan-300 text-sm">{config.rounds} rounds • Average will be calculated</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! ⚡
        </button>
      </div>
    );
  }

  const avgTime = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  const bgColor = screenPhase === 'waiting'
    ? 'bg-red-500'
    : screenPhase === 'ready'
      ? 'bg-green-500'
      : screenPhase === 'tooEarly'
        ? 'bg-yellow-500'
        : screenPhase === 'result'
          ? 'bg-blue-500'
          : 'bg-[#232146]';

  const message = screenPhase === 'waiting'
    ? 'Wait for GREEN...'
    : screenPhase === 'ready'
      ? 'TAP NOW! 🎯'
      : screenPhase === 'tooEarly'
        ? 'Too early! 😬 Wait for green!'
        : screenPhase === 'result'
          ? `${lastReaction}ms!`
          : `Tap to start round ${round}`;

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-2 w-full justify-center">
        <span className="text-green-400 font-bold">Round: {round}/{config.rounds}</span>
        <span className="text-cyan-300">Avg: {avgTime}ms</span>
        {fakeOuts > 0 && <span className="text-yellow-400">⚠️ {fakeOuts}</span>}
      </div>

      <div
        onPointerDown={(e) => { e.stopPropagation(); handleTap(); }}
        className={`flex-1 min-h-[280px] flex flex-col items-center justify-center cursor-pointer select-none transition-colors duration-150 ${bgColor}`}
      >
        <div className="text-5xl md:text-7xl font-black text-white mb-4">
          {screenPhase === 'result' ? '⚡' : screenPhase === 'tooEarly' ? '😬' : screenPhase === 'ready' ? '🎯' : '🔴'}
        </div>
        <div className="text-2xl md:text-4xl font-bold text-white text-center px-4">
          {message}
        </div>
        {screenPhase === 'result' && (
          <div className="text-white/80 mt-2 text-lg">
            {lastReaction < 200 ? '🔥 Incredible!' : lastReaction < 300 ? '⚡ Fast!' : lastReaction < 400 ? '👍 Good!' : 'Keep practicing!'}
          </div>
        )}
      </div>

      {reactionTimes.length > 0 && (
        <div className="px-4 py-2 bg-[#232146] rounded-b-xl">
          <div className="flex flex-wrap gap-1 justify-center">
            {reactionTimes.map((t, i) => (
              <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${t < 300 ? 'bg-green-500/30 text-green-400' : t < 400 ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'}`}>
                {t}ms
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

registerGame('reaction-time', {
  name: 'Reaction Time',
  emoji: '⚡',
  description: 'Wait for green, then tap as fast as you can!',
  category: 'focus',
  stages: 20,
  component: ReactionTimeGame,
});

export default ReactionTimeGame;
