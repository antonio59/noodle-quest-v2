import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const COLOR_DATA = [
  { color: '#ff6e6c', emoji: '🔴' },
  { color: '#4ade80', emoji: '🟢' },
  { color: '#67e8f9', emoji: '🔵' },
  { color: '#fbbf24', emoji: '🟡' },
  { color: '#c084fc', emoji: '🟣' },
  { color: '#f472b6', emoji: '🩷' },
  { color: '#fb923c', emoji: '🟠' },
  { color: '#a3e635', emoji: '🟩' },
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
  const config = CONFIG[stage] || CONFIG[10];
  const colors = COLOR_DATA.slice(0, config.colors);
  const [phase, setPhase] = useState<Phase>('intro');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const generateSequence = useCallback((length: number) => {
    return Array.from({ length }, () => Math.floor(Math.random() * config.colors));
  }, [config.colors]);

  const playSequence = useCallback((seq: number[]) => {
    setPhase('watching');
    onMessage('👀 Watch the pattern...');
    setFeedback('');
    setPlayerIndex(0);

    seq.forEach((colorIdx, i) => {
      setTimeout(() => {
        setActiveIndex(colorIdx);
        setTimeout(() => setActiveIndex(null), config.speed * 0.4);
      }, i * config.speed);
    });

    setTimeout(() => {
      setPhase('playing');
      onMessage('🖐️ Your turn! Repeat it!');
      setFeedback(`Tap ${seq.length} colors in the same order`);
    }, seq.length * config.speed);
  }, [config.speed, onMessage]);

  const startGame = useCallback(() => {
    const seq = generateSequence(config.startLength);
    setSequence(seq);
    setScore(0);
    setRound(1);
    setPlayerIndex(0);
    setTimeout(() => playSequence(seq), 500);
  }, [config.startLength, generateSequence, playSequence]);

  const handleTap = useCallback((index: number) => {
    if (phase !== 'playing') return;

    setActiveIndex(index);
    setTimeout(() => setActiveIndex(null), 150);

    if (index !== sequence[playerIndex]) {
      setPhase('done');
      const rounds = sequence.length - config.startLength;
      const stars = rounds >= config.maxRounds - 1 ? 3 : rounds >= Math.floor(config.maxRounds / 2) ? 2 : 1;
      let summary = `You completed ${rounds} round${rounds !== 1 ? 's' : ''}! `;
      if (stars === 3) summary += 'Almost perfect! 🌟';
      else if (stars === 2) summary += 'Good job! Try saying the colors out loud.';
      else summary += 'Keep practicing! Focus on the first few colors.';
      onEnd({ score, stars, summary });
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
        onEnd({ score: newScore + 100, stars: 3, summary: `Perfect! All ${config.maxRounds} rounds! 🏆` });
      } else {
        onMessage('✨ Perfect! Get ready for more...');
        setFeedback('+1 color coming up!');
        const newSeq = [...sequence, Math.floor(Math.random() * config.colors)];
        setSequence(newSeq);
        setRound(currentRound + 1);
        setPlayerIndex(0);
        onProgress(currentRound / config.maxRounds);
        setTimeout(() => playSequence(newSeq), 700);
      }
    }
  }, [phase, sequence, playerIndex, score, config, onScore, onProgress, onMessage, onEnd, playSequence]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🐱</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Copy Cat</h2>
        <p className="text-text-dim mb-6 max-w-xs">Watch the pattern light up, then repeat it!</p>
        <div className="flex gap-2 mb-6">
          {colors.map((c, i) => (
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

  const cols = config.colors <= 4 ? 2 : config.colors <= 6 ? 3 : 4;

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
        {colors.map((c, i) => (
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
