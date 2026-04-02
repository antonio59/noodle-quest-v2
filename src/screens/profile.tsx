import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { LogOut, Star, Gamepad2, Zap } from 'lucide-react';

const ALL_AVATARS = [
  '🦊','🐱','🐶','🦁','🐼','🐨','🦄','🐸','🐙','🦋',
  '🐢','🦖','🐧','🦜','🐝','🐛','🐞','🦀','🐳','🐬',
  '🦩','🐿️','🦔','🐇','🦥','🦦','🦨','🦫','🦬','🦣',
  '🦕','🐊','🐅','🐆','🦍','🦧','🐘','🦛','🦏','🐪',
];

export function Profile() {
  const { player, logout, updateAvatar } = useAuth();
  const games = getAllGames();
  const [takenAvatars, setTakenAvatars] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ stars: 0, streak: 0 });

  useEffect(() => {
    // Fetch other players' avatars to block duplicates
    const fetchTaken = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({
            path: 'auth:searchPlayers',
            format: 'convex_encoded_json',
            args: [{ query: '', currentPlayerId: player?.playerId || 'x' }],
          }),
        });
        const data = await res.json();
        if (data.value) {
          const taken = new Set<string>();
          data.value.forEach((p: { avatar: string }) => taken.add(p.avatar));
          setTakenAvatars(taken);
        }
      } catch { /* offline */ }
    };
    if (player) fetchTaken();
  }, [player]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        {/* Player Card */}
        <div className="bg-gradient-to-br from-accent/20 to-card rounded-2xl p-6 text-center mb-6 border border-accent/10">
          <div className="text-6xl mb-3">{player?.avatar || '🎮'}</div>
          <h2 className="text-2xl font-bold">{player?.name}</h2>
          <p className="text-text-muted text-sm">Player</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-xl p-3 text-center">
            <Star className="mx-auto text-warning mb-1" size={18} />
            <div className="text-xl font-bold">{stats.stars}</div>
            <div className="text-text-muted text-[10px]">Stars</div>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <Zap className="mx-auto text-success mb-1" size={18} />
            <div className="text-xl font-bold">{stats.streak}</div>
            <div className="text-text-muted text-[10px]">Streak</div>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <Gamepad2 className="mx-auto text-accent mb-1" size={18} />
            <div className="text-xl font-bold">{games.length}</div>
            <div className="text-text-muted text-[10px]">Games</div>
          </div>
        </div>

        {/* Avatar picker */}
        <div className="bg-card rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-text-dim mb-1">Change Avatar</h3>
          <p className="text-text-muted text-xs mb-3">Avatars in use by others are dimmed</p>
          <div className="flex flex-wrap gap-2">
            {ALL_AVATARS.map(a => {
              const isCurrent = player?.avatar === a;
              const isTaken = takenAvatars.has(a) && !isCurrent;
              return (
                <button
                  key={a}
                  onClick={() => !isTaken && updateAvatar(a)}
                  disabled={isTaken}
                  className={`text-xl p-1.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-accent-soft ring-2 ring-accent scale-110'
                      : isTaken
                        ? 'opacity-20 cursor-not-allowed'
                        : 'opacity-60 hover:opacity-100 hover:scale-110'
                  }`}
                  title={isTaken ? 'In use by another player' : isCurrent ? 'Your avatar' : 'Select'}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-danger/10 text-danger font-semibold py-3 rounded-xl hover:bg-danger/20 transition-colors active:scale-95 border border-danger/20"
        >
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </div>
  );
}
