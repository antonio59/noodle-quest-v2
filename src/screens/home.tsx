import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { Star, Zap, Trophy, Sparkles } from 'lucide-react';
import { getBonusTier } from '@/lib/bonus-multiplier';

export function Home() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const games = getAllGames();

  const stats = useQuery(api.games.getPlayerStats, player?.playerId ? { playerId: player.playerId as any } : 'skip' as any);
  const isLoading = stats === undefined && !!player?.playerId;

  const gameStages = stats?.gameStages ?? {};
  // Personalized Quick Play:
  // 1) Games the player has played, ranked by timesPlayed (continue what you were doing)
  // 2) Fill with never-played games (highest bonus) to encourage exploration
  const played = games
    .filter(g => (gameStages[g.id]?.timesPlayed ?? 0) > 0)
    .sort((a, b) => (gameStages[b.id]?.timesPlayed ?? 0) - (gameStages[a.id]?.timesPlayed ?? 0));
  const unplayed = games.filter(g => (gameStages[g.id]?.timesPlayed ?? 0) === 0);
  const recentGames = [...played, ...unplayed].slice(0, 4);

  // Top bonus picks (unplayed or low play count) — "Try for bonus points"
  const bonusPicks = games
    .filter(g => (gameStages[g.id]?.timesPlayed ?? 0) <= 2)
    .sort((a, b) => (gameStages[a.id]?.timesPlayed ?? 0) - (gameStages[b.id]?.timesPlayed ?? 0))
    .slice(0, 3);

  const totalStars = stats?.totalStars ?? 0;
  const gamesPlayed = stats?.gamesPlayed ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-text-muted text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold">{player?.avatar} {player?.name}</h1>
          </div>
          <button className="text-3xl active:scale-90 transition-transform">
            {player?.avatar || '🎮'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Star, label: 'Stars', value: isLoading ? '...' : String(totalStars), color: 'text-warning' },
            { icon: Zap, label: 'Games', value: isLoading ? '...' : String(gamesPlayed), color: 'text-success' },
            { icon: Trophy, label: 'Games Unlocked', value: String(games.length), color: 'text-accent' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-3 text-center shadow-sm">
              <s.icon className={`mx-auto mb-1 ${s.color}`} size={20} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-text-muted text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Zap size={18} className="text-accent" /> Quick Play
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {recentGames.map(g => {
            const gs = gameStages[g.id];
            const earned = Math.min(gs?.starsEarned ?? 0, 3);
            const tier = getBonusTier(gs?.timesPlayed ?? 0);
            return (
              <button
                key={g.id}
                onClick={() => navigate(`/play/${g.id}`, { state: { stage: 1 } })}
                className="bg-card hover:bg-card-hover rounded-xl p-4 text-left transition-all active:scale-95 shadow-sm hover:shadow-md relative"
              >
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="font-semibold text-sm">{g.name}</div>
                <div className="text-text-muted text-xs mt-1 line-clamp-2">{g.description}</div>
                <div className="flex items-center justify-between gap-1 mt-2 min-h-[18px]">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(i => (
                      <Star
                        key={i}
                        size={11}
                        className={i <= earned ? 'text-warning' : 'text-card-hover'}
                        fill={i <= earned ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  {tier && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-surface ${tier.color}`}>
                      {tier.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {bonusPicks.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-warning" /> Try these for bonus points
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {bonusPicks.map(g => {
                const tier = getBonusTier(gameStages[g.id]?.timesPlayed ?? 0);
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/play/${g.id}`, { state: { stage: 1 } })}
                    className="bg-card hover:bg-card-hover rounded-xl p-3 text-center transition-all active:scale-95 shadow-sm"
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="text-xs font-semibold truncate">{g.name}</div>
                    {tier && (
                      <div className={`text-[10px] font-bold mt-1 ${tier.color}`}>{tier.label}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          onClick={() => navigate('/games')}
          className="w-full bg-accent-soft text-accent font-semibold py-3 rounded-xl hover:bg-accent/20 transition-colors"
        >
          Browse All Games →
        </button>
      </div>
    </div>
  );
}
