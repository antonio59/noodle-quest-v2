import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames, getGame } from '@/lib/game-registry';
import { Trophy, Star, ChevronDown, Crown } from 'lucide-react';

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  totalStars: number;
  totalScore: number;
  gamesPlayed: number;
  topGames: { gameId: string; stars: number; score: number }[];
}

const RANK_COLORS = [
  { bg: 'bg-warning/20', border: 'border-warning/50', text: 'text-warning', medal: '🥇' },
  { bg: 'bg-text-muted/20', border: 'border-text-muted/50', text: 'text-text-muted', medal: '🥈' },
  { bg: 'bg-orange-400/20', border: 'border-orange-400/50', text: 'text-orange-400', medal: '🥉' },
];

function StarBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-card-hover rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-accent w-8 text-right">{count}</span>
    </div>
  );
}

export function Leaderboard() {
  const { player } = useAuth();
  const games = getAllGames();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const listRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const overallData = useQuery(api.games.getLeaderboard, {});
  const gameData = useQuery(api.games.getLeaderboard, selectedGame ? { gameId: selectedGame } : 'skip' as any);

  const isLoading = selectedGame ? gameData === undefined : overallData === undefined;
  const rawEntries: LeaderboardEntry[] = (selectedGame ? gameData : overallData) ?? [];

  const entries = useMemo(() => {
    return rawEntries
      .filter(e => e && e.playerName)
      .sort((a, b) => b.totalStars - a.totalStars);
  }, [rawEntries]);

  const maxStars = useMemo(() => {
    return entries.length > 0 ? entries[0].totalStars : 1;
  }, [entries]);

  const currentPlayerIndex = useMemo(() => {
    return entries.findIndex(e => e.playerName === player?.name);
  }, [entries, player]);

  const currentPlayerEntry = currentPlayerIndex >= 0 ? entries[currentPlayerIndex] : null;

  // Show sticky footer when current player is scrolled out of view
  useEffect(() => {
    const el = listRef.current;
    if (!el || currentPlayerIndex < 3) {
      setShowSticky(false);
      return;
    }
    const onScroll = () => {
      const playerEl = el.querySelector(`[data-player="${player?.name}"]`) as HTMLElement;
      if (!playerEl) {
        setShowSticky(false);
        return;
      }
      const rect = playerEl.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      const isVisible = rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
      setShowSticky(!isVisible);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [currentPlayerIndex, player?.name, entries]);

  const getGameName = (gameId: string) => {
    const game = getGame(gameId);
    return game ? `${game.emoji} ${game.name}` : gameId;
  };

  const filterLabel = selectedGame
    ? getGameName(selectedGame)
    : 'All Games';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Trophy size={20} className="text-warning" />
            Rankings
          </h1>
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-card hover:bg-card-hover px-3 py-1.5 rounded-lg transition-colors"
            >
              {filterLabel}
              <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 bg-card rounded-xl shadow-xl border border-white/5 z-50 py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedGame(''); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-card-hover transition-colors ${!selectedGame ? 'text-accent font-bold' : 'text-text'}`}
                  >
                    🎮 All Games
                  </button>
                  {games.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGame(g.id); setFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-card-hover transition-colors ${selectedGame === g.id ? 'text-accent font-bold' : 'text-text'}`}
                    >
                      {g.emoji} {g.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-text-muted text-xs mt-1">
          {entries.length} player{entries.length !== 1 ? 's' : ''} ranked by total stars
        </p>
      </div>

      {/* Leaderboard List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Star size={40} className="mb-3 text-card-hover" />
            <p className="text-sm">No scores yet</p>
            <p className="text-xs mt-1">Play games to earn stars and climb the ranks!</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {/* Top 3 - special cards */}
            {entries.slice(0, 3).map((entry, idx) => {
              const style = RANK_COLORS[idx] || RANK_COLORS[2];
              const isMe = entry.playerName === player?.name;
              return (
                <div
                  key={entry.playerId}
                  data-player={entry.playerName}
                  className={`relative rounded-2xl p-4 border ${style.border} ${style.bg} ${
                    isMe ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">{style.medal}</span>
                      <span className={`text-xs font-bold ${style.text}`}>#{idx + 1}</span>
                    </div>
                    <span className="text-4xl">{entry.avatar || '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate">{entry.playerName}</span>
                        {isMe && <span className="text-[10px] bg-accent text-bg font-bold px-1.5 py-0.5 rounded">YOU</span>}
                        {idx === 0 && <Crown size={14} className="text-warning" />}
                      </div>
                      <div className="mt-1.5">
                        <StarBar count={entry.totalStars} max={maxStars} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-0.5 text-warning">
                        <Star size={14} fill="currentColor" />
                        <span className="font-bold text-lg">{entry.totalStars}</span>
                      </div>
                      <div className="text-text-muted text-[10px]">{entry.gamesPlayed} games</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            {entries.length > 3 && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Rest of the pack</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}

            {/* Everyone else */}
            {entries.slice(3).map((entry, idx) => {
              const rank = idx + 4;
              const isMe = entry.playerName === player?.name;
              return (
                <div
                  key={entry.playerId}
                  data-player={entry.playerName}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isMe
                      ? 'bg-accent/10 ring-1 ring-accent/40'
                      : 'bg-card hover:bg-card-hover'
                  }`}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                    rank <= 10 ? 'bg-card-hover text-text' : 'text-text-muted'
                  }`}>
                    {rank}
                  </span>
                  <span className="text-2xl">{entry.avatar || '🎮'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{entry.playerName}</span>
                      {isMe && <span className="text-[10px] bg-accent text-bg font-bold px-1.5 py-0.5 rounded">YOU</span>}
                    </div>
                    <div className="mt-1">
                      <StarBar count={entry.totalStars} max={maxStars} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 text-warning">
                      <Star size={12} fill="currentColor" />
                      <span className="font-bold text-sm">{entry.totalStars}</span>
                    </div>
                    <div className="text-text-muted text-[10px]">{entry.gamesPlayed} games</div>
                  </div>
                </div>
              );
            })}

            {/* Bottom padding for sticky */}
            <div className="h-16" />
          </div>
        )}
      </div>

      {/* Sticky "Your Rank" footer */}
      {showSticky && currentPlayerEntry && (
        <div className="flex-shrink-0 p-3 bg-surface border-t border-white/5">
          <div className="bg-accent/10 ring-1 ring-accent/40 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xs font-bold text-accent">#{currentPlayerIndex + 1}</span>
            <span className="text-2xl">{currentPlayerEntry.avatar || '🎮'}</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm">{currentPlayerEntry.playerName}</span>
              <StarBar count={currentPlayerEntry.totalStars} max={maxStars} />
            </div>
            <div className="flex items-center gap-0.5 text-warning">
              <Star size={14} fill="currentColor" />
              <span className="font-bold">{currentPlayerEntry.totalStars}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
