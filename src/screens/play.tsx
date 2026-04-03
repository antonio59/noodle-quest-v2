import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { GameDefinition, GameResult } from '@/types';

interface PlayGameProps {
  game: GameDefinition;
  gameId: string;
  stage: number;
  onBack: () => void;
}

export function PlayGame({ game, gameId, stage, onBack }: PlayGameProps) {
  const { player } = useAuth();
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [ended, setEnded] = useState<GameResult | null>(null);
  const savedRef = useRef(false);

  const GameComponent = game.component;

  const saveScore = useCallback(async (result: GameResult) => {
    if (!player || savedRef.current) return;
    savedRef.current = true;
    try {
      await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'games:saveScore',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId, gameId, stage, score: result.score, stars: result.stars }],
        }),
      });

      // Check for new badge achievements and post to feed
      const statsRes = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'games:getPlayerStats',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId }],
        }),
      });
      const statsData = await statsRes.json();
      if (statsData.value) {
        const s = statsData.value;
        const badgeChecks: Record<string, { emoji: string; name: string; condition: boolean }> = {
          first_game: { emoji: '👣', name: 'First Steps', condition: (s.gamesPlayed || 0) >= 1 },
          first_star: { emoji: '⭐', name: 'Star Collector', condition: (s.totalStars || 0) >= 1 },
          star_10: { emoji: '🌟', name: 'Rising Star', condition: (s.totalStars || 0) >= 10 },
          star_30: { emoji: '✨', name: 'Superstar', condition: (s.totalStars || 0) >= 30 },
          star_60: { emoji: '👑', name: 'Legend', condition: (s.totalStars || 0) >= 60 },
          star_100: { emoji: '🏆', name: 'GOAT', condition: (s.totalStars || 0) >= 100 },
          star_200: { emoji: '🐉', name: 'Mythical', condition: (s.totalStars || 0) >= 200 },
          star_500: { emoji: '💎', name: 'Immortal', condition: (s.totalStars || 0) >= 500 },
          perfect: { emoji: '🎯', name: 'Perfectionist', condition: (s.threeStars || 0) >= 1 },
          perfect_5: { emoji: '🏹', name: 'Sharp Shooter', condition: (s.threeStars || 0) >= 5 },
          perfect_10: { emoji: '💯', name: 'Flawless', condition: (s.threeStars || 0) >= 10 },
          games_5: { emoji: '🎮', name: 'Gamer', condition: (s.uniqueGames || 0) >= 5 },
          games_10: { emoji: '🔥', name: 'Addict', condition: (s.uniqueGames || 0) >= 10 },
          games_all: { emoji: '🎉', name: 'Completionist', condition: (s.uniqueGames || 0) >= 22 },
          stage_5: { emoji: '📈', name: 'Getting There', condition: (s.maxStage || 0) >= 5 },
          stage_10: { emoji: '🏃', name: 'Marathon', condition: (s.maxStage || 0) >= 10 },
          stage_15: { emoji: '🏋️', name: 'Endurance', condition: (s.maxStage || 0) >= 15 },
          stage_20: { emoji: '🌈', name: 'Ultimate', condition: (s.maxStage || 0) >= 20 },
        };

        // Get previously earned badges from localStorage
        const prevBadges = new Set(JSON.parse(localStorage.getItem('nq_badges') || '[]'));
        const newBadges: string[] = [];

        for (const [id, check] of Object.entries(badgeChecks)) {
          if (check.condition && !prevBadges.has(id)) {
            prevBadges.add(id);
            newBadges.push(id);
            // Post to feed
            await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
              body: JSON.stringify({
                path: 'feed:createPost',
                format: 'convex_encoded_json',
                args: [{
                  authorId: player.playerId,
                  type: 'badge',
                  content: `earned the ${check.name} badge!`,
                  gameEmoji: check.emoji,
                }],
              }),
            });
          }
        }

        if (newBadges.length > 0) {
          localStorage.setItem('nq_badges', JSON.stringify([...prevBadges]));
        }
      }
    } catch { /* offline */ }
  }, [player, gameId, stage]);

  const handleEnd = (result: GameResult) => {
    setEnded(result);
    saveScore(result);
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
      <div className="flex-1 overflow-hidden">
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
