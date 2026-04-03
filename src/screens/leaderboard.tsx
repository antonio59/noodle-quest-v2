import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  stars: number;
  games: number;
}

export function Leaderboard() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'overall' | 'game'>('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({ path: 'games:getLeaderboard', format: 'convex_encoded_json', args: [{}] }),
        });
        const data = await res.json();
        if (data.value) {
          setEntries(data.value.map((e: Record<string, unknown>, i: number) => ({
            rank: i + 1,
            name: e.playerName as string,
            avatar: e.avatar as string,
            stars: e.totalStars as number,
            games: e.gamesPlayed as number,
          })));
        }
      } catch { /* offline */ }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">🏆 Leaderboard</h1>
      </div>

      <div className="flex border-b border-white/5 flex-shrink-0">
        {(['overall', 'game'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              tab === t ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text'
            }`}
          >
            {t === 'overall' ? '🏅 Overall' : '🎮 By Game'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">
              <Medal className="mx-auto mb-2 text-text-muted" size={32} />
              No scores yet! Play some games to climb the ranks.
            </div>
          ) : (
            entries.map(e => {
              const isTop3 = e.rank <= 3;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div
                  key={e.rank}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    e.name === player?.name
                      ? 'bg-accent/10 ring-1 ring-accent/30'
                      : isTop3
                        ? 'bg-card-hover'
                        : 'bg-card hover:bg-card-hover'
                  }`}
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-card rounded-full text-sm font-bold text-text-muted flex-shrink-0">
                    {isTop3 ? medals[e.rank - 1] : e.rank}
                  </span>
                  <span className="text-xl flex-shrink-0">{e.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {e.name}
                      {e.name === player?.name && <span className="text-accent text-xs ml-2">(you)</span>}
                    </div>
                    <div className="text-text-muted text-xs">{e.games} game{e.games !== 1 ? 's' : ''} played</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-accent font-bold text-sm">{e.stars}</span>
                    <span className="text-warning text-xs ml-0.5">⭐</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tips */}
        <div className="p-4 space-y-2 pb-8">
          <h3 className="text-sm font-bold text-text-dim">💡 How to climb</h3>
          <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
            Complete all stages of each game to earn maximum stars!
          </div>
          <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
            Replay stages for 3-star scores to collect stars faster.
          </div>
          <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
            Challenge friends — beat their scores to rank higher!
          </div>
        </div>
      </div>
    </div>
  );
}
