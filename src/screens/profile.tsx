import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { AVATARS } from '@/lib/avatars';
import { LogOut, Star, Gamepad2, Trophy, Zap, X, AlertTriangle } from 'lucide-react';

export function Profile() {
  const { player, logout, updateAvatar } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const games = getAllGames();

  // Fetch real stats
  const stats = useQuery(api.games.getPlayerStats, player ? { playerId: player.playerId as any } : 'skip' as any);

  const totalStars = stats?.totalStars ?? 0;
  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const totalScore = stats?.totalScore ?? 0;
  const gameStages = stats?.gameStages ?? {};
  const bestGameEntry = Object.entries(gameStages).sort((a, b) => b[1].highScore - a[1].highScore)[0];
  const bestGame = bestGameEntry ? games.find(g => g.id === bestGameEntry[0]) : undefined;
  const highestScore = Object.values(gameStages).reduce((max, g) => Math.max(max, g.highScore || 0), 0);
  const totalPlays = Object.values(gameStages).reduce((sum, g) => sum + (g.timesPlayed || 0), 0);

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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Star className="mx-auto text-warning mb-1" size={20} />
            <div className="text-2xl font-bold">{totalStars}</div>
            <div className="text-text-muted text-xs">Total Stars</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Trophy className="mx-auto text-accent mb-1" size={20} />
            <div className="text-2xl font-bold">{gamesPlayed}</div>
            <div className="text-text-muted text-xs">Games Played</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Zap className="mx-auto text-success mb-1" size={20} />
            <div className="text-2xl font-bold">{totalScore.toLocaleString()}</div>
            <div className="text-text-muted text-xs">Total Score</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Gamepad2 className="mx-auto text-primary mb-1" size={20} />
            <div className="text-2xl font-bold">{games.length}</div>
            <div className="text-text-muted text-xs">Games Available</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Trophy className="mx-auto text-danger mb-1" size={20} />
            <div className="text-2xl font-bold">{highestScore.toLocaleString()}</div>
            <div className="text-text-muted text-xs">Highest Score</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <Zap className="mx-auto text-warning mb-1" size={20} />
            <div className="text-2xl font-bold">{totalPlays}</div>
            <div className="text-text-muted text-xs">Total Plays</div>
          </div>
        </div>

        {bestGame && (
          <div className="bg-card rounded-xl p-4 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-text-dim mb-2">Top Game</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bestGame.emoji}</span>
                <div>
                  <div className="font-semibold text-sm">{bestGame.name}</div>
                  <div className="text-text-muted text-xs">Best score</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-accent">{bestGameEntry?.[1].highScore.toLocaleString()}</div>
                <div className="text-text-muted text-xs">{bestGameEntry?.[1].starsEarned} stars earned</div>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-3 px-6 rounded-xl border border-danger/30 hover:border-danger/50 transition-colors active:scale-95"
          >
            <LogOut size={18} /> Log Out
          </button>
        </div>

        {/* Logout confirmation modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-danger/20 p-2 rounded-full">
                  <AlertTriangle size={24} className="text-danger" />
                </div>
                <h3 className="text-lg font-bold">Log Out?</h3>
              </div>
              <p className="text-text-muted text-sm mb-6">
                Are you sure you want to log out? Your progress is saved and you can sign back in anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-card hover:bg-card-hover text-text font-semibold py-2.5 rounded-xl transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(false); logout(); }}
                  className="flex-1 bg-danger hover:bg-danger/90 text-white font-semibold py-2.5 rounded-xl transition-colors active:scale-95"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
