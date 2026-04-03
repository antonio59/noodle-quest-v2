import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

type Phase = 'intro' | 'playing' | 'done';

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
  11: { pairs: 15, cols: 6, time: 75 },
  12: { pairs: 16, cols: 6, time: 70 },
  13: { pairs: 16, cols: 7, time: 65 },
  14: { pairs: 18, cols: 7, time: 60 },
  15: { pairs: 18, cols: 7, time: 55 },
  16: { pairs: 18, cols: 7, time: 50 },
  17: { pairs: 20, cols: 7, time: 48 },
  18: { pairs: 20, cols: 7, time: 45 },
  19: { pairs: 20, cols: 7, time: 42 },
  20: { pairs: 20, cols: 7, time: 40 },
};

const EMOJIS = ['🦄', '🚀', '🌈', '🍕', '🐙', '🎸', '🌺', '🎨', '🦋', '🍦', '🎪', '🌟', '🎯', '🐶', '🌻', '🐸', '🍉', '🎃', '🦊', '🐬'];

const TIPS = [
  "💡 Tip: Focus on ONE row at a time. Remember what's in that row before moving on.",
  "💡 Tip: When you flip a card, try to remember WHERE it is, not just WHAT it is.",
  "💡 Tip: Create mental stories — '🦄 is next to 🚀' helps you remember!",
  "💡 Tip: Don't rush! Take a second to look at each card before flipping another.",
  "💡 Tip: If you find a match, try to remember cards you saw near it.",
];

const MATCH_FEEDBACKS = ["Great memory! 🧠", "You're on fire! 🔥", "Excellent! ⭐"];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MemoryMatchGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const flippedRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const matchedRef = useRef(0);
  const movesRef = useRef(0);
  const checkingRef = useRef(false);

  const cardSize = config.pairs >= 12 ? 52 : config.pairs >= 8 ? 62 : 72;

  const startGame = useCallback(() => {
    const selectedEmojis = EMOJIS.slice(0, config.pairs);
    const cardPairs = selectedEmojis.flatMap((emoji) => [emoji, emoji]);
    const shuffled = shuffleArray(cardPairs);
    const newCards: Card[] = shuffled.map((emoji, i) => ({
      id: i,
      emoji,
      flipped: false,
      matched: false,
    }));
    setCards(newCards);
    setFlippedIds([]);
    setMoves(0);
    setMatchedCount(0);
    setScore(0);
    setTimeLeft(config.time);
    setFeedback('');
    flippedRef.current = [];
    scoreRef.current = 0;
    matchedRef.current = 0;
    movesRef.current = 0;
    checkingRef.current = false;
    gameActiveRef.current = true;
    setPhase('playing');
  }, [config]);

  useEffect(() => {
    if (phase !== 'playing' || config.time <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const efficiency = config.pairs > 0 ? movesRef.current / config.pairs : 99;
          const stars = efficiency < 1.4 ? 3 : efficiency < 2 ? 2 : 1;
          const summary = `Time's up! You found ${matchedRef.current} pairs. Take a mental snapshot of each row to remember faster!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  const flipCard = useCallback(
    (cardId: number) => {
      if (!gameActiveRef.current || checkingRef.current) return;
      if (flippedRef.current.length >= 2) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card || card.flipped || card.matched) return;

      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c)));
      flippedRef.current.push(cardId);
      setFlippedIds([...flippedRef.current]);

      if (flippedRef.current.length === 2) {
        checkingRef.current = true;
        movesRef.current++;
        setMoves(movesRef.current);

        const [id1, id2] = flippedRef.current;
        const c1 = cards.find((c) => c.id === id1)!;
        const c2 = cards.find((c) => c.id === id2)!;
        const isMatch = c1.emoji === c2.emoji;

        setTimeout(() => {
          if (isMatch) {
            setCards((prev) =>
              prev.map((c) =>
                c.id === id1 || c.id === id2 ? { ...c, matched: true } : c
              )
            );
            matchedRef.current++;
            setMatchedCount(matchedRef.current);
            scoreRef.current += 50;
            setScore(scoreRef.current);
            onScore(50);
            onProgress(matchedRef.current / config.pairs);

            if (matchedRef.current % 3 === 0) {
              setFeedback(MATCH_FEEDBACKS[Math.floor(Math.random() * MATCH_FEEDBACKS.length)]);
            } else {
              setFeedback('✨ Match found! +50');
            }

            flippedRef.current = [];
            setFlippedIds([]);
            checkingRef.current = false;

            if (matchedRef.current >= config.pairs) {
              gameActiveRef.current = false;
              const efficiency = config.pairs > 0 ? movesRef.current / config.pairs : 99;
              const stars = efficiency < 1.4 ? 3 : efficiency < 2 ? 2 : 1;
              const summary = efficiency < 1.4
                ? `Amazing memory! All ${config.pairs} pairs in just ${movesRef.current} moves! Your brain is incredible! 🌟`
                : efficiency < 2
                  ? `Great job! ${movesRef.current} moves for ${config.pairs} pairs. Try to remember card positions to use fewer moves!`
                  : `You found all pairs in ${movesRef.current} moves! Focus on one row at a time to remember better.`;
              scoreRef.current += config.time > 0 ? timeLeft * 3 : 50;
              onEnd({ score: scoreRef.current, stars, summary });
            }
          } else {
            setFeedback('💡 Remember where those cards are!');
            setCards((prev) =>
              prev.map((c) =>
                c.id === id1 || c.id === id2 ? { ...c, flipped: false } : c
              )
            );
            flippedRef.current = [];
            setFlippedIds([]);
            checkingRef.current = false;
          }
        }, 700);
      }
    },
    [cards, config, onScore, onProgress, onEnd, timeLeft]
  );

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🃏</div>
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Memory Match</h2>
        <p className="text-purple-300 mb-4 max-w-xs">Find all the matching pairs by flipping cards!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl mb-2">🎯 {config.pairs} pairs to find</div>
          {config.time > 0 ? (
            <div className="text-yellow-400">⏱️ Time limit: {config.time} seconds</div>
          ) : (
            <div className="text-green-400">✓ No time limit - take your time!</div>
          )}
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-cyan-300 text-sm">How to play:</div>
          <div className="text-purple-300 text-sm mt-1">Flip 2 cards → Match = stay → No match = flip back</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onPointerDown={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🃏
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-3 w-full justify-center">
        <span className="text-purple-400 font-bold">Moves: {moves}</span>
        <span className="text-green-400">Pairs: {matchedCount}/{config.pairs}</span>
        {config.time > 0 && (
          <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
            ⏱️ {timeLeft}
          </span>
        )}
      </div>

      <div
        className="grid gap-1.5 p-3 bg-[#232146] rounded-xl"
        style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              flipCard(card.id);
            }}
            className="flex items-center justify-center rounded-lg select-none cursor-pointer transition-all duration-200"
            style={{
              width: cardSize,
              height: cardSize,
              fontSize: cardSize * 0.5,
              background: card.matched ? '#ff6e6c' : card.flipped ? '#4ade80' : '#c084fc',
              boxShadow: card.matched ? '0 0 15px #ff6e6c' : '0 3px 0 rgba(0,0,0,0.3)',
            }}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </div>
        ))}
      </div>

      <div className="text-center py-2 text-cyan-300 text-sm min-h-[24px]">{feedback}</div>
    </div>
  );
}

registerGame('memory-match', {
  name: 'Memory Match',
  emoji: '🃏',
  description: 'Flip cards and find the matching pairs!',
  category: 'memory',
  stages: 20,
  component: MemoryMatchGame,
});

export default MemoryMatchGame;
