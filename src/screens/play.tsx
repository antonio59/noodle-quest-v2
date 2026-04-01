import { useState, useRef } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import type { GameDefinition, GameResult } from '@/types';

interface PlayGameProps {
  game: GameDefinition;
  gameId: string;
  stage: number;
  onBack: () => void;
}

export function PlayGame({ game, stage, onBack }: PlayGameProps) {
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [ended, setEnded] = useState<GameResult | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const GameComponent = game.component;

  const handleEnd = (result: GameResult) => {
    setEnded(result);
  };

  const renderStars = (count: number) => (
    <div className="flex justify-center gap-2 my-4">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={36}
          className={i <= count ? 'text-warning' : 'text-card-hover'}
          fill={i <= count ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );

  if (ended) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className={`text-6xl mb-4 ${ended.stars >= 2 ? 'animate-[celebrate_0.4s_ease]' : ''}`}>
          {ended.stars === 3 ? '🏆' : ended.stars === 2 ? '🎉' : '👏'}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {ended.stars === 3 ? 'Amazing!' : ended.stars === 2 ? 'Great Job!' : 'Good Effort!'}
        </h2>
        {renderStars(ended.stars)}
        <p className="text-accent text-xl font-bold mb-2">Score: {ended.score}</p>
        <p className="text-text-muted text-sm mb-6 max-w-xs">{ended.summary}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setEnded(null); setScore(0); setProgress(0); }}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Play Again
          </button>
          <button
            onClick={onBack}
            className="bg-card text-text font-bold px-6 py-2.5 rounded-xl hover:bg-card-hover active:scale-95"
          >
            All Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-surface border-b border-white/5 flex-shrink-0">
        <button onClick={onBack} className="text-text-muted hover:text-text p-2">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm">{game.emoji} {game.name}</div>
          <div className="text-text-muted text-xs">Stage {stage}</div>
        </div>
        <div className="text-accent font-bold min-w-[60px] text-right pr-2">{score}</div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-card flex-shrink-0">
        <div
          className="h-full bg-accent transition-all duration-300 rounded-r"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      {/* Message */}
      {message && (
        <div className="text-center text-text-dim text-sm py-2 px-4">{message}</div>
      )}

      {/* Game area */}
      <div ref={areaRef} className="flex-1 overflow-hidden">
        <GameComponent
          stage={stage}
          onScore={pts => setScore(s => s + pts)}
          onProgress={setProgress}
          onMessage={setMessage}
          onEnd={handleEnd}
        />
      </div>
    </div>
  );
}
