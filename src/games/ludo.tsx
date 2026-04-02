import { useState } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

// Define AI difficulty levels
const DIFFICULTY_LEVELS = {
  easy: { enterChance: 0.4, moveHomeChance: 0.6, captureChance: 0.5 },
  medium: { enterChance: 0.8, moveHomeChance: 0.9, captureChance: 0.8 },
  hard: { enterChance: 1.0, moveHomeChance: 1.0, captureChance: 1.0 },
};

type TokenPos = number; // -1 = in yard, 0-27 = on track, 28-32 = home stretch, 33 = finished

interface PlayerState {
  color: string;
  emoji: string;
  pos: TokenPos;
}

const TRACK_LENGTH = 28;
const HOME_STRETCH = 5;

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Track path (simplified linear for mobile)
function getTrackPos(index: number): { x: number; y: number } {
  const angle = (index / TRACK_LENGTH) * Math.PI * 2 - Math.PI / 2;
  const r = 0.38;
  return { x: 0.5 + Math.cos(angle) * r, y: 0.5 + Math.sin(angle) * r };
}

function movePlayer(pos: number, steps: number): number {
  if (pos === -1) {
    return steps === 6 ? 0 : -1; // need 6 to enter
  }
  const newPos = pos + steps;
  if (newPos > TRACK_LENGTH + HOME_STRETCH) return pos; // can't overshoot
  if (newPos > TRACK_LENGTH) return TRACK_LENGTH + (newPos - TRACK_LENGTH); // home stretch
  if (newPos === TRACK_LENGTH + HOME_STRETCH) return TRACK_LENGTH + HOME_STRETCH; // finished
  return newPos;
}

// Simple AI: prefer entering > moving toward home > capturing > random
function aiMove(pPos: number, aiPos: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const { enterChance, moveHomeChance, captureChance } = DIFFICULTY_LEVELS[difficulty];
  
  // Prefer entering (if in yard and dice is 6)
  if (aiPos === -1 && Math.random() < enterChance) {
    return 6;
  }
  
  // Prefer moving toward home (if on track and close to home)
  if (aiPos >= 0 && aiPos < TRACK_LENGTH && Math.random() < moveHomeChance) {
    // Move more aggressively when close to home
    const distanceToHome = TRACK_LENGTH + HOME_STRETCH - aiPos;
    if (distanceToHome <= 3) return distanceToHome;
    if (distanceToHome <= 6) return Math.min(distanceToHome, 6);
  }
  
  // Prefer capturing player (if possible)
  if (pPos >= 0 && pPos < TRACK_LENGTH && Math.random() < captureChance) {
    // If player is ahead, try to land exactly on them
    const distance = pPos - aiPos;
    if (distance > 0 && distance <= 6) return distance;
  }
  
  // Random move
  return rollDie();
}

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps & { aiDifficulty?: 'easy' | 'medium' | 'hard' }) {
  const players: PlayerState[] = [
    { color: '#ef4444', emoji: '🔴', pos: -1 },
    { color: '#3b82f6', emoji: '🔵', pos: -1 },
  ];
  // Player is index 0 (red), AI is index 1 (blue)

  const [pPos, setPPos] = useState<number>(-1);
  const [aiPos, setAiPos] = useState<number>(-1);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [die, setDie] = useState<number | null>(null);
  const [rolls, setRolls] = useState(0);
  const [wins, setWins] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const targetWins = Math.min(stage, 10);
  const difficulty = aiDifficulty || 'medium';

  const handleRoll = () => {
    if (gameOver || turn !== 'player') return;
    const d = rollDie();
    setDie(d);
    setRolls(r => r + 1);
    const newPos = movePlayer(pPos, d);
    setPPos(newPos);
    onMessage(`You rolled ${d}! ${newPos === -1 ? 'Need a 6 to enter!' : `Moved to ${newPos}`}`);

    if (newPos >= TRACK_LENGTH + HOME_STRETCH) {
      const newWins = wins + 1;
      setWins(newWins);
      setGameOver(true);
      onScore(100);
      onProgress(newWins / targetWins);
      if (newWins >= targetWins) {
        onEnd({ score: newWins * 100, stars: 3, summary: `Won ${newWins} Ludo games!` });
      } else {
        onMessage('You got home! Rolling for AI...');
        setTimeout(() => resetGame(), 2000);
      }
      return;
    }

    // Capture: if player lands on AI
    if (newPos === aiPos && newPos >= 0 && newPos < TRACK_LENGTH) {
      setAiPos(-1);
      onMessage('Sent AI back to yard!');
    }

    setTurn('ai');
    setTimeout(aiTurn, 800);
  };

  const aiTurn = () => {
    const d = aiMove(pPos, aiPos, difficulty);
    const newPos = movePlayer(aiPos, d);
    setAiPos(newPos);
    onMessage(`AI rolled ${d}!`);

    if (newPos >= TRACK_LENGTH + HOME_STRETCH) {
      setGameOver(true);
      onMessage('AI got home — you lost!');
      setTimeout(() => resetGame(), 2000);
      return;
    }

    // Capture player
    if (newPos === pPos && newPos >= 0 && newPos < TRACK_LENGTH) {
      setPPos(-1);
      onMessage('AI sent you back to yard!');
    }

    setTurn('player');
    if (d === 6) {
      onMessage('AI got a 6 — rolled again!');
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

  // Render board
  const renderTrack = () => {
    const cells = [];
    for (let i = 0; i < TRACK_LENGTH; i++) {
      const pos = getTrackPos(i);
      const isPlayer = pPos === i;
      const isAI = aiPos === i;
      cells.push(
        <div
          key={i}
          className="absolute w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs"
          style={{
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            background: isPlayer ? '#ef4444' : isAI ? '#3b82f6' : 'rgba(255,255,255,0.1)',
          }}
        >
          {isPlayer ? '🔴' : isAI ? '🔵' : ''}
        </div>
      );
    }

    // Home stretch indicators
    for (let i = TRACK_LENGTH; i < TRACK_LENGTH + HOME_STRETCH; i++) {
      const pct = ((i - TRACK_LENGTH) / HOME_STRETCH) * 80 + 10;
      cells.push(
        <div
          key={`home-${i}`}
          className="absolute w-6 h-6 rounded-full border border-success/30 flex items-center justify-center text-xs"
          style={{ left: '50%', top: `${pct}%`, transform: 'translate(-50%, -50%)', background: 'rgba(74,222,128,0.2)' }}
        >
          {pPos === i ? '🔴' : aiPos === i ? '🔵' : ''}
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="h-full flex flex-col items-center p-3">
      <div className="flex gap-3 mb-3 text-sm items-center">
        <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: 🔴</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">AI: 🔵</span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">{wins}/{targetWins}</span>
      </div>

      {/* Board */}
      <div className="relative w-64 h-64 bg-card rounded-2xl mb-4">
        {/* Yard indicators */}
        <div className="absolute top-2 left-2 text-2xl">{pPos === -1 ? '🔴' : '·'}</div>
        <div className="absolute top-2 right-2 text-2xl">{aiPos === -1 ? '🔵' : '·'}</div>
        {/* Home */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
          <div className="text-lg">🏠</div>
          <div className="text-xs text-text-muted">Home</div>
        </div>
        {/* Track */}
        {renderTrack()}
      </div>

      {/* Die & Roll */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center text-3xl font-bold">
          {die ?? '🎲'}
        </div>
        <button
          onClick={handleRoll}
          disabled={gameOver || turn !== 'player'}
          className="bg-accent text-bg font-bold px-6 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          {turn === 'player' ? 'Roll!' : 'AI rolling...'}
        </button>
      </div>

      <div className="mt-3 text-xs text-text-muted text-center">
        Roll a 6 to enter the track. First one home wins!
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
