import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

const EMOJIS = ['🦄', '🚀', '🌈', '🍕', '🐙', '🎸', '🌺', '🎨', '🦋', '🍦', '🎪', '🌟', '🎯', '🐶', '🌻', '🎮', '🏀', '🎵'];

const STAGE_CONFIG: Record<number, { pairs: number; cols: number; peekTime: number }> = {
  1: { pairs: 3, cols: 3, peekTime: 3000 },
  2: { pairs: 4, cols: 4, peekTime: 3000 },
  3: { pairs: 6, cols: 4, peekTime: 2500 },
  4: { pairs: 6, cols: 4, peekTime: 2000 },
  5: { pairs: 8, cols: 4, peekTime: 2000 },
  6: { pairs: 8, cols: 4, peekTime: 1500 },
  7: { pairs: 10, cols: 5, peekTime: 1500 },
  8: { pairs: 10, cols: 5, peekTime: 1000 },
  9: { pairs: 12, cols: 6, peekTime: 1000 },
  10: { pairs: 12, cols: 6, peekTime: 500 },
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MemoryBoardGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [subPhase, setSubPhase] = useState<'peek' | 'playing'>('peek');
  const [cards, setCards] = useState<Card[]>([]);
  const [_flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [_score, setScore] = useState(0);
  const [peekTimeLeft, setPeekTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const gameActiveRef = useRef(false);
  const flippedRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const matchedRef = useRef(0);
  const movesRef = useRef(0);
  const checkingRef = useRef(false);

  const config = STAGE_CONFIG[Math.min(stage, 10)] || STAGE_CONFIG[10];
  const cardSize = config.pairs >= 10 ? 48 : config.pairs >= 8 ? 56 : 64;

  const createCards = useCallback(() => {
    const selectedEmojis = shuffleArray(EMOJIS).slice(0, config.pairs);
    const cardPairs = selectedEmojis.flatMap((emoji) => [emoji, emoji]);
    const shuffled = shuffleArray(cardPairs);
    return shuffled.map((emoji, i) => ({
      id: i,
      emoji,
      flipped: false,
      matched: false,
    }));
  }, [config.pairs]);

  const startGame = useCallback(() => {
    const newCards = createCards();
    setCards(newCards.map(c => ({ ...c, flipped: true })));
    setFlippedIds([]);
    setMoves(0);
    setMatchedCount(0);
    setScore(0);
    setFeedback('');
    flippedRef.current = [];
    scoreRef.current = 0;
    matchedRef.current = 0;
    movesRef.current = 0;
    checkingRef.current = false;
    gameActiveRef.current = true;
    setPeekTimeLeft(config.peekTime);
    setSubPhase('peek');
    setPhase('playing');
  }, [createCards, config.peekTime]);

  useEffect(() => {
    if (phase !== 'playing' || subPhase !== 'peek') return;

    if (peekTimeLeft <= 0) {
      setCards(prev => prev.map(c => ({ ...c, flipped: false })));
      setSubPhase('playing');
      return;
    }

    const timer = setInterval(() => {
      setPeekTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(timer);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [phase, subPhase, peekTimeLeft]);

  useEffect(() => {
    if (phase !== 'playing' || subPhase !== 'playing') return;
    if (timeLeft <= 0 && stage >= 5) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const efficiency = config.pairs > 0 ? movesRef.current / config.pairs : 99;
          const stars = efficiency < 1.5 ? 2 : 1;
          const summary = `Time's up! You found ${matchedRef.current}/${config.pairs} pairs.`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, subPhase, stage, config.pairs, onEnd]);

  const flipCard = useCallback(
    (cardId: number) => {
      if (!gameActiveRef.current || checkingRef.current || subPhase !== 'playing') return;
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
            const points = 50 + stage * 5;
            scoreRef.current += points;
            setScore(scoreRef.current);
            onScore(points);
            onProgress(matchedRef.current / config.pairs);

            const feedbacks = ['Great memory! 🧠', 'You remembered! ⭐', 'Perfect match! ✨', 'Amazing! 🌟'];
            setFeedback(feedbacks[Math.floor(Math.random() * feedbacks.length)]);

            flippedRef.current = [];
            setFlippedIds([]);
            checkingRef.current = false;

            if (matchedRef.current >= config.pairs) {
              gameActiveRef.current = false;
              const efficiency = config.pairs > 0 ? movesRef.current / config.pairs : 99;
              const stars = efficiency < 1.4 ? 3 : efficiency < 2 ? 2 : 1;
              const finalScore = scoreRef.current + (stage >= 5 ? timeLeft * 2 : 50);
              const summary = efficiency < 1.4
                ? `Incredible! All ${config.pairs} pairs in ${movesRef.current} moves! 🌟`
                : `Found all pairs in ${movesRef.current} moves!`;
              onEnd({ score: finalScore, stars, summary });
            }
          } else {
            setFeedback('Remember those positions! 💡');
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
    [cards, config.pairs, stage, subPhase, timeLeft, onScore, onProgress, onEnd]
  );

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4 animate-bounce">🧠</div>
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Memory Board</h2>
        <p className="text-purple-300 mb-4 max-w-xs">Memorize the board, then find all the matching pairs!</p>
        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl mb-2">🎯 {config.pairs} pairs to find</div>
          <div className="text-yellow-400">👀 Peek time: {(config.peekTime / 1000).toFixed(1)}s</div>
          {stage >= 5 && <div className="text-red-400 mt-1">⏱️ Timed challenge!</div>}
        </div>
        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-cyan-300 text-sm">How to play:</div>
          <div className="text-purple-300 text-sm mt-1">1. Memorize the cards during peek time</div>
          <div className="text-purple-300 text-sm">2. Flip 2 cards to find matches!</div>
        </div>
        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🧠
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Great Job!</h2>
        <p className="text-purple-300 mb-2">
          Found {matchedCount} pairs in {moves} moves!
        </p>
        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Play Again! 🧠
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-3 w-full justify-center">
        {subPhase === 'peek' ? (
          <span className="text-yellow-400 font-bold animate-pulse">
            👀 Memorize! {(peekTimeLeft / 1000).toFixed(1)}s
          </span>
        ) : (
          <>
            <span className="text-purple-400 font-bold">Moves: {moves}</span>
            <span className="text-green-400">Pairs: {matchedCount}/{config.pairs}</span>
            {stage >= 5 && timeLeft > 0 && (
              <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                ⏱️ {timeLeft}s
              </span>
            )}
          </>
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
            className={`flex items-center justify-center rounded-lg select-none transition-all duration-300
              ${subPhase === 'peek' ? 'cursor-default' : 'cursor-pointer'}
              ${card.matched ? 'scale-95' : ''}
            `}
            style={{
              width: cardSize,
              height: cardSize,
              fontSize: cardSize * 0.45,
              background: card.matched
                ? 'linear-gradient(135deg, #ff6e6c, #ff9a9e)'
                : card.flipped
                  ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                  : subPhase === 'peek'
                    ? 'linear-gradient(135deg, #c084fc, #a855f7)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: card.matched
                ? '0 0 15px rgba(255, 110, 108, 0.5)'
                : card.flipped
                  ? '0 0 10px rgba(74, 222, 128, 0.5)'
                  : '0 3px 0 rgba(0,0,0,0.3)',
              transform: card.flipped || card.matched ? 'rotateY(0deg)' : 'rotateY(180deg)',
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

registerGame('memory-board', {
  name: 'Memory Board',
  emoji: '🧠',
  description: 'Memorize the board, then find matching pairs!',
  category: 'board',
  stages: 10,
  component: MemoryBoardGame,
});

export default MemoryBoardGame;
