import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const COLOR_DATA = [
  { color: '#ff6e6c', name: 'red', emoji: '🔴' },
  { color: '#4ade80', name: 'green', emoji: '🟢' },
  { color: '#67e8f9', name: 'blue', emoji: '🔵' },
  { color: '#fbbf24', name: 'yellow', emoji: '🟡' },
  { color: '#c084fc', name: 'purple', emoji: '🟣' },
  { color: '#f472b6', name: 'pink', emoji: '🩷' },
  { color: '#fb923c', name: 'orange', emoji: '🟠' },
  { color: '#a3e635', name: 'lime', emoji: '🟩' },
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

type Phase = 'watching' | 'playing' | 'done';

function ReverseCatGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const colors = COLOR_DATA.slice(0, config.colors);

  const [phase, setPhase] = useState<Phase>('watching');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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
    setFeedbackColor('#a78bfa');
    setPlayerIndex(0);

    seq.forEach((colorIdx, i) => {
      schedule(() => {
        setActiveIndex(colorIdx);
        schedule(() => setActiveIndex(null), config.speed * 0.4);
      }, i * config.speed);
    });

    schedule(() => {
      setPhase('playing');
      setStatusText('🔄 Your turn! Tap in REVERSE order!');
      setStatusColor('#4ade80');
      setFeedback('Last color shown = your FIRST tap');
      setFeedbackColor('#4ade80');
    }, seq.length * config.speed);
  }, [config.speed, schedule]);

  const startGame = useCallback(() => {
    const seq: number[] = [];
    for (let i = 0; i < config.startLength; i++) {
      seq.push(Math.floor(Math.random() * config.colors));
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
  }, [config, playSequence, schedule]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const nextRound = useCallback((currentSeq: number[]) => {
    const newSeq = [...currentSeq, Math.floor(Math.random() * config.colors)];
    setSequence(newSeq);
    const currentRound = newSeq.length - config.startLength + 1;
    onProgress(currentRound / config.maxRounds);
    schedule(() => playSequence(newSeq), 700);
  }, [config, playSequence, onProgress, schedule]);

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
    setFeedback(`✓ ${newPlayerIndex}/${sequence.length} correct`);
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
        setFeedback('+1 color coming up!');
        setFeedbackColor('#fbbf24');
        nextRound(sequence);
      }
    }
  }, [phase, sequence, playerIndex, score, config, onScore, onProgress, nextRound, schedule, finishGame]);

  const currentRound = sequence.length - config.startLength + 1;
  const cols = config.colors <= 4 ? 2 : config.colors <= 6 ? 3 : 4;
  const size = config.colors >= 8 ? 65 : 80;

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round: {Math.max(1, currentRound)}</span>
        <span className="text-accent">Score: {score}</span>
      </div>

      <div className="text-lg py-2 min-h-[30px]" style={{ color: statusColor }}>
        {statusText}
      </div>

      <div
        className="grid gap-2 p-4 bg-card rounded-2xl"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {colors.map((c, i) => (
          <button
            key={i}
            onPointerDown={() => handleTap(i)}
            disabled={phase !== 'playing'}
            className="rounded-xl text-2xl border-none transition-all duration-150 active:scale-90 disabled:cursor-default"
            style={{
              width: size,
              height: size,
              background: c.color,
              opacity: activeIndex === i ? 1 : 0.5,
              transform: activeIndex === i ? 'scale(0.92)' : 'scale(1)',
              boxShadow: activeIndex === i ? `0 0 25px ${c.color}` : '0 4px 0 rgba(0,0,0,0.3)',
              cursor: phase === 'playing' ? 'pointer' : 'default',
            }}
          >
            {c.emoji}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="text-sm mt-2 text-center" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

export default ReverseCatGame;
