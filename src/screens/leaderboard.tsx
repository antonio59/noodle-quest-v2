import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Star, Gamepad2 } from 'lucide-react';

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
    // Fetch from Convex
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({ path: 'games:getLeaderboard', format: 'convex_encoded_json', args: [{}] }),
        });
        const data = await res.json();
        if (data.value) {
          setEntries(data.value.map((e: any, i: number) => ({
            rank: i + 1,
            name: e.playerName,
            avatar: e.avatar,
            stars: e.totalStars,
            games: e.gamesPlayed,
          })));
        }
      } catch { /* offline */ }
    };
    fetchLeaderboard();
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

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
        {/* Top 3 podium */}
        {top3.length >= 3 && (
          <div className="flex items-end justify-center gap-3 p-6 pb-2">
            {[1, 0, 2].map(idx => {
              const e = top3[idx];
              if (!e) return null;
              const medals = ['🥇', '🥈', '🥉'];
              const heights = ['h-16', 'h-24', 'h-12'];
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className="text-3xl mb-1">{e.avatar}</div>
                  <div className="text-xs font-semibold truncate max-w-[80px]">{e.name}</div>
                  <div className="text-accent text-xs font-bold">{e.stars} ⭐</div>
                  <div className={`w-16 ${heights[idx]} bg-card-hover rounded-t-lg mt-2 flex items-start justify-center pt-1`}>
                    <span className="text-lg">{medals[idx]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rest of leaderboard */}
        <div className="p-4 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">
              No scores yet! Play some games to appear here. 🎮
            </div>
          ) : (
            rest.map(e => (
              <div
                key={e.rank}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  e.name === player?.name ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-card'
                }`}
              >
                <span className="w-8 h-8 flex items-center justify-center bg-card-hover rounded-full text-sm font-bold">
                  {e.rank}
                </span>
                <span className="text-xl">{e.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{e.name}</div>
                  <div className="text-text-muted text-xs">{e.games} games played</div>
                </div>
                <span className="text-accent font-bold">{e.stars} ⭐</span>
              </div>
            ))
          )}
        </div>

        {/* Tips */}
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-bold text-text-dim">💡 Tips</h3>
          <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
            Complete all stages of each game to earn maximum stars!
          </div>
          <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
            Replay stages for 3-star scores to collect more stars faster.
          </div>
        </div>
      </div>
    </div>
  );
}
