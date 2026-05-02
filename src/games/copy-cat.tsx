import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

const COLOR_DATA = [
  { color: '#ff6e6c', emoji: '🔴' },
  { color: '#4ade80', emoji: '🟢' },
  { color: '#67e8f9', emoji: '🔵' },
  { color: '#fbbf24', emoji: '🟡' },
  { color: '#c084fc', emoji: '🟣' },
  { color: '#f472b6', emoji: '🩷' },
  { color: '#fb923c', emoji: '🟠' },
  { color: '#a3e635', emoji: '🟩' },
  { color: '#06b6d4', emoji: '💠' },
  { color: '#a0522d', emoji: '🟤' },
];

const CONFIG: Record<number, { colors: number; startLength: number; maxRounds: number; speed: number }> = {
  1: { colors: 4, startLength: 2, maxRounds: 4, speed: 700 },
  2: { colors: 4, startLength: 2, maxRounds: 5, speed: 650 },
  3: { colors: 4, startLength: 3, maxRounds: 5, speed: 600 },
  4: { colors: 6, startLength: 3, maxRounds: 5, speed: 550 },
  5: { colors: 6, startLength: 3, maxRounds: 6, speed: 500 },
  6: { colors: 6, startLength: 4, maxRounds: 6, speed: 480 },
  7: { colors: 8, startLength: 4, maxRounds: 6, speed: 450 },
  8: { colors: 8, startLength: 4, maxRounds: 7, speed: 420 },
  9: { colors: 8, startLength: 5, maxRounds: 7, speed: 400 },
  10: { colors: 8, startLength: 5, maxRounds: 8, speed: 380 },
};

type Phase = 'intro' | 'watching' | 'playing' | 'done';

function CopyCatGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = useMemo(() => scaleFromLast(stage, CONFIG, {
    colors: 0.15, startLength: 0.15, maxRounds: 0.1, speed: -0.15,
  }, {
    colors: 12, startLength: 8, maxRounds: 12, speed: 250,
  }), [stage]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  const getColorCount = useCallback((seqLen: number): number => {
    const max = Math.min(config.colors, COLOR_DATA.length);
    if (seqLen <= 3) return Math.min(4, max);
    if (seqLen <= 5) return Math.min(6, max);
    if (seqLen <= 7) return Math.min(8, max);
    return max;
  }, [config.colors]);

  const colorCount = getColorCount(sequence.length);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const generateSequence = useCallback((length: number, count: number) => {
    return Array.from({ length }, () => Math.floor(Math.random() * count));
  }, []);

  const playSequence = useCallback((seq: number[]) => {
    if (endedRef.current) return;
    setPhase('watching');
    onMessage('👀 Watch the pattern...');
    setPlayerIndex(0);

    seq.forEach((colorIdx, i) => {
      schedule(() => {
        setActiveIndex(colorIdx);
        setFlashIndex(colorIdx);
        schedule(() => {
          setActiveIndex(null);
          setFlashIndex(null);
        }, config.speed * 0.4);
      }, i * config.speed);
    });

    schedule(() => {
      setPhase('playing');
      onMessage('🖐️ Your turn! Repeat it!');
    }, seq.length * config.speed);
  }, [config.speed, onMessage, schedule]);

  const startGame = useCallback(() => {
    const initialCount = getColorCount(config.startLength);
    const seq = generateSequence(config.startLength, initialCount);
    setSequence(seq);
    setScore(0);
    setRound(1);
    setPlayerIndex(0);
    schedule(() => playSequence(seq), 500);
  }, [config.startLength, getColorCount, generateSequence, playSequence, schedule]);

  const finishGame = useCallback((finalScore: number, rounds: number, perfect: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const ratio = rounds / config.maxRounds;
    const stars = perfect ? 3 : ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
    let summary = `You completed ${rounds} round${rounds !== 1 ? 's' : ''}! `;
    if (perfect) summary = `Perfect! All ${config.maxRounds} rounds! 🏆`;
    else if (stars === 3) summary += 'Almost perfect! 🌟';
    else if (stars === 2) summary += 'Good job! Try saying the colors out loud.';
    else summary += 'Keep practicing! Focus on the first few colors.';
    onEnd({ score: finalScore, stars, summary });
  }, [config.maxRounds, onEnd]);

  const handleTap = useCallback((index: number) => {
    if (phase !== 'playing') return;

    setActiveIndex(index);
    setFlashIndex(index);
    schedule(() => {
      setActiveIndex(null);
      setFlashIndex(null);
    }, 150);

    if (index !== sequence[playerIndex]) {
      setPhase('done');
      const rounds = sequence.length - config.startLength;
      finishGame(score, rounds, false);
      return;
    }

    const newScore = score + 15;
    setScore(newScore);
    onScore(15);
    const newPlayerIndex = playerIndex + 1;
    setPlayerIndex(newPlayerIndex);

    if (newPlayerIndex >= sequence.length) {
      const currentRound = sequence.length - config.startLength + 1;
      if (currentRound >= config.maxRounds) {
        setPhase('done');
        onProgress(1);
        finishGame(newScore + 100, currentRound, true);
      } else {
        onMessage('✨ Perfect! Get ready for more...');
        const nextCount = getColorCount(sequence.length + 1);
        const newSeq = [...sequence, Math.floor(Math.random() * nextCount)];
        setSequence(newSeq);
        setRound(currentRound + 1);
        setPlayerIndex(0);
        onProgress(currentRound / config.maxRounds);
        schedule(() => playSequence(newSeq), 700);
      }
    }
  }, [phase, sequence, playerIndex, score, config, getColorCount, onScore, onProgress, onMessage, playSequence, schedule, finishGame]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-6xl">🐱</div>
        <h2 className="text-2xl font-bold text-accent">Copy Cat</h2>
        <p className="text-text-dim max-w-xs">Watch the pattern light up, then repeat it in the same order!</p>

        <div className="bg-card rounded-xl p-4 max-w-xs w-full">
          <div className="text-warning font-bold mb-2">Up to {config.maxRounds} rounds</div>
          <div className="flex gap-2 justify-center flex-wrap mb-2">
            {COLOR_DATA.slice(0, 4).map((c, i) => (
              <div key={i} className="w-9 h-9 rounded-lg text-xl flex items-center justify-center" style={{ background: c.color }}>
                {c.emoji}
              </div>
            ))}
          </div>
          <div className="text-text-muted text-sm">More colors unlock as rounds progress!</div>
        </div>

        <div className="flex items-center gap-3 text-sm text-text-dim">
          <span>👀 Watch</span>
          <span className="text-accent">→</span>
          <span>🖐️ Repeat</span>
          <span className="text-accent">→</span>
          <span>🎉 Level up!</span>
        </div>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start! 🐱
        </button>
      </div>
    );
  }

  const cols = colorCount <= 4 ? 2 : colorCount <= 6 ? 3 : colorCount <= 8 ? 4 : 5;

  const progressDots = Array.from({ length: sequence.length }, (_, i) => ({
    filled: i < playerIndex,
    active: i === playerIndex && phase === 'playing',
  }));

  return (
    <div className="h-full flex flex-col items-center p-4 gap-3">
      <div className="flex gap-4 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round {round}/{config.maxRounds}</span>
        <span className="text-accent">Score: {score}</span>
        <span className="text-cyan-400 text-sm">
          {phase === 'watching' ? '👀 Watch' : '🖐️ Tap!'}
        </span>
      </div>

      <div className="flex gap-1.5 items-center min-h-[20px]">
        {progressDots.map((dot, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-150"
            style={{
              width: dot.active ? 14 : 10,
              height: dot.active ? 14 : 10,
              background: dot.filled ? '#4ade80'
                : dot.active ? '#fbbf24'
                : 'rgba(255,255,255,0.15)',
              boxShadow: dot.active ? '0 0 8px #fbbf24' : dot.filled ? '0 0 6px #4ade80' : 'none',
            }}
          />
        ))}
      </div>

      <div
        className="grid gap-2 p-4 bg-card rounded-2xl shadow-lg"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {COLOR_DATA.slice(0, colorCount).map((c, i) => (
          <button
            key={i}
            onPointerDown={() => handleTap(i)}
            disabled={phase !== 'playing'}
            className="w-16 h-16 rounded-xl text-2xl transition-all duration-100 disabled:cursor-default select-none"
            style={{
              background: c.color,
              opacity: flashIndex === i ? 1 : phase === 'watching' ? 0.4 : 0.65,
              transform: flashIndex === i ? 'scale(0.88)' : 'scale(1)',
              boxShadow: flashIndex === i
                ? `0 0 28px ${c.color}, 0 0 10px ${c.color}99`
                : '0 4px 0 rgba(0,0,0,0.3)',
            }}
          >
            {c.emoji}
          </button>
        ))}
      </div>

      <div className="text-text-muted text-xs text-center min-h-[16px]">
        {phase === 'playing' && playerIndex < sequence.length
          ? `${playerIndex}/${sequence.length} tapped`
          : phase === 'watching'
            ? 'Memorize the order...'
            : ''}
      </div>
    </div>
  );
}

export default CopyCatGame;
