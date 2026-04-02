import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, ChevronRight, ArrowRight } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getGame } from '@/lib/game-registry';
import type { GameResult } from '@/types';

export function PlayGame() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const { player } = useAuth();

  const stage = (location.state as any)?.stage ?? 1;
  const fromTab = (location.state as any)?.fromTab ?? 'brain';
  const isMultiplayer = (location.state as any)?.multiplayer ?? false;
  const aiDifficulty = (location.state as any)?.aiDifficulty ?? 'medium';

  const [currentStage, setCurrentStage] = useState(stage);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [ended, setEnded] = useState<GameResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextStage, setNextStage] = useState<number | null>(null);

  const saveScore = useMutation(api.games.saveScore);

  // Look up the game from the registry
  const gameEntry = gameId ? getGame(gameId) : undefined;

  // Redirect if game not found
  useEffect(() => {
    if (!gameEntry) {
      navigate('/games', { replace: true });
    }
  }, [gameEntry, navigate]);

  if (!gameEntry || !gameId) return null;

  const { component: GameComponent, ...game } = gameEntry;
  const gameDef = { ...game, component: GameComponent };

  const handleEnd = async (result: GameResult) => {
    setEnded(result);
    setSaving(true);

    if (player && saveScore) {
      try {
        await saveScore({
          playerId: player.playerId as any,
          gameId,
          stage: currentStage,
          score: result.score,
          stars: result.stars,
        });
      } catch (err) {
        console.error('Failed to save score:', err);
      }
    }
    setSaving(false);

    if (result.stars > 0 && currentStage < gameDef.stages) {
      setNextStage(currentStage + 1);
    }
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

  const goBackToGames = () => {
    navigate(`/games${fromTab !== 'brain' ? `?tab=${fromTab}` : ''}`);
  };

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
        <p className="text-accent text-xl font-bold mb-1">Score: {ended.score}</p>
        {saving && <p className="text-text-muted text-xs mb-2">Saving...</p>}
        <p className="text-text-muted text-sm mb-6 max-w-xs">{ended.summary}</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => {
              setEnded(null);
              setScore(0);
              setProgress(0);
              setNextStage(null);
            }}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Play Again
          </button>
          {nextStage && (
            <button
              onClick={() => {
                setEnded(null);
                setScore(0);
                setProgress(0);
                setNextStage(null);
                setCurrentStage(nextStage);
              }}
              className="bg-success text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95 flex items-center gap-1"
            >
              Stage {nextStage} <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={goBackToGames}
            className="bg-card text-text font-bold px-6 py-2.5 rounded-xl hover:bg-card-hover active:scale-95 flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back to {fromTab === 'breathe' ? 'Breathe' : fromTab === 'board' ? 'Board' : fromTab === 'tracks' ? 'Tracks' : 'Games'}
          </button>
          <button
            onClick={() => navigate('/games')}
            className="bg-card text-text-muted font-bold px-6 py-2.5 rounded-xl hover:bg-card-hover active:scale-95 flex items-center gap-1"
          >
            All Games <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 bg-surface border-b border-white/5 flex-shrink-0">
        <button onClick={goBackToGames} className="text-text-muted hover:text-text p-2">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm">{gameDef.emoji} {gameDef.name}</div>
          <div className="text-text-muted text-xs">Stage {currentStage}/{gameDef.stages}</div>
        </div>
        <div className="text-accent font-bold min-w-[60px] text-right pr-2">{score}</div>
      </div>

      <div className="h-1 bg-card flex-shrink-0">
        <div
          className="h-full bg-accent transition-all duration-300 rounded-r"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      {message && (
        <div className="text-center text-text-dim text-sm py-2 px-4">{message}</div>
      )}

      <div className="flex-1 overflow-hidden">
        <GameComponent
          key={`${gameId}-${currentStage}-${aiDifficulty}`}
          stage={currentStage}
          onScore={pts => setScore(s => s + pts)}
          onProgress={setProgress}
          onMessage={setMessage}
          onEnd={handleEnd}
          multiplayerState={isMultiplayer ? { sessionId: '', playerNumber: 1, currentPlayer: 1, boardState: {}, opponentName: '', opponentAvatar: '', status: 'waiting' } : undefined}
          onMultiplayerMove={(move) => {}}
          aiDifficulty={aiDifficulty}
        />
      </div>
    </div>
  );
}
