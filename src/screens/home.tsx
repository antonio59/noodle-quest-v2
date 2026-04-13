import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { Star, Zap, Trophy } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const games = getAllGames();

  const stats = useQuery(api.games.getPlayerStats, player?.playerId ? { playerId: player.playerId as any } : 'skip' as any);
  const isLoading = stats === undefined && !!player?.playerId;

  const recentGames = games.slice(0, 4);
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
          {recentGames.map(g => (
            <button
              key={g.id}
              onClick={() => navigate(`/play/${g.id}`, { state: { stage: 1 } })}
              className="bg-card hover:bg-card-hover rounded-xl p-4 text-left transition-all active:scale-95 shadow-sm hover:shadow-md"
            >
              <div className="text-3xl mb-2">{g.emoji}</div>
              <div className="font-semibold text-sm">{g.name}</div>
              <div className="text-text-muted text-xs mt-1 line-clamp-2">{g.description}</div>
            </button>
          ))}
        </div>

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
