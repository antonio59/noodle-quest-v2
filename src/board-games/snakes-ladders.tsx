import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';
type Turn = 'player' | 'ai';

interface SnakeLadder {
  from: number;
  to: number;
}

const SNAKES: Record<number, SnakeLadder[]> = {
  1: [{ from: 25, to: 5 }, { from: 50, to: 30 }, { from: 75, to: 55 }],
  2: [{ from: 25, to: 5 }, { from: 50, to: 30 }, { from: 75, to: 55 }, { from: 90, to: 70 }],
  3: [{ from: 20, to: 3 }, { from: 35, to: 15 }, { from: 50, to: 30 }, { from: 65, to: 45 }, { from: 80, to: 60 }],
  4: [{ from: 20, to: 3 }, { from: 35, to: 15 }, { from: 50, to: 30 }, { from: 65, to: 45 }, { from: 80, to: 60 }, { from: 95, to: 75 }],
  5: [{ from: 18, to: 2 }, { from: 30, to: 10 }, { from: 45, to: 25 }, { from: 60, to: 40 }, { from: 72, to: 52 }, { from: 88, to: 68 }],
  6: [{ from: 18, to: 2 }, { from: 30, to: 10 }, { from: 45, to: 25 }, { from: 60, to: 40 }, { from: 72, to: 52 }, { from: 88, to: 68 }, { from: 96, to: 76 }],
  7: [{ from: 16, to: 1 }, { from: 28, to: 8 }, { from: 40, to: 20 }, { from: 55, to: 35 }, { from: 68, to: 48 }, { from: 82, to: 62 }, { from: 94, to: 74 }],
  8: [{ from: 16, to: 1 }, { from: 28, to: 8 }, { from: 40, to: 20 }, { from: 55, to: 35 }, { from: 68, to: 48 }, { from: 82, to: 62 }, { from: 94, to: 74 }, { from: 98, to: 78 }],
  9: [{ from: 15, to: 1 }, { from: 25, to: 5 }, { from: 38, to: 18 }, { from: 50, to: 30 }, { from: 62, to: 42 }, { from: 75, to: 55 }, { from: 85, to: 65 }, { from: 92, to: 72 }],
  10: [{ from: 15, to: 1 }, { from: 25, to: 5 }, { from: 38, to: 18 }, { from: 50, to: 30 }, { from: 62, to: 42 }, { from: 75, to: 55 }, { from: 85, to: 65 }, { from: 92, to: 72 }, { from: 99, to: 79 }],
};

const LADDERS: SnakeLadder[] = [
  { from: 3, to: 22 },
  { from: 10, to: 35 },
  { from: 20, to: 45 },
  { from: 40, to: 60 },
  { from: 55, to: 75 },
  { from: 70, to: 90 },
];

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function getAIMove(stage: number): number {
  if (stage <= 3) return rollDice();
  if (stage <= 6) {
    const r = rollDice();
    return r >= 4 ? r : rollDice();
  }
  const r = rollDice();
  return r >= 3 ? r : rollDice();
}

function SnakesLaddersGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [playerPos, setPlayerPos] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [turn, setTurn] = useState<Turn>('player');
  const [dice, setDice] = useState(0);
  const [message, setMessage] = useState('');
  const [playerScore, setPlayerScore] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [lastMove, setLastMove] = useState<string>('');
  const playerPosRef = useRef(0);
  const aiPosRef = useRef(0);
  const turnRef = useRef<Turn>('player');
  const animatingRef = useRef(false);

  const snakes = SNAKES[Math.min(stage, 10)] || SNAKES[10];

  const checkSnakeOrLadder = useCallback(
    (pos: number): { newPos: number; type: string } => {
      const snake = snakes.find((s) => s.from === pos);
      if (snake) return { newPos: snake.to, type: 'snake' };
      const ladder = LADDERS.find((l) => l.from === pos);
      if (ladder) return { newPos: ladder.to, type: 'ladder' };
      return { newPos: pos, type: 'none' };
    },
    [snakes]
  );

  const startGame = useCallback(() => {
    setPlayerPos(0);
    setAiPos(0);
    setTurn('player');
    setDice(0);
    setMessage('Your turn! Roll the dice!');
    setPlayerScore(0);
    setLastMove('');
    playerPosRef.current = 0;
    aiPosRef.current = 0;
    turnRef.current = 'player';
    animatingRef.current = false;
    setPhase('playing');
  }, []);

  const handlePlayerRoll = useCallback(() => {
    if (animatingRef.current || turnRef.current !== 'player') return;
    animatingRef.current = true;
    setAnimating(true);

    const roll = rollDice();
    setDice(roll);

    const newPos = playerPosRef.current + roll;
    if (newPos > 100) {
      setMessage(`Need exactly ${100 - playerPosRef.current} to win! Stay at ${playerPosRef.current}.`);
      setLastMove(`Rolled ${roll} - overshoot!`);
      setAnimating(false);
      animatingRef.current = false;
      turnRef.current = 'ai';
      setTurn('ai');
      return;
    }

    const { newPos: finalPos, type } = checkSnakeOrLadder(newPos);
    playerPosRef.current = finalPos;
    setPlayerPos(finalPos);

    if (type === 'snake') {
      setMessage(`Oh no! Snake bites! Slid down from ${newPos} to ${finalPos}!`);
      setLastMove(`Rolled ${roll} -> ${newPos} -> 🐍 -> ${finalPos}`);
    } else if (type === 'ladder') {
      setMessage(`Yay! Found a ladder! Climbed from ${newPos} to ${finalPos}!`);
      setLastMove(`Rolled ${roll} -> ${newPos} -> 🪜 -> ${finalPos}`);
    } else {
      setMessage(`Moved to ${finalPos}!`);
      setLastMove(`Rolled ${roll} -> ${finalPos}`);
    }

    onProgress(finalPos / 100);

    if (finalPos >= 100) {
      const score = 100 + stage * 10;
      setPlayerScore(score);
      onScore(score);
      setTimeout(() => {
        setPhase('done');
        onEnd({
          score,
          stars: stage >= 7 ? 3 : stage >= 4 ? 2 : 1,
          summary: `You won Snakes & Ladders! Reached 100 in stage ${stage}!`,
        });
      }, 1000);
      return;
    }

    setTimeout(() => {
      turnRef.current = 'ai';
      setTurn('ai');
      setMessage("AI's turn...");
      animatingRef.current = false;
      setAnimating(false);
    }, 800);
  }, [stage, checkSnakeOrLadder, onScore, onProgress, onEnd]);

  useEffect(() => {
    if (phase !== 'playing' || turn !== 'ai') return;

    const timer = setTimeout(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setAnimating(true);

      const roll = getAIMove(stage);
      setDice(roll);

      const newPos = aiPosRef.current + roll;
      if (newPos > 100) {
        setMessage(`AI rolled ${roll} but overshoots! Stays at ${aiPosRef.current}.`);
        setLastMove(`AI rolled ${roll} - overshoot!`);
        animatingRef.current = false;
        setAnimating(false);
        turnRef.current = 'player';
        setTurn('player');
        setMessage('Your turn! Roll the dice!');
        return;
      }

      const { newPos: finalPos, type } = checkSnakeOrLadder(newPos);
      aiPosRef.current = finalPos;
      setAiPos(finalPos);

      if (type === 'snake') {
        setMessage(`AI hit a snake! Slid from ${newPos} to ${finalPos}!`);
        setLastMove(`AI: ${roll} -> ${newPos} -> 🐍 -> ${finalPos}`);
      } else if (type === 'ladder') {
        setMessage(`AI found a ladder! Climbed to ${finalPos}!`);
        setLastMove(`AI: ${roll} -> ${newPos} -> 🪜 -> ${finalPos}`);
      } else {
        setMessage(`AI moved to ${finalPos}.`);
        setLastMove(`AI: ${roll} -> ${finalPos}`);
      }

      if (finalPos >= 100) {
        setTimeout(() => {
          setPhase('done');
          onEnd({
            score: Math.max(10, 50 - stage * 5),
            stars: 0,
            summary: `AI won! Better luck next time. You reached ${playerPosRef.current}.`,
          });
        }, 1000);
        return;
      }

      setTimeout(() => {
        turnRef.current = 'player';
        setTurn('player');
        setMessage('Your turn! Roll the dice!');
        animatingRef.current = false;
        setAnimating(false);
      }, 800);
    }, 1200);

    return () => clearTimeout(timer);
  }, [phase, turn, stage, checkSnakeOrLadder, onEnd]);

  const getBoardRow = (row: number): number[] => {
    const rows: number[][] = [];
    for (let r = 9; r >= 0; r--) {
      const row: number[] = [];
      for (let c = 0; c < 10; c++) {
        const num = r % 2 === 0 ? r * 10 + c + 1 : r * 10 + (9 - c) + 1;
        row.push(num);
      }
      rows.push(row);
    }
    return rows[row] || [];
  };

  const isSnakeHead = (n: number) => snakes.some((s) => s.from === n);
  const isLadderBottom = (n: number) => LADDERS.some((l) => l.from === n);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4 animate-bounce">🐍</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">Snakes & Ladders</h2>
        <p className="text-green-300 mb-4 max-w-xs">Race to 100! Climb ladders, avoid snakes!</p>
        <div className="bg-[#1a3320] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-yellow-400 text-sm">🪜 Ladders take you UP</div>
          <div className="text-red-400 text-sm mt-1">🐍 Snakes slide you DOWN</div>
          <div className="text-green-300 text-sm mt-2">Stage {stage}: {snakes.length} snakes on the board!</div>
        </div>
        <button
          onClick={startGame}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Roll the Dice! 🎲
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const won = playerPos >= 100;
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className={`text-6xl mb-4 ${won ? 'animate-bounce' : ''}`}>{won ? '🏆' : '😢'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${won ? 'text-green-400' : 'text-red-400'}`}>
          {won ? 'You Won!' : 'AI Won!'}
        </h2>
        <p className="text-green-300 mb-4">
          You: {playerPos} | AI: {aiPos}
        </p>
        <button
          onClick={startGame}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Play Again! 🎲
        </button>
      </div>
    );
  }

  const boardRows = [];
  for (let r = 9; r >= 0; r--) {
    const cells: number[] = [];
    for (let c = 0; c < 10; c++) {
      const num = r % 2 === 0 ? r * 10 + c + 1 : r * 10 + (9 - c) + 1;
      cells.push(num);
    }
    boardRows.push(cells);
  }

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-3 py-2 bg-[#1a3320] rounded-xl mb-2">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold">👤 You: {playerPos}</span>
          <span className="text-red-400 font-bold">🤖 AI: {aiPos}</span>
        </div>
        <div className="text-2xl">{dice > 0 ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice - 1] : '🎲'}</div>
      </div>

      <div className="text-center text-sm text-green-300 py-1 min-h-[20px]">{message}</div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-10 gap-px bg-[#0d1a10] p-1 rounded-xl">
          {boardRows.flat().map((num) => {
            const isPlayerHere = playerPos === num;
            const isAIHere = aiPos === num;
            const snake = isSnakeHead(num);
            const ladder = isLadderBottom(num);

            return (
              <div
                key={num}
                className={`aspect-square flex items-center justify-center text-[8px] sm:text-[10px] font-bold rounded-sm relative
                  ${num % 2 === 0 ? 'bg-[#2d4a30]' : 'bg-[#1a3320]'}
                  ${snake ? 'ring-1 ring-red-500/50' : ''}
                  ${ladder ? 'ring-1 ring-yellow-500/50' : ''}
                `}
              >
                <span className="text-green-300/60">{num}</span>
                {snake && <span className="absolute top-0 right-0 text-[6px]">🐍</span>}
                {ladder && <span className="absolute top-0 right-0 text-[6px]">🪜</span>}
                {isPlayerHere && (
                  <span className="absolute inset-0 flex items-center justify-center text-blue-400 text-sm drop-shadow-lg">
                    👤
                  </span>
                )}
                {isAIHere && !isPlayerHere && (
                  <span className="absolute inset-0 flex items-center justify-center text-red-400 text-sm drop-shadow-lg">
                    🤖
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {lastMove && (
        <div className="text-center text-xs text-green-300/60 py-1">{lastMove}</div>
      )}

      <div className="flex justify-center py-2">
        <button
          onClick={handlePlayerRoll}
          disabled={turn !== 'player' || animating}
          className={`font-bold px-6 py-2 rounded-xl text-lg active:scale-95 transition-all
            ${turn === 'player' && !animating
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
        >
          {turn === 'player' ? '🎲 Roll!' : '⏳ AI thinking...'}
        </button>
      </div>
    </div>
  );
}

registerGame('snakes-ladders', {
  name: 'Snakes & Ladders',
  emoji: '🐍',
  description: 'Race to 100! Climb ladders, avoid snakes!',
  category: 'board',
  stages: 10,
  component: SnakesLaddersGame,
});

export default SnakesLaddersGame;
