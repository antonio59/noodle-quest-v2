import { useState, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const DIFFICULTY_LEVELS = {
  easy: { enterChance: 0.4, moveHomeChance: 0.6, captureChance: 0.5 },
  medium: { enterChance: 0.8, moveHomeChance: 0.9, captureChance: 0.8 },
  hard: { enterChance: 1.0, moveHomeChance: 1.0, captureChance: 1.0 },
};

type TokenPos = number;

interface PlayerState {
  color: string;
  emoji: string;
  pos: TokenPos;
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function movePlayer(pos: number, steps: number): number {
  if (pos === -1) {
    return steps === 6 ? 0 : -1;
  }
  const newPos = pos + steps;
  if (newPos > 33) return pos;
  if (newPos > 28) return 28 + (newPos - 28);
  if (newPos === 33) return 33;
  return newPos;
}

function aiMove(pPos: number, aiPos: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const { enterChance, moveHomeChance, captureChance } = DIFFICULTY_LEVELS[difficulty];
  
  if (aiPos === -1 && Math.random() < enterChance) {
    return 6;
  }
  
  if (aiPos >= 0 && aiPos < 28 && Math.random() < moveHomeChance) {
    const distanceToHome = 33 - aiPos;
    if (distanceToHome <= 3) return distanceToHome;
    if (distanceToHome <= 6) return Math.min(distanceToHome, 6);
  }
  
  if (pPos >= 0 && pPos < 28 && Math.random() < captureChance) {
    const distance = pPos - aiPos;
    if (distance > 0 && distance <= 6) return distance;
  }
  
  return rollDie();
}

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps & { aiDifficulty?: 'easy' | 'medium' | 'hard' }) {
  const [pPos, setPPos] = useState<number>(-1);
  const [aiPos, setAiPos] = useState<number>(-1);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [die, setDie] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const targetWins = Math.min(stage, 10);
  const difficulty = aiDifficulty || 'medium';

  const pathPositions = [
    { r: 1, c: 6 }, { r: 2, c: 6 }, { r: 3, c: 6 }, { r: 4, c: 6 }, { r: 5, c: 6 },
    { r: 6, c: 5 }, { r: 6, c: 4 }, { r: 6, c: 3 }, { r: 6, c: 2 }, { r: 6, c: 1 },
    { r: 6, c: 0 }, { r: 7, c: 0 }, { r: 8, c: 0 },
    { r: 8, c: 1 }, { r: 8, c: 2 }, { r: 8, c: 3 }, { r: 8, c: 4 }, { r: 8, c: 5 },
    { r: 8, c: 6 }, { r: 9, c: 6 }, { r: 10, c: 6 },
    { r: 10, c: 5 }, { r: 10, c: 4 }, { r: 10, c: 3 }, { r: 10, c: 2 }, { r: 10, c: 1 },
    { r: 10, c: 0 }, { r: 11, c: 0 },
  ];
  
  const playerHomeStretch = [
    { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 },
  ];

  useEffect(() => {
    onMessage('Your turn! Roll the die to start.');
  }, []);

  const handleRoll = () => {
    if (gameOver || turn !== 'player') return;
    const d = rollDie();
    setDie(d);
    const newPos = movePlayer(pPos, d);
    setPPos(newPos);
    onMessage(`You rolled ${d}! ${newPos === -1 ? 'Need a 6 to enter!' : `Moved to position ${newPos}`}`);

    if (newPos >= 33) {
      const newWins = wins + 1;
      setWins(newWins);
      setGameOver(true);
      onScore(100);
      onProgress(newWins / targetWins);
      if (newWins >= targetWins) {
        onEnd({ score: newWins * 100, stars: 3, summary: `Won ${newWins} Ludo games!` });
      } else {
        onMessage('You got home! Starting new round...');
        setTimeout(() => resetGame(), 2000);
      }
      return;
    }

    if (newPos === aiPos && newPos >= 0 && newPos < 28) {
      setAiPos(-1);
      onMessage('Sent AI back to base!');
    }

    setTurn('ai');
    setTimeout(aiTurn, 800);
  };

  const aiTurn = () => {
    const d = aiMove(pPos, aiPos, difficulty);
    const newPos = movePlayer(aiPos, d);
    setAiPos(newPos);
    onMessage(`AI rolled ${d}!`);

    if (newPos >= 33) {
      setGameOver(true);
      onMessage('AI got home — you lost!');
      setTimeout(() => resetGame(), 2000);
      return;
    }

    if (newPos === pPos && newPos >= 0 && newPos < 28) {
      setPPos(-1);
      onMessage('AI sent you back to base!');
    }

    setTurn('player');
    if (d === 6) {
      onMessage('AI rolled a 6 — rolling again!');
      setTimeout(aiTurn, 600);
    }
  };

  const resetGame = () => {
    setPPos(-1);
    setAiPos(-1);
    setTurn('player');
    setDie(null);
    setGameOver(false);
    onMessage('Your turn! Roll the die.');
  };

  const getCellContent = (pos: number) => {
    if (pos === -1) return null;
    if (pos >= 28) {
      const homeIdx = pos - 28;
      if (homeIdx < 5) {
        return { player: pPos === pos, ai: aiPos === pos, isHome: true, homeIdx };
      }
      return { player: pPos === pos, ai: aiPos === pos, isHome: false };
    }
    return { player: pPos === pos, ai: aiPos === pos, isHome: false };
  };

  const renderBoard = () => {
    const cells = [];
    
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 7; c++) {
        const pathIdx = pathPositions.findIndex(p => p.r === r && p.c === c);
        const isPath = pathIdx !== -1;
        const isHome = r === 7 && c >= 1 && c <= 5;
        const isPlayerHome = r >= 1 && r <= 5 && c >= 1 && c <= 5;
        const isAIHome = r >= 6 && r <= 10 && c >= 1 && c <= 5;
        
        let bgColor = 'transparent';
        let textColor = '';
        
        if (isPlayerHome) {
          bgColor = '#ef4444';
        } else if (isAIHome) {
          bgColor = '#3b82f6';
        } else if (isHome) {
          bgColor = '#22c55e';
        } else if (isPath) {
          bgColor = '#374151';
        }
        
        const content = pathIdx !== -1 ? getCellContent(pathIdx) : null;
        
        cells.push(
          <div
            key={`${r}-${c}`}
            className="w-7 h-7 flex items-center justify-center text-xs"
            style={{ backgroundColor: bgColor }}
          >
            {content && (
              <>
                {content.player && <span>🔴</span>}
                {content.ai && <span>🔵</span>}
              </>
            )}
            {isHome && !content?.player && !content?.ai && <span className="text-green-400 text-[8px]">★</span>}
          </div>
        );
      }
    }
    
    return cells;
  };

  return (
    <div className="h-full flex flex-col items-center p-2">
      <div className="flex gap-3 mb-2 text-sm items-center">
        <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: 🔴</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-blue-400 font-bold">AI: 🔵</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">{wins}/{targetWins}</span>
      </div>

      <div className="bg-card rounded-xl p-1 mb-3">
        <div 
          className="grid grid-cols-7 gap-px"
          style={{ width: 'fit-content' }}
        >
          {renderBoard()}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <div className="w-14 h-14 bg-card rounded-xl flex items-center justify-center text-3xl font-bold">
          {die ?? '🎲'}
        </div>
        <button
          onClick={handleRoll}
          disabled={gameOver || turn !== 'player'}
          className="bg-accent text-bg font-bold px-5 py-2.5 rounded-xl text-base hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          {turn === 'player' ? 'Roll!' : 'AI...'}
        </button>
      </div>

      <div className="text-xs text-text-muted text-center px-2">
        Roll a 6 to enter. First to reach 33 wins!
      </div>
    </div>
  );
}

registerGame('ludo', {
  name: 'Ludo',
  emoji: '🎲',
  description: 'Roll the dice and race your token home!',
  category: 'board',
  stages: 10,
  component: LudoGame,
  aiDifficulty: 'medium',
});

export default LudoGame;
