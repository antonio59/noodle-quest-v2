import { useState, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const COLOR_DATA = [
  { color: '#ff6e6c', emoji: '🔴' },
  { color: '#4ade80', emoji: '🟢' },
  { color: '#67e8f9', emoji: '🔵' },
  { color: '#fbbf24', emoji: '🟡' },
  { color: '#c084fc', emoji: '🟣' },
  { color: '#f472b6', emoji: '🩷' },
  { color: '#fb923c', emoji: '🟠' },
  { color: '#a3e635', emoji: '🟩' },
  { color: '#38bdf8', emoji: '💎' },
  { color: '#f87171', emoji: '❤️' },
  { color: '#34d399', emoji: '💚' },
  { color: '#e879f9', emoji: '💜' },
];

const CONFIG: Record<number, { colors: number; startLength: number; maxRounds: number; speed: number; lives: number }> = {
  1:  { colors: 4,  startLength: 2, maxRounds: 4, speed: 700, lives: 3 },
  2:  { colors: 4,  startLength: 2, maxRounds: 5, speed: 650, lives: 3 },
  3:  { colors: 4,  startLength: 3, maxRounds: 5, speed: 600, lives: 3 },
  4:  { colors: 6,  startLength: 3, maxRounds: 5, speed: 550, lives: 2 },
  5:  { colors: 6,  startLength: 3, maxRounds: 6, speed: 500, lives: 2 },
  6:  { colors: 6,  startLength: 4, maxRounds: 6, speed: 480, lives: 2 },
  7:  { colors: 8,  startLength: 4, maxRounds: 6, speed: 450, lives: 2 },
  8:  { colors: 8,  startLength: 4, maxRounds: 7, speed: 420, lives: 2 },
  9:  { colors: 8,  startLength: 5, maxRounds: 7, speed: 400, lives: 1 },
  10: { colors: 8,  startLength: 5, maxRounds: 8, speed: 380, lives: 1 },
  11: { colors: 10, startLength: 5, maxRounds: 8, speed: 370, lives: 2 },
  12: { colors: 10, startLength: 6, maxRounds: 8, speed: 360, lives: 2 },
  13: { colors: 10, startLength: 6, maxRounds: 9, speed: 350, lives: 1 },
  14: { colors: 12, startLength: 6, maxRounds: 9, speed: 340, lives: 2 },
  15: { colors: 12, startLength: 7, maxRounds: 9, speed: 330, lives: 1 },
  16: { colors: 12, startLength: 7, maxRounds: 10, speed: 320, lives: 1 },
  17: { colors: 12, startLength: 8, maxRounds: 10, speed: 310, lives: 1 },
  18: { colors: 12, startLength: 8, maxRounds: 11, speed: 300, lives: 1 },
  19: { colors: 12, startLength: 9, maxRounds: 11, speed: 290, lives: 1 },
  20: { colors: 12, startLength: 10, maxRounds: 12, speed: 280, lives: 1 },
};

type Phase = 'intro' | 'watching' | 'playing' | 'retry' | 'done';

function CopyCatGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[20];
  const colors = COLOR_DATA.slice(0, config.colors);
  const [phase, setPhase] = useState<Phase>('intro');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [lives, setLives] = useState(config.lives);

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
      setFeedback(`Tap ${seq.length} colors in order`);
    }, seq.length * config.speed);
  }, [config.speed, onMessage]);

  const startGame = useCallback(() => {
    const seq = generateSequence(config.startLength);
    setSequence(seq);
    setScore(0);
    setRound(1);
    setPlayerIndex(0);
    setLives(config.lives);
    setTimeout(() => playSequence(seq), 500);
  }, [config.startLength, config.lives, generateSequence, playSequence]);

  const handleRetry = useCallback(() => {
    setFeedback('');
    setPlayerIndex(0);
    onMessage('🔄 Try again! Watch carefully...');
    setTimeout(() => playSequence(sequence), 500);
  }, [sequence, playSequence, onMessage]);

  const handleTap = useCallback((index: number) => {
    if (phase !== 'playing') return;

    setActiveIndex(index);
    setTimeout(() => setActiveIndex(null), 150);

    if (index !== sequence[playerIndex]) {
      // Wrong tap — use a life
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        // No more lives — game over
        setPhase('done');
        const rounds = sequence.length - config.startLength;
        const stars = rounds >= config.maxRounds - 1 ? 3 : rounds >= Math.floor(config.maxRounds / 2) ? 2 : 1;
        let summary = `You completed ${rounds} round${rounds !== 1 ? 's' : ''}! `;
        if (stars === 3) summary += 'Amazing memory! 🌟';
        else if (stars === 2) summary += 'Good job! Keep practicing to get 3 stars.';
        else summary += 'Try saying the colors out loud as you watch!';
        onEnd({ score, stars, summary });
      } else {
        // Still have lives — show retry
        setPhase('retry');
        onMessage(`❌ Oops! You have ${newLives} ${newLives === 1 ? 'life' : 'lives'} left`);
        setFeedback('Tap Try Again to replay this pattern');
      }
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
        const bonus = lives * 30;
        onEnd({ score: newScore + bonus + 100, stars: 3, summary: `Perfect! All ${config.maxRounds} rounds with ${lives} lives remaining! 🏆` });
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
  }, [phase, sequence, playerIndex, score, lives, config, onScore, onProgress, onMessage, onEnd, playSequence]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🐱</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Copy Cat</h2>
        <p className="text-text-dim mb-2 max-w-xs">Watch the pattern light up, then repeat it!</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-text-muted">Tiles: {config.colors}</span>
          <span className="text-text-muted">•</span>
          <span className="text-sm text-text-muted">Lives: {'❤️'.repeat(config.lives)}</span>
          <span className="text-text-muted">•</span>
          <span className="text-sm text-text-muted">Stage {stage}</span>
        </div>
        <div className="flex gap-2 mb-6 flex-wrap justify-center max-w-[240px]">
          {colors.map((c, i) => (
            <div key={i} className="w-8 h-8 rounded-lg" style={{ background: c.color }} />
          ))}
        </div>
        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start! 🐱
        </button>
      </div>
    );
  }

  if (phase === 'retry') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4 animate-[shake_0.4s_ease]">😅</div>
        <h2 className="text-xl font-bold text-warning mb-2">Not quite!</h2>
        <p className="text-text-dim mb-2">You have {lives} {lives === 1 ? 'life' : 'lives'} left</p>
        <div className="flex gap-1 mb-4">
          {Array.from({ length: config.lives }, (_, i) => (
            <span key={i} className={i < lives ? 'opacity-100' : 'opacity-20'}>❤️</span>
          ))}
        </div>
        <p className="text-text-muted text-sm mb-4">The pattern will replay — watch carefully!</p>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Try Again 🔄
          </button>
          <button
            onClick={() => {
              setPhase('done');
              const rounds = sequence.length - config.startLength;
              const stars = rounds >= config.maxRounds - 1 ? 3 : rounds >= Math.floor(config.maxRounds / 2) ? 2 : 1;
              onEnd({ score, stars, summary: `You completed ${rounds} round${rounds !== 1 ? 's' : ''}. Keep practicing!` });
            }}
            className="bg-card text-text font-bold px-6 py-2.5 rounded-xl hover:bg-card-hover active:scale-95"
          >
            End Game
          </button>
        </div>
      </div>
    );
  }

  const cols = config.colors <= 4 ? 2 : config.colors <= 6 ? 3 : config.colors <= 8 ? 4 : 4;

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2 items-center">
        <span className="text-warning font-bold text-sm">Round {round}</span>
        <span className="text-accent text-sm">Score: {score}</span>
        <span className="text-sm">
          {Array.from({ length: config.lives }, (_, i) => (
            <span key={i} className={i < lives ? '' : 'opacity-20'}>❤️</span>
          ))}
        </span>
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
            className="w-14 h-14 rounded-xl text-xl transition-all duration-150 active:scale-90"
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

registerGame('copy-cat', {
  name: 'Copy Cat',
  emoji: '🐱',
  description: 'Watch the pattern, then repeat it! More tiles at higher stages.',
  category: 'memory',
  stages: 20,
  component: CopyCatGame,
});

export default CopyCatGame;
