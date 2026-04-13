import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const EMOJIS = ['🦄', '🚀', '🌈', '🍕', '🐙', '🎸', '🌺', '🎨', '🦋', '🍦', '🎪', '🌟', '🎯', '🐶', '🌻'];

const CONFIG: Record<number, { pairs: number; cols: number; time: number }> = {
  1: { pairs: 3, cols: 3, time: 0 },
  2: { pairs: 4, cols: 4, time: 0 },
  3: { pairs: 6, cols: 4, time: 0 },
  4: { pairs: 8, cols: 4, time: 0 },
  5: { pairs: 8, cols: 4, time: 120 },
  6: { pairs: 10, cols: 5, time: 110 },
  7: { pairs: 10, cols: 5, time: 100 },
  8: { pairs: 12, cols: 6, time: 95 },
  9: { pairs: 12, cols: 6, time: 85 },
  10: { pairs: 15, cols: 6, time: 80 },
};

const TIPS = [
  '💡 Tip: Focus on ONE row at a time. Remember what\'s in that row before moving on.',
  '💡 Tip: When you flip a card, try to remember WHERE it is, not just WHAT it is.',
  '💡 Tip: Create mental stories — \'🦄 is next to 🚀\' helps you remember!',
  '💡 Tip: Don\'t rush! Take a second to look at each card before flipping another.',
  '💡 Tip: If you find a match, try to remember cards you saw near it.',
];

type Phase = 'intro' | 'playing' | 'done';

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MemoryMatchGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const tip = useRef(TIPS[Math.floor(Math.random() * TIPS.length)]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matched, setMatched] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');

  const checkingRef = useRef(false);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || config.time <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          finishGame(false, matched, moves, score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, config.time]);  

  const startGame = useCallback(() => {
    const deck: Card[] = [];
    for (let i = 0; i < config.pairs; i++) {
      const emoji = EMOJIS[i];
      deck.push({ id: i * 2, emoji, flipped: false, matched: false });
      deck.push({ id: i * 2 + 1, emoji, flipped: false, matched: false });
    }
    setCards(shuffle(deck));
    setFlippedIndices([]);
    setMatched(0);
    setMoves(0);
    setScore(0);
    setTimeLeft(config.time);
    setFeedback('');
    setPhase('playing');
  }, [config]);

  const flipCard = useCallback((index: number) => {
    if (phase !== 'playing' || checkingRef.current) return;
    const card = cards[index];
    if (card.flipped || card.matched) return;
    if (flippedIndices.length >= 2) return;

    const newCards = [...cards];
    newCards[index] = { ...card, flipped: true };
    const newFlipped = [...flippedIndices, index];
    setCards(newCards);
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      checkingRef.current = true;
      const newMoves = moves + 1;
      setMoves(newMoves);

      const [i1, i2] = newFlipped;
      const c1 = newCards[i1];
      const c2 = newCards[i2];

      if (c1.emoji === c2.emoji) {
        setTimeout(() => {
          const updated = [...newCards];
          updated[i1] = { ...c1, matched: true };
          updated[i2] = { ...c2, matched: true };
          setCards(updated);

          const newMatched = matched + 1;
          const newScore = score + 50;
          setMatched(newMatched);
          setScore(newScore);
          onScore(50);
          onProgress(newMatched / config.pairs);

          if (newMatched % 3 === 0) {
            setFeedback(['Great memory! 🧠', 'You\'re on fire! 🔥', 'Excellent! ⭐'][Math.floor(Math.random() * 3)]);
          } else {
            setFeedback('✨ Match found! +50');
          }

          setFlippedIndices([]);
          checkingRef.current = false;

          if (newMatched >= config.pairs) {
            finishGame(true, newMatched, newMoves, newScore);
          }
        }, 700);
      } else {
        setTimeout(() => {
          const updated = [...newCards];
          updated[i1] = { ...c1, flipped: false };
          updated[i2] = { ...c2, flipped: false };
          setCards(updated);
          setFlippedIndices([]);
          setFeedback('💡 Remember where those cards are!');
          checkingRef.current = false;
        }, 700);
      }
    }
  }, [phase, cards, flippedIndices, matched, moves, score, config, onScore, onProgress]);

  const finishGame = useCallback((won: boolean, finalMatched: number, finalMoves: number, finalScore: number) => {
    setPhase('done');
    const efficiency = config.pairs > 0 ? finalMoves / config.pairs : 99;
    let stars: number;
    let summary: string;

    if (won) {
      if (efficiency < 1.4) {
        stars = 3;
        summary = `Amazing memory! All ${config.pairs} pairs in just ${finalMoves} moves! Your brain is incredible! 🌟`;
      } else if (efficiency < 2) {
        stars = 2;
        summary = `Great job! ${finalMoves} moves for ${config.pairs} pairs. Try to remember card positions to use fewer moves!`;
      } else {
        stars = 1;
        summary = `You found all pairs in ${finalMoves} moves! Focus on one row at a time to remember better.`;
      }
      const bonus = config.time > 0 ? timeLeft * 3 : 50;
      setScore(s => s + bonus);
      onEnd({ score: finalScore + bonus, stars, summary });
    } else {
      stars = 1;
      summary = `Time's up! You found ${finalMatched} pairs. Take a mental snapshot of each row to remember faster!`;
      onEnd({ score: finalScore, stars, summary });
    }
  }, [config, timeLeft, onEnd]);

  const cardSize = config.pairs >= 12 ? 52 : config.pairs >= 8 ? 62 : 72;

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🃏</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Memory Match</h2>
        <p className="text-text-dim mb-6 max-w-xs">Find all the matching pairs by flipping cards!</p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="text-xl mb-2">🎯 {config.pairs} pairs to find</div>
          {config.time > 0 ? (
            <div className="text-warning">⏱️ Time limit: {config.time} seconds</div>
          ) : (
            <div className="text-success">✓ No time limit — take your time!</div>
          )}
        </div>

        <div className="bg-surface rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-info text-sm">How to play:</div>
          <div className="text-text-dim text-sm mt-1">Flip 2 cards → Match = stay → No match = flip back</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 🃏
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-3 bg-card rounded-xl px-4 py-2">
        <span className="text-accent font-bold">Moves: {moves}</span>
        <span className="text-success">Pairs: {matched}/{config.pairs}</span>
        {config.time > 0 && (
          <span className={`font-bold ${timeLeft <= 10 ? 'text-error' : 'text-warning'}`}>
            ⏱️ {timeLeft}
          </span>
        )}
      </div>

      <div
        className="grid gap-1.5 p-3 bg-card rounded-xl"
        style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
      >
        {cards.map((card, i) => (
          <button
            key={card.id}
            onPointerDown={() => flipCard(i)}
            className="rounded-lg flex items-center justify-center select-none transition-all duration-200"
            style={{
              width: cardSize,
              height: cardSize,
              fontSize: cardSize * 0.5,
              background: card.matched ? '#ff6e6c' : card.flipped ? '#4ade80' : '#c084fc',
              cursor: card.matched ? 'default' : 'pointer',
              boxShadow: card.matched ? '0 0 15px #ff6e6c' : '0 3px 0 rgba(0,0,0,0.3)',
            }}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="text-info text-sm mt-3 text-center">{feedback}</div>
      )}
    </div>
  );
}

export default MemoryMatchGame;
