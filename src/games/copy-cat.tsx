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
  const [feedback, setFeedback] = useState('');
  const [colorCount, setColorCount] = useState(4);

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
      onMessage('🖐️ Your turn! Repeat it!');
      setFeedback(`Tap ${seq.length} colors in the same order`);
    }, seq.length * config.speed);
  }, [config.speed, onMessage, schedule]);

  const startGame = useCallback(() => {
    const options = [4, 6, 8, 10].filter(n => n <= Math.min(config.colors, COLOR_DATA.length));
    const count = options[Math.floor(Math.random() * options.length)] || 4;
    setColorCount(count);
    const seq = generateSequence(config.startLength, count);
    setSequence(seq);
    setScore(0);
    setRound(1);
    setPlayerIndex(0);
    schedule(() => playSequence(seq), 500);
  }, [config.colors, config.startLength, generateSequence, playSequence, schedule]);

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
    schedule(() => setActiveIndex(null), 150);

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
    setFeedback(`✓ ${newPlayerIndex}/${sequence.length} correct`);

    if (newPlayerIndex >= sequence.length) {
      const currentRound = sequence.length - config.startLength + 1;
      if (currentRound >= config.maxRounds) {
        setPhase('done');
        onProgress(1);
        finishGame(newScore + 100, currentRound, true);
      } else {
        onMessage('✨ Perfect! Get ready for more...');
        setFeedback('+1 color coming up!');
        const newSeq = [...sequence, Math.floor(Math.random() * colorCount)];
        setSequence(newSeq);
        setRound(currentRound + 1);
        setPlayerIndex(0);
        onProgress(currentRound / config.maxRounds);
        schedule(() => playSequence(newSeq), 700);
      }
    }
  }, [phase, sequence, playerIndex, score, config, colorCount, onScore, onProgress, onMessage, playSequence, schedule, finishGame]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🐱</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Copy Cat</h2>
        <p className="text-text-dim mb-6 max-w-xs">Watch the pattern light up, then repeat it!</p>
        <div className="flex gap-2 mb-6">
          {COLOR_DATA.slice(0, colorCount).map((c, i) => (
            <div key={i} className="w-8 h-8 rounded-lg" style={{ background: c.color }} />
          ))}
        </div>
        <p className="text-text-muted text-sm mb-6">👀 Watch → 🖐️ Repeat → 🎉 Next round!</p>
        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start! 🐱
        </button>
      </div>
    );
  }

  const cols = colorCount <= 4 ? 2 : colorCount <= 6 ? 3 : colorCount <= 8 ? 4 : 5;

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-3 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round: {round}</span>
        <span className="text-accent">Score: {score}</span>
      </div>

      <div className="text-text-dim text-sm mb-3 min-h-[24px]">
        {phase === 'watching' && '👀 Watch the pattern...'}
        {phase === 'playing' && '🖐️ Your turn!'}
      </div>

      <div
        className="grid gap-2 p-4 bg-card rounded-2xl"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {COLOR_DATA.slice(0, colorCount).map((c, i) => (
          <button
            key={i}
            onPointerDown={() => handleTap(i)}
            className="w-16 h-16 rounded-xl text-2xl transition-all duration-150 active:scale-90"
            style={{
              background: c.color,
              opacity: activeIndex === i ? 1 : 0.5,
              transform: activeIndex === i ? 'scale(0.92)' : 'scale(1)',
              boxShadow: activeIndex === i ? `0 0 25px ${c.color}` : '0 4px 0 rgba(0,0,0,0.3)',
            }}
          >
            {c.emoji}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="text-text-dim text-sm mt-3 text-center">{feedback}</div>
      )}
    </div>
  );
}

export default CopyCatGame;
