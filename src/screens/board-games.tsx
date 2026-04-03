import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { Lock, Play, Users } from 'lucide-react';

const BOARD_GAMES = [
  { id: 'snakes', emoji: '🐍', name: 'Snakes & Ladders', desc: 'Race to 100! Climb ladders, avoid snakes!' },
  { id: 'ludo', emoji: '🎯', name: 'Ludo', desc: 'Race your 4 pieces home first!' },
  { id: 'checkers', emoji: '⚫', name: 'Checkers', desc: 'Jump and capture all opponent pieces!' },
  { id: 'dominoes', emoji: '🁣', name: 'Dominoes', desc: 'Match tiles and empty your hand!' },
  { id: 'chess', emoji: '♟️', name: 'Chess', desc: 'Checkmate your opponent\'s king!' },
];

export function BoardGames() {
  const { player } = useAuth();
  const games = getAllGames();
  const [playedGames, setPlayedGames] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!player) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({
            path: 'games:getPlayerStats',
            format: 'convex_encoded_json',
            args: [{ playerId: player.playerId }],
          }),
        });
        const data = await res.json();
        if (data.value) {
          const played = data.value.uniqueGames || 0;
          setPlayedGames(played);
          setUnlocked(played >= games.length);
        }
      } catch { /* offline */ }
    };
    fetchProgress();
  }, [player, games.length]);

  const percent = games.length > 0 ? Math.round((playedGames / games.length) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        <h1 className="text-2xl font-bold mb-2">🎲 Board Games</h1>
        <p className="text-text-muted text-sm mb-6">Classic multiplayer games for 2 players</p>

        {!unlocked ? (
          <div className="text-center">
            <div className="text-5xl mb-4 animate-[celebrate_2s_ease_infinite]">🔒</div>
            <h2 className="text-xl font-bold mb-2">Board Games Locked!</h2>
            <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
              Play all {games.length} brain training games at least once to unlock these multiplayer classics
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {BOARD_GAMES.map(g => (
                <div key={g.id} className="bg-card rounded-xl p-3 text-center opacity-50 border border-dashed border-text-muted/30">
                  <div className="text-2xl mb-1">{g.emoji}</div>
                  <div className="text-xs font-semibold truncate">{g.name}</div>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-xl p-4">
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>{playedGames} / {games.length} games played</span>
                <span>{percent}%</span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-text-muted text-xs mt-3">
                💡 Each game only needs to be played once at any stage!
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-gradient-to-r from-success/20 to-accent/20 rounded-xl p-4 mb-6 border border-success/20">
              <div className="flex items-center gap-2 mb-1">
                <Lock size={16} className="text-success" />
                <span className="text-sm font-bold text-success">Unlocked!</span>
              </div>
              <p className="text-text-muted text-xs">All brain games completed — board games are yours!</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {BOARD_GAMES.map(g => (
                <button
                  key={g.id}
                  className="bg-card hover:bg-card-hover rounded-xl p-4 text-left transition-all active:scale-95"
                >
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <div className="font-bold text-sm">{g.name}</div>
                  <div className="text-text-muted text-xs mt-1">{g.desc}</div>
                  <div className="flex items-center gap-1 mt-2 text-accent text-xs">
                    <Users size={12} /> Play with a friend
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-card rounded-xl p-4 text-center text-text-muted text-sm">
              <Play size={20} className="mx-auto mb-2 text-accent" />
              Board games require 2 players. Invite a friend to play!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
