import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames, getGame } from '@/lib/game-registry';
import { Trophy, Star, X } from 'lucide-react';

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  totalStars: number;
  totalScore: number;
  gamesPlayed: number;
  topGames: { gameId: string; stars: number; score: number }[];
}

export function Leaderboard() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'overall' | 'game'>('overall');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
  const games = getAllGames();

  const overallData = useQuery(api.games.getLeaderboard, {});
  const gameData = useQuery(api.games.getLeaderboard, selectedGame ? { gameId: selectedGame } : 'skip' as any);

  const isLoading = tab === 'overall' ? overallData === undefined : selectedGame ? gameData === undefined : false;
  const entries: LeaderboardEntry[] = (tab === 'overall' ? overallData : gameData) ?? [];
  const sorted = entries.filter(e => e && e.playerName).sort((a, b) => b.totalStars - a.totalStars);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const getGameName = (gameId: string) => {
    const game = getGame(gameId);
    return game ? `${game.emoji} ${game.name}` : gameId;
  };

  const medalEmoji = ['🥇', '🥈', '🥉'];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const podiumOrder = [1, 0, 2]; // silver, gold, bronze display order

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">Leaderboard</h1>
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
            {t === 'overall' ? 'Overall' : 'By Game'}
          </button>
        ))}
      </div>

      {/* Game selector for "By Game" tab */}
      {tab === 'game' && (
        <div className="p-3 border-b border-white/5 flex-shrink-0">
          <select
            value={selectedGame}
            onChange={e => setSelectedGame(e.target.value)}
            className="w-full bg-card rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:ring-1 ring-accent appearance-none"
          >
            <option value="">Select a game...</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-muted text-sm">Loading rankings...</div>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length >= 3 && (
              <div className="flex items-end justify-center gap-3 p-6 pb-2">
                {podiumOrder.map(idx => {
                  const e = top3[idx];
                  if (!e) return null;
                  return (
                    <button 
                      key={idx} 
                      onClick={() => setSelectedPlayer(e)}
                      className="flex flex-col items-center hover:opacity-80 transition-opacity"
                    >
                      <div className="text-3xl mb-1">{e.avatar || '🎮'}</div>
                      <div className="text-xs font-semibold truncate max-w-[80px]">{e.playerName}</div>
                      <div className="text-accent text-xs font-bold">{e.totalStars} stars</div>
                      <div className={`w-16 ${podiumHeights[idx]} bg-card-hover rounded-t-lg mt-2 flex items-start justify-center pt-1`}>
                        <span className="text-lg">{medalEmoji[idx]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {top3.length > 0 && top3.length < 3 && (
              <div className="p-4 pb-0">
                <h3 className="text-sm font-bold text-text-dim mb-3 flex items-center gap-1.5">
                  <Trophy size={14} className="text-warning" /> Top Players
                </h3>
                <div className="space-y-2">
                  {top3.map((e, i) => (
                    <button
                      key={e.playerId}
                      onClick={() => setSelectedPlayer(e)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-card-hover transition-colors ${
                        e.playerName === player?.name ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-card'
                      }`}
                    >
                      <span className="text-2xl">{medalEmoji[i]}</span>
                      <span className="text-xl">{e.avatar || '🎮'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{e.playerName}</div>
                        <div className="text-text-muted text-xs">{e.gamesPlayed} games played</div>
                      </div>
                      <span className="text-accent font-bold">{e.totalStars}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rest of leaderboard */}
            <div className="p-4 space-y-2">
              {sorted.length === 0 ? (
                <div className="text-center text-text-muted text-sm py-12">
                  <Star className="mx-auto mb-3 text-card-hover" size={32} />
                  {tab === 'game' && !selectedGame
                    ? 'Select a game to see its leaderboard'
                    : 'No scores yet — play some games to appear here!'}
                </div>
              ) : (
                rest.map((e, i) => (
                  <div
                    key={e.playerId}
                    onClick={() => setSelectedPlayer(e)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-card-hover transition-colors ${
                      e.playerName === player?.name ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-card'
                    }`}
                  >
                    <span className="w-8 h-8 flex items-center justify-center bg-card-hover rounded-full text-sm font-bold">
                      {i + 4}
                    </span>
                    <span className="text-xl">{e.avatar || '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{e.playerName}</div>
                      <div className="text-text-muted text-xs">{e.gamesPlayed} games played</div>
                    </div>
                    <span className="text-accent font-bold">{e.totalStars}</span>
                  </div>
                ))
              )}
            </div>

            {/* Tips */}
            {sorted.length > 0 && (
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-bold text-text-dim">Tips</h3>
                <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
                  Complete all stages of each game to earn maximum stars!
                </div>
                <div className="bg-card rounded-xl p-3 text-sm text-text-muted border-l-3 border-accent">
                  Replay stages for 3-star scores to collect more stars faster.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedPlayer.avatar || '🎮'}</span>
                <div>
                  <h2 className="text-xl font-bold">{selectedPlayer.playerName}</h2>
                  <div className="text-accent font-semibold">{selectedPlayer.totalStars} stars</div>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="p-2 hover:bg-card rounded-lg">
                <X size={20} className="text-text-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-text-muted">
                Total Score: <span className="text-text font-semibold">{selectedPlayer.totalScore.toLocaleString()}</span>
              </div>
              <div className="text-sm text-text-muted">
                Games Played: <span className="text-text font-semibold">{selectedPlayer.gamesPlayed}</span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-text-dim mb-2">Top Games</h3>
                <div className="space-y-2">
                  {selectedPlayer.topGames?.map((game, i) => (
                    <div key={i} className="flex items-center justify-between bg-card rounded-lg p-3">
                      <span className="text-sm">{getGameName(game.gameId)}</span>
                      <div className="text-right">
                        <div className="text-accent font-bold">{game.stars} ⭐</div>
                        <div className="text-text-muted text-xs">{game.score} pts</div>
                      </div>
                    </div>
                  ))}
                  {(!selectedPlayer.topGames || selectedPlayer.topGames.length === 0) && (
                    <div className="text-text-muted text-sm text-center py-2">No games yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
