import { useState } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Define AI difficulty levels
const DIFFICULTY_LEVELS = {
  easy: { enterChance: 0.4, ladderChance: 0.6, snakeAvoidChance: 0.5 },
  medium: { enterChance: 0.8, ladderChance: 0.9, snakeAvoidChance: 0.8 },
  hard: { enterChance: 1.0, ladderChance: 1.0, snakeAvoidChance: 1.0 },
};

const BOARD_SIZE = 100;

// Snakes: head -> tail (go back)
const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};
// Ladders: bottom -> top (go forward)
const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function getCellPos(cell: number): { row: number; col: number } {
  const zeroBased = cell - 1;
  const row = 9 - Math.floor(zeroBased / 10);
  const col = row % 2 === 1 ? zeroBased % 10 : 9 - (zeroBased % 10);
  return { row, col };
}

// Simple AI: prefer ladders > avoid snakes > exact finish > random
function aiMove(playerPos: number, aiPos: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const { enterChance, ladderChance, snakeAvoidChance } = DIFFICULTY_LEVELS[difficulty];
  
  // Prefer entering (if in yard and dice is 6)
  if (aiPos === 0 && Math.random() < enterChance) {
    return 6;
  }
  
  // Prefer ladders (if close to a ladder)
  if (Math.random() < ladderChance) {
    for (const [bottom, top] of Object.entries(LADDERS)) {
      const b = parseInt(bottom);
      if (b > aiPos && b - aiPos <= 6) {
        return b - aiPos;
      }
      if (top > aiPos && top - aiPos <= 6) {
        return top - aiPos;
      }
    }
  }
  
  // Avoid snakes (if possible)
  if (Math.random() < snakeAvoidChance) {
    for (const [head, tail] of Object.entries(SNAKES)) {
      const h = parseInt(head);
      if (h > aiPos && h - aiPos <= 6 && h - aiPos !== 6) {
        return h - aiPos - 1;
      }
    }
  }
  
  // Exact finish
  if (BOARD_SIZE - aiPos <= 6) {
    return BOARD_SIZE - aiPos;
  }
  
  // Random move
  return rollDie();
}

function SnakesLaddersGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps & { aiDifficulty?: 'easy' | 'medium' | 'hard' }) {
  const [playerPos, setPlayerPos] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [die, setDie] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [animating, setAnimating] = useState(false);
  const targetWins = Math.min(stage, 10);
  const difficulty = aiDifficulty || 'medium';

  const moveToken=*** number, steps: number, setter: (p: number) => void, name: string, onComplete: () => void) => {
    let target = currentPos + steps;
    if (target > BOARD_SIZE) target = currentPos; // can't overshoot

    // Animate movement
    setAnimating(true);
    let pos = currentPos;
    const interval = setInterval(() => {
      pos++;
      if (pos > target) {
        clearInterval(interval);
        // Check snakes/ladders
        if (SNAKES[pos - 1]) {
          onMessage(`${name} hit a snake! Going down...`);
          setTimeout(() => {
            setter(SNAKES[pos - 1]);
            setAnimating(false);
            onComplete();
          }, 500);
        } else if (LADDERS[pos - 1]) {
          onMessage(`${name} found a ladder! Going up!`);
          setTimeout(() => {
            setter(LADDERS[pos - 1]);
            setAnimating(false);
            onComplete();
          }, 500);
        } else {
          setAnimating(false);
          onComplete();
        }
        return;
      }
      setter(pos);
    }, 100);
  };

  const handleRoll = () => {
    if (gameOver || turn !== 'player' || animating) return;
    const d = rollDie();
    setDie(d);

    if (playerPos === 0 && d !== 6) {
      onMessage(`Rolled ${d} — need a 6 to start!`);
      setTurn('ai');
      setTimeout(aiTurn, 800);
      return;
    }

    const startPos = playerPos === 0 && d === 6 ? 0 : playerPos;
    const target = startPos + d;
    if (target > BOARD_SIZE) {
      onMessage(`Rolled ${d} — need exact number to finish!`);
      setTurn('ai');
      setTimeout(aiTurn, 800);
      return;
    }

    moveToken(startPos, d, setPlayerPos, 'You', () => {
      if (playerPos + d >= BOARD_SIZE || LADDERS[playerPos + d] === BOARD_SIZE) {
        // Check win after move resolves
        setTimeout(() => {
          if (playerPos >= BOARD_SIZE) {
            const newWins = wins + 1;
            setWins(newWins);
            setGameOver(true);
            onScore(80);
            onProgress(newWins / targetWins);
            if (newWins >= targetWins) {
              onEnd({ score: newWins * 80, stars: 3, summary: `Won ${newWins} Snakes & Ladders games!` });
            } else {
              onMessage('You won this round!');
              setTimeout(() => resetGame(), 2000);
            }
            return;
          }
        }, 600);
      }
      setTurn('ai');
      setTimeout(aiTurn, 800);
    });
  };

  const aiTurn = () => {
    if (gameOver) return;
    const d = aiMove(playerPos, aiPos, difficulty);

    if (aiPos === 0 && d !== 6) {
      onMessage(`AI rolled ${d} — no 6, can't start.`);
      setTurn('player');
      return;
    }

    const startPos = aiPos === 0 && d === 6 ? 0 : aiPos;
    const target = startPos + d;
    if (target > BOARD_SIZE) {
      onMessage(`AI rolled ${d} — overshoots!`);
      setTurn('player');
      return;
    }

    moveToken(startPos, d, setAiPos, 'AI', () => {
      setTimeout(() => {
        if (aiPos >= BOARD_SIZE) {
          setGameOver(true);
          onMessage('AI won — try again!');
          setTimeout(() => resetGame(), 2000);
          return;
        }
        setTurn('player');
      }, 100);
    });
  };

  const resetGame = () => {
    setPlayerPos(0);
    setAiPos(0);
    setTurn('player');
    setDie(null);
    setGameOver(false);
    setAnimating(false);
    onMessage('Your turn! Roll to start.');
  };

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-3 mb-2 text-sm">
        <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: {playerPos}</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">AI: {aiPos}</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">{wins}/{targetWins}</span>
      </div>

      {/* Board */}
      <div className="grid grid-cols-10 gap-[2px] bg-card-hover p-1 rounded-lg mb-3">
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const cell = i + 1;
          const isPlayer = playerPos === cell;
          const isAI = aiPos === cell;
          const isSnake = SNAKES[cell];
          const isLadder = LADDERS[cell];
          const pos = getCellPos(cell);
          const isDark = (pos.row + pos.col) % 2 === 0;

          return (
            <div
              key={cell}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[9px] sm:text-[10px] font-medium rounded-sm relative ${
                isDark ? 'bg-[#2d2a50]' : 'bg-[#3d3a60]'
              } ${cell === BOARD_SIZE ? 'ring-1 ring-accent' : ''}`}
            >
              <span className="text-text-muted/50 absolute top-0 left-0.5">{cell}</span>
              {isSnake && <span className="text-xs">🐍</span>}
              {isLadder && <span className="text-xs">🪜</span>}
              {isPlayer && !isAI && <span className="text-sm absolute">🔴</span>}
              {isAI && !isPlayer && <span className="text-sm absolute">🔵</span>}
              {isPlayer && isAI && <span className="text-sm absolute">🟣</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-card rounded-xl flex items-center justify-center text-3xl font-bold">
          {die ?? '🎲'}
        </div>
        <button
          onClick={handleRoll}
          disabled={gameOver || turn !== 'player' || animating}
          className="bg-accent text-bg font-bold px-6 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          {turn === 'player' ? 'Roll!' : 'AI...'}
        </button>
      </div>

      <div className="mt-2 text-xs text-text-muted text-center">
        Roll 6 to start. 🪜 ladders up, 🐍 snakes down. Exact roll to finish!
      </div>
    </div>
  );
}

registerGame('snakes-ladders', {
  name: 'Snakes & Ladders',
  emoji: '🐍',
  description: 'Classic race game — climb ladders, dodge snakes!',
  category: 'board',
  stages: 10,
  component: SnakesLaddersGame,
  aiDifficulty: 'medium',
});

export default SnakesLaddersGame;
