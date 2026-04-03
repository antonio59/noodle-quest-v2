import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { getAllGames } from '@/lib/game-registry';
import type { GameDefinition } from '@/types';
import { Star, Zap, Shuffle, Play, Heart, TrendingUp } from 'lucide-react';

interface HomeProps {
  onPlay: (game: GameDefinition, id: string, stage: number) => void;
}

export function Home({ onPlay }: HomeProps) {
  const { player } = useAuth();
  const games = getAllGames();
  const recentGames = useState(() => {
    const shuffled = [...games].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  })[0];
  const [favorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('nq_favorites') || '[]'));
    } catch { return new Set(); }
  });
  const [stats, setStats] = useState({ stars: 0, streak: 0, gamesPlayed: 0, mostPlayed: [] as { id: string; name: string; emoji: string; count: number }[] });

  const fetchStats = useCallback(async () => {
    if (!player) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'games:getPlayerStats',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId }],
        }),
      });
      const data = await res.json();
      if (data.value) {
        const gp = data.value.gamesPlayed || 0;
        setStats({
          stars: data.value.totalStars || 0,
          streak: gp > 0 ? Math.min(gp, 7) : 0,
          gamesPlayed: gp,
          mostPlayed: (data.value.mostPlayed || []).slice(0, 6),
        });
      }
    } catch { /* offline */ }
  }, [player]);

  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(fetchStats, 0);
    return () => clearTimeout(timer);
  }, [player, fetchStats]);

  const favGames = games.filter(g => favorites.has(g.id));

  const handleRandomPlay = () => {
    if (games.length === 0) return;
    const idx = Math.floor(Math.random() * games.length);
    const game = games[idx];
    const stage = Math.floor(Math.random() * game.stages) + 1;
    onPlay(game, game.id, stage);
  };

  const dailyGame = games[new Date().getDate() % games.length];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-text-muted text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold">{player?.avatar} {player?.name}</h1>
          </div>
          <div className="bg-card rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-bold text-warning">{stats.stars}</div>
            <div className="text-text-muted text-[10px]">⭐ Stars</div>
          </div>
        </div>

        {/* Daily Game */}
        {dailyGame && (
          <div className="bg-gradient-to-r from-accent/15 to-primary/10 rounded-2xl p-4 mb-4 border border-accent/10">
            <div className="text-xs font-bold text-accent mb-2">📅 DAILY CHALLENGE</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl">{dailyGame.emoji}</div>
              <div className="flex-1">
                <div className="font-bold">{dailyGame.name}</div>
                <div className="text-text-muted text-xs">Can you beat it today?</div>
              </div>
              <button
                onClick={() => onPlay(dailyGame, dailyGame.id, 1)}
                className="bg-accent text-bg font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1 active:scale-95"
              >
                <Play size={14} /> Play
              </button>
            </div>
          </div>
        )}

        {/* Random Play */}
        <button
          onClick={handleRandomPlay}
          className="w-full bg-card hover:bg-card-hover border border-white/5 text-text font-semibold py-3 rounded-xl mb-6 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Shuffle size={18} className="text-accent" /> Random Stage — Surprise Me!
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Star, label: 'Stars', value: stats.stars, color: 'text-warning' },
            { icon: Zap, label: 'Streak', value: stats.streak, color: 'text-success' },
            { icon: Play, label: 'Played', value: stats.gamesPlayed, color: 'text-accent' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-3 text-center">
              <s.icon className={`mx-auto mb-1 ${s.color}`} size={18} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-text-muted text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Most Played */}
        {stats.mostPlayed.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-text-dim mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-success" /> Most Played
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {stats.mostPlayed.map(g => {
                const fullGame = games.find(gg => gg.id === g.id);
                if (!fullGame) return null;
                return (
                  <button
                    key={g.id}
                    onClick={() => onPlay(fullGame, g.id, 1)}
                    className="bg-card hover:bg-card-hover rounded-xl p-3 text-center transition-all active:scale-95"
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="font-semibold text-xs truncate">{g.name}</div>
                    <div className="text-text-muted text-[10px]">{g.count} plays</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* My Favourite Games */}
        {favGames.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-text-dim mb-3 flex items-center gap-2">
              <Heart size={14} className="text-danger" fill="currentColor" /> My Favourites
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {favGames.map(g => (
                <button
                  key={g.id}
                  onClick={() => onPlay(g, g.id, 1)}
                  className="bg-card hover:bg-card-hover rounded-xl p-3 text-center transition-all active:scale-95 relative"
                >
                  <div className="text-2xl mb-1">{g.emoji}</div>
                  <div className="font-semibold text-xs truncate">{g.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Play */}
        <h2 className="text-sm font-bold text-text-dim mb-3">Discover Games</h2>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {recentGames.map(g => (
            <button
              key={g.id}
              onClick={() => onPlay(g, g.id, 1)}
              className="bg-card hover:bg-card-hover rounded-xl p-3 text-center transition-all active:scale-95"
            >
              <div className="text-2xl mb-1">{g.emoji}</div>
              <div className="font-semibold text-xs truncate">{g.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
