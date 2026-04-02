import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  stars: number;
  games: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const HEIGHTS = ['h-28', 'h-20', 'h-16'];
const BORDER_COLORS = ['border-warning', 'border-gray-300', 'border-orange-400'];

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
          <div className="bg-gradient-to-b from-accent/5 to-transparent p-6">
            <div className="flex items-end justify-center gap-4">
              {[0, 1, 2].map(rank => {
                const e = top3[rank];
                if (!e) return null;
                return (
                  <div key={rank} className="flex flex-col items-center w-24">
                    <div className={`text-4xl mb-1 ${rank === 0 ? 'animate-[celebrate_1s_ease_infinite]' : ''}`}>
                      {e.avatar}
                    </div>
                    <div className="text-xs font-bold truncate w-full text-center">{e.name}</div>
                    <div className="text-accent text-xs font-bold">{e.stars} ⭐</div>
                    <div className={`w-20 ${HEIGHTS[rank]} bg-card-hover rounded-t-xl mt-3 flex items-start justify-center pt-2 border-t-2 ${BORDER_COLORS[rank]}`}>
                      <span className="text-xl">{MEDALS[rank]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rest of leaderboard */}
        <div className="p-4 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">
              <Medal className="mx-auto mb-2 text-text-muted" size={32} />
              No scores yet! Play some games to climb the ranks.
            </div>
          ) : (
            rest.map(e => (
              <div
                key={e.rank}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  e.name === player?.name
                    ? 'bg-accent/10 ring-1 ring-accent/30'
                    : 'bg-card hover:bg-card-hover'
                }`}
              >
                <span className="w-8 h-8 flex items-center justify-center bg-card-hover rounded-full text-sm font-bold text-text-muted">
                  {e.rank}
                </span>
                <span className="text-xl">{e.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {e.name}
                    {e.name === player?.name && <span className="text-accent text-xs ml-2">(you)</span>}
                  </div>
                  <div className="text-text-muted text-xs">{e.games} game{e.games !== 1 ? 's' : ''} played</div>
                </div>
                <div className="text-right">
                  <span className="text-accent font-bold text-sm">{e.stars}</span>
                  <span className="text-warning text-xs ml-0.5">⭐</span>
                </div>
              </div>
            ))
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
