import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Star, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import type { GameDefinition, GameResult } from '@/types';
import { ReportIssue } from '@/components/ReportIssue';

interface PlayGameProps {
  game: GameDefinition;
  gameId: string;
  stage: number;
  onBack: () => void;
}

const STAGE_NAMES = [
  'Rookie', 'Beginner', 'Getting Started', 'Warming Up', 'Halfway',
  'Skilled', 'Advanced', 'Expert', 'Master', 'Legend',
  'Champion', 'Elite', 'Supreme', 'Ultimate', 'Transcendent',
  'Mythical', 'Divine', 'Immortal', 'Infinite', 'Cosmic',
];

export function PlayGame({ game, gameId, stage, onBack }: PlayGameProps) {
  const { player } = useAuth();
  const [currentStage, setCurrentStage] = useState(stage);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [ended, setEnded] = useState<GameResult | null>(null);
  const savedRef = useRef(false);
  const gameKeyRef = useRef(0);
  const [showReport, setShowReport] = useState(false);

  // Reset when stage changes
  useEffect(() => {
    setScore(0);
    setProgress(0);
    setMessage('');
    setEnded(null);
    savedRef.current = false;
    gameKeyRef.current++;
  }, [currentStage]);

  const GameComponent = game.component;
  const stageName = STAGE_NAMES[currentStage - 1] || `Stage ${currentStage}`;
  const _allComplete = currentStage >= game.stages;

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
          args: [{ playerId: player.playerId, gameId, stage: currentStage, score: result.score, stars: result.stars }],
        }),
      });

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

        const prevBadges = new Set(JSON.parse(localStorage.getItem('nq_badges') || '[]'));
        const newBadges: string[] = [];

        for (const [id, check] of Object.entries(badgeChecks)) {
          if (check.condition && !prevBadges.has(id)) {
            prevBadges.add(id);
            newBadges.push(id);
            await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
              body: JSON.stringify({
                path: 'feed:createPost',
                format: 'convex_encoded_json',
                args: [{ authorId: player.playerId, type: 'badge', content: `earned the ${check.name} badge!`, gameEmoji: check.emoji }],
              }),
            });
          }
        }

        if (newBadges.length > 0) {
          localStorage.setItem('nq_badges', JSON.stringify([...prevBadges]));
        }
      }
    } catch { /* offline */ }
  }, [player, gameId, currentStage]);

  const handleEnd = (result: GameResult) => {
    setEnded(result);
    saveScore(result);

    // Auto-advance to next stage on 3-star win
    if (result.stars === 3 && currentStage < game.stages) {
      setTimeout(() => {
        setCurrentStage(s => s + 1);
      }, 3000);
    }
  };

  const nextStage = () => {
    if (currentStage < game.stages) {
      setCurrentStage(s => s + 1);
    }
  };

  const prevStage = () => {
    if (currentStage > 1) {
      setCurrentStage(s => s - 1);
    }
  };

  const randomStage = () => {
    setCurrentStage(Math.floor(Math.random() * game.stages) + 1);
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

  // Stage selector during gameplay
  const StageSelector = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={prevStage}
        disabled={currentStage <= 1}
        className="p-1 rounded hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-center min-w-[120px]">
        <div className="font-semibold text-sm">{game.emoji} {game.name}</div>
        <div className="text-text-muted text-xs">Stage {currentStage} — {stageName}</div>
      </div>
      <button
        onClick={nextStage}
        disabled={currentStage >= game.stages}
        className="p-1 rounded hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );

  if (ended) {
    return (
      <div className="h-full flex flex-col items-center justify-center mobile-p-8 p-8 text-center">
        <div className={`mobile-text-6xl text-6xl mb-4 ${ended.stars >= 2 ? 'animate-[celebrate_0.4s_ease]' : ''}`}>
          {ended.stars === 3 ? '🏆' : ended.stars === 2 ? '🎉' : '🌱'}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {ended.stars === 3 ? 'Amazing!' : ended.stars === 2 ? 'Great Job!' : 'Keep Growing!'}
        </h2>
        <div className="text-text-muted text-sm mb-1">Stage {currentStage} — {stageName}</div>
        {renderStars(ended.stars)}
        <p className="text-accent text-xl font-bold mb-2">Score: {ended.score}</p>
        <p className="text-text-muted text-sm mb-6 max-w-xs">{ended.summary}</p>

        {ended.stars === 3 && currentStage < game.stages && (
          <div className="text-success text-sm mb-4 animate-pulse">
            ⭐ Perfect! Advancing to Stage {currentStage + 1}...
          </div>
        )}

        {/* Stage navigation */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={prevStage}
            disabled={currentStage <= 1}
            className="bg-card text-text px-3 py-2 rounded-xl text-sm disabled:opacity-30 hover:bg-card-hover active:scale-95"
          >
            ← Stage {currentStage - 1}
          </button>
          <button
            onClick={randomStage}
            className="bg-card text-text px-3 py-2 rounded-xl text-sm hover:bg-card-hover active:scale-95"
          >
            <Shuffle size={14} className="inline mr-1" /> Random
          </button>
          <button
            onClick={nextStage}
            disabled={currentStage >= game.stages}
            className="bg-card text-text px-3 py-2 rounded-xl text-sm disabled:opacity-30 hover:bg-card-hover active:scale-95"
          >
            Stage {currentStage + 1} →
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setEnded(null); setScore(0); setProgress(0); setMessage(''); gameKeyRef.current++; }}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Replay Stage {currentStage}
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
        <StageSelector />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-xs bg-card/50 hover:bg-card px-2 py-1 rounded-lg transition-colors"
          >
            🐛 Report
          </button>
          <div className="text-accent font-bold min-w-[36px] text-right">{score}</div>
        </div>
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

      {/* Game area — key forces remount on stage change */}
      <div className="flex-1 overflow-hidden">
        <GameComponent
          key={gameKeyRef.current}
          stage={currentStage}
          onScore={pts => setScore(s => s + pts)}
          onProgress={setProgress}
          onMessage={setMessage}
          onEnd={handleEnd}
        />
      </div>

      {showReport && (
        <ReportIssue
          gameId={gameId}
          gameName={game.name}
          stage={currentStage}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
