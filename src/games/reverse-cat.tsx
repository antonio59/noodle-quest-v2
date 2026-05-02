import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

const COLOR_DATA = [
  { color: '#ff6e6c', name: 'red', emoji: '🔴' },
  { color: '#4ade80', name: 'green', emoji: '🟢' },
  { color: '#67e8f9', name: 'blue', emoji: '🔵' },
  { color: '#fbbf24', name: 'yellow', emoji: '🟡' },
  { color: '#c084fc', name: 'purple', emoji: '🟣' },
  { color: '#f472b6', name: 'pink', emoji: '🩷' },
  { color: '#fb923c', name: 'orange', emoji: '🟠' },
  { color: '#a3e635', name: 'lime', emoji: '🟩' },
  { color: '#06b6d4', name: 'cyan', emoji: '💠' },
  { color: '#a0522d', name: 'brown', emoji: '🟤' },
];

const CONFIG: Record<number, { colors: number; startLength: number; maxRounds: number; speed: number }> = {
  1: { colors: 4, startLength: 2, maxRounds: 4, speed: 700 },
  2: { colors: 4, startLength: 2, maxRounds: 4, speed: 650 },
  3: { colors: 4, startLength: 3, maxRounds: 5, speed: 600 },
  4: { colors: 6, startLength: 3, maxRounds: 5, speed: 550 },
  5: { colors: 6, startLength: 3, maxRounds: 5, speed: 500 },
  6: { colors: 6, startLength: 3, maxRounds: 6, speed: 480 },
  7: { colors: 8, startLength: 4, maxRounds: 6, speed: 450 },
  8: { colors: 8, startLength: 4, maxRounds: 6, speed: 420 },
  9: { colors: 8, startLength: 4, maxRounds: 7, speed: 400 },
  10: { colors: 8, startLength: 5, maxRounds: 7, speed: 380 },
};

type Phase = 'intro' | 'watching' | 'playing' | 'done';

function ReverseCatGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = useMemo(() => scaleFromLast(stage, CONFIG, {
    colors: 0.15, startLength: 0.15, maxRounds: 0.1, speed: -0.15,
  }, {
    colors: 12, startLength: 8, maxRounds: 12, speed: 250,
  }), [stage]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const getColorCount = useCallback((seqLen: number): number => {
    const max = Math.min(config.colors, COLOR_DATA.length);
    if (seqLen <= 3) return Math.min(4, max);
    if (seqLen <= 5) return Math.min(6, max);
    if (seqLen <= 7) return Math.min(8, max);
    return max;
  }, [config.colors]);

  const colorCount = getColorCount(sequence.length);
  const [statusText, setStatusText] = useState('Watch carefully...');
  const [statusColor, setStatusColor] = useState('#67e8f9');
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#a78bfa');

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

  const finishGame = useCallback((finalScore: number, rounds: number, perfect: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const ratio = rounds / config.maxRounds;
    const stars = perfect ? 3 : ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
    let summary = perfect
      ? `Perfect reverse memory! All ${config.maxRounds} rounds! 🏆`
      : `You completed ${rounds} round${rounds !== 1 ? 's' : ''}! `;
    if (!perfect) {
      if (stars === 3) summary += 'Incredible reverse memory! Your brain works backwards! 🌟';
      else if (stars === 2) summary += 'Good reversal! Try mentally flipping the sequence before tapping.';
      else summary += 'Keep trying! Remember: the LAST color you see is the FIRST you tap.';
    }
    onEnd({ score: finalScore, stars, summary });
  }, [config.maxRounds, onEnd]);

  const playSequence = useCallback((seq: number[]) => {
    if (endedRef.current) return;
    setPhase('watching');
    setStatusText('👀 Watch the pattern...');
    setStatusColor('#67e8f9');
    setFeedback('');
    setPlayerIndex(0);

    seq.forEach((colorIdx, i) => {
      schedule(() => {
        setActiveIndex(colorIdx);
        schedule(() => setActiveIndex(null), config.speed * 0.4);
      }, i * config.speed);
    });

    schedule(() => {
      setPhase('playing');
      setStatusText('🔄 Tap in REVERSE order!');
      setStatusColor('#4ade80');
      setFeedback('Last color shown = your FIRST tap');
      setFeedbackColor('#4ade80');
    }, seq.length * config.speed);
  }, [config.speed, schedule]);

  const beginGame = useCallback(() => {
    const initialCount = getColorCount(config.startLength);
    const seq: number[] = [];
    for (let i = 0; i < config.startLength; i++) {
      seq.push(Math.floor(Math.random() * initialCount));
    }
    setSequence(seq);
    setScore(0);
    setPlayerIndex(0);
    setStatusText('3...');
    setStatusColor('#fbbf24');
    schedule(() => { setStatusText('2...'); }, 800);
    schedule(() => { setStatusText('1...'); }, 1600);
    schedule(() => {
      setStatusText('Watch carefully...');
      setStatusColor('#67e8f9');
      playSequence(seq);
    }, 2400);
  }, [config.startLength, getColorCount, playSequence, schedule]);

  const nextRound = useCallback((currentSeq: number[]) => {
    const nextCount = getColorCount(currentSeq.length + 1);
    const newSeq = [...currentSeq, Math.floor(Math.random() * nextCount)];
    setSequence(newSeq);
    const currentRound = newSeq.length - config.startLength + 1;
    onProgress(currentRound / config.maxRounds);
    schedule(() => playSequence(newSeq), 700);
  }, [config.startLength, config.maxRounds, getColorCount, playSequence, onProgress, schedule]);

  const handleTap = useCallback((index: number) => {
    if (phase !== 'playing') return;

    setActiveIndex(index);
    schedule(() => setActiveIndex(null), 250);

    const expectedIndex = sequence.length - 1 - playerIndex;
    if (index !== sequence[expectedIndex]) {
      setPhase('done');
      setStatusText('❌ Oops! Wrong button!');
      setStatusColor('#ff6e6c');
      const rounds = sequence.length - config.startLength;
      finishGame(score, rounds, false);
      return;
    }

    const newScore = score + 20;
    const newPlayerIndex = playerIndex + 1;
    setScore(newScore);
    setPlayerIndex(newPlayerIndex);
    onScore(20);
    setFeedback(`✓ ${newPlayerIndex}/${sequence.length} reversed`);
    setFeedbackColor('#4ade80');

    if (newPlayerIndex >= sequence.length) {
      const currentRound = sequence.length - config.startLength + 1;
      if (currentRound >= config.maxRounds) {
        setPhase('done');
        setStatusText('🎉 Amazing! You won!');
        onProgress(1);
        finishGame(newScore + 100, currentRound, true);
      } else {
        setStatusText('✨ Perfect! Get ready for more...');
        setFeedback('+1 color added, still reversed!');
        setFeedbackColor('#fbbf24');
        nextRound(sequence);
      }
    }
  }, [phase, sequence, playerIndex, score, config, onScore, onProgress, nextRound, schedule, finishGame]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-6xl">🔄</div>
        <h2 className="text-2xl font-bold text-accent">Reverse Cat</h2>
        <p className="text-text-dim max-w-xs">Watch the sequence light up — then tap the colors in <span className="text-warning font-bold">reverse</span> order!</p>

        <div className="bg-card rounded-xl p-4 max-w-xs w-full">
          <div className="text-warning font-bold mb-3">Up to {config.maxRounds} rounds</div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-1">🔴🟢🔵</div>
              <div className="text-text-muted text-xs">Shown order</div>
            </div>
            <div className="text-accent text-xl">→</div>
            <div className="text-center">
              <div className="text-2xl mb-1">🔵🟢🔴</div>
              <div className="text-cyan-400 text-xs font-bold">Tap reversed!</div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-3 max-w-xs w-full text-sm text-text-dim">
          💡 Tip: Count backwards as you watch! "3, 2, 1..." then tap in that order.
        </div>

        <button
          onClick={beginGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start! 🔄
        </button>
      </div>
    );
  }

  const currentRound = sequence.length - config.startLength + 1;
  const cols = colorCount <= 4 ? 2 : colorCount <= 6 ? 3 : colorCount <= 8 ? 4 : 5;
  const size = colorCount >= 8 ? 56 : 80;

  const progressDots = Array.from({ length: sequence.length }, (_, i) => ({
    filled: i < playerIndex,
    active: i === playerIndex && phase === 'playing',
  }));

  return (
    <div className="h-full flex flex-col items-center p-4 gap-3">
      <div className="flex gap-4 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round {Math.max(1, currentRound)}/{config.maxRounds}</span>
        <span className="text-accent">Score: {score}</span>
      </div>

      <div className="text-base min-h-[28px] font-medium" style={{ color: statusColor }}>
        {statusText}
      </div>

      {phase === 'playing' && (
        <div className="flex gap-1.5 items-center min-h-[18px]">
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
      )}

      <div
        className="grid gap-2 p-4 bg-card rounded-2xl shadow-lg"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {COLOR_DATA.slice(0, colorCount).map((c, i) => (
          <button
            key={i}
            onPointerDown={() => handleTap(i)}
            disabled={phase !== 'playing'}
            className="rounded-xl text-2xl border-none transition-all duration-100 active:scale-90 disabled:cursor-default select-none"
            style={{
              width: size,
              height: size,
              background: c.color,
              opacity: activeIndex === i ? 1 : phase === 'watching' ? 0.4 : 0.65,
              transform: activeIndex === i ? 'scale(0.88)' : 'scale(1)',
              boxShadow: activeIndex === i
                ? `0 0 28px ${c.color}, 0 0 10px ${c.color}99`
                : '0 4px 0 rgba(0,0,0,0.3)',
              cursor: phase === 'playing' ? 'pointer' : 'default',
            }}
          >
            {c.emoji}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="text-sm text-center" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

export default ReverseCatGame;
