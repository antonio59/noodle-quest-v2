import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { AVATARS } from '@/lib/avatars';
import { LogOut, Star, Gamepad2, Trophy, Zap } from 'lucide-react';

export function Profile() {
  const { player, logout, updateAvatar } = useAuth();
  const games = getAllGames();

  // Fetch real stats
  const stats = useQuery(api.games.getPlayerStats, player ? { playerId: player.playerId as any } : 'skip' as any);

  const totalStars = stats?.totalStars ?? 0;
  const gamesPlayed = stats?.gamesPlayed ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        {/* Player Card */}
        <div className="bg-card rounded-2xl p-6 text-center mb-6 shadow-sm">
          <button className="text-6xl mb-3 active:scale-90 transition-transform">
            {player?.avatar || '🎮'}
          </button>
          <h2 className="text-xl font-bold">{player?.name}</h2>
          <p className="text-text-muted text-sm">
            {gamesPlayed > 0 ? `${gamesPlayed} games played` : 'New player'}
          </p>
        </div>

        {/* Avatar picker */}
        <div className="bg-card rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-text-dim mb-3">Change Avatar</h3>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => updateAvatar(a)}
                className={`text-2xl p-1.5 rounded-lg transition-all ${
                  player?.avatar === a ? 'bg-accent-soft ring-2 ring-accent' : 'opacity-50 hover:opacity-80'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Star className="mx-auto text-warning mb-1" size={20} />
            <div className="text-2xl font-bold">{totalStars}</div>
            <div className="text-text-muted text-xs">Total Stars</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Trophy className="mx-auto text-accent mb-1" size={20} />
            <div className="text-2xl font-bold">{stats?.gamesPlayed ?? 0}</div>
            <div className="text-text-muted text-xs">Games Played</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Zap className="mx-auto text-success mb-1" size={20} />
            <div className="text-2xl font-bold">{(stats?.totalScore ?? 0).toLocaleString()}</div>
            <div className="text-text-muted text-xs">Total Score</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Gamepad2 className="mx-auto text-primary mb-1" size={20} />
            <div className="text-2xl font-bold">{games.length}</div>
            <div className="text-text-muted text-xs">Games Available</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-card text-danger font-semibold py-3 rounded-xl hover:bg-card-hover transition-colors active:scale-95"
        >
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </div>
  );
}
