import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { Trophy, Clock, Zap } from 'lucide-react';

interface Challenge {
  id: string;
  fromId: string;
  gameId: string;
  stage: number;
  fromScore: number;
  createdAt: number;
}

const DUEL_GAMES = [
  { emoji: '🐱', name: 'Copy Cat', id: 'copy-cat', desc: 'Memory — who remembers the longest sequence?' },
  { emoji: '🃏', name: 'Memory Match', id: 'memory-match', desc: 'Memory — who finds pairs fastest?' },
  { emoji: '🧠', name: 'Number Ninja', id: 'number-ninja', desc: 'Memory — who recalls the most digits?' },
  { emoji: '🎯', name: 'Focus Frenzy', id: 'focus-frenzy', desc: 'Focus — who taps targets fastest?' },
  { emoji: '🔢', name: 'Speed Math', id: 'speed-math', desc: 'Sequence — who solves most equations?' },
  { emoji: '🐍', name: 'Snakes & Ladders', id: 'snakes-ladders', desc: 'Board — who reaches 100 first?' },
  { emoji: '⚫', name: 'Checkers', id: 'checkers', desc: 'Board — who captures all pieces?' },
  { emoji: '🔴', name: 'Connect 4', id: 'connect-four', desc: 'Board — who gets 4 in a row?' },
  { emoji: '❌', name: 'Tic Tac Toe', id: 'tic-tac-toe', desc: 'Board — classic 3×3 strategy' },
  { emoji: '⏱️', name: 'Reaction Time', id: 'reaction-time', desc: 'Focus — who taps fastest?' },
];

export function Challenges() {
  const { player } = useAuth();
  const games = getAllGames();
  const [tab, setTab] = useState<'pending' | 'history' | 'duel'>('pending');
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const fetchChallenges = useCallback(async () => {
    if (!player) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'challenges:getPendingChallenges',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId }],
        }),
      });
      const data = await res.json();
      if (data.value) {
        setChallenges(data.value.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          fromId: c.fromId as string,
          gameId: c.gameId as string,
          stage: c.stage as number,
          fromScore: c.fromScore as number,
          createdAt: c.createdAt as number,
        })));
      }
    } catch { /* offline */ }
  }, [player]);

  useEffect(() => {
    const timer = setTimeout(fetchChallenges, 0);
    return () => clearTimeout(timer);
  }, [fetchChallenges]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">⚔️ Challenges</h1>
      </div>

      <div className="flex border-b border-white/5 flex-shrink-0">
        {(['pending', 'history', 'duel'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              tab === t ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text'
            }`}
          >
            {t === 'pending' ? '⏳ Pending' : t === 'history' ? '📜 History' : '⚔️ Duel'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'pending' && (
          <div className="space-y-3">
            {challenges.length === 0 ? (
              <div className="text-center text-text-muted text-sm py-12">
                No pending challenges! Play games to earn scores worth challenging others. ⚔️
              </div>
            ) : (
              challenges.map(c => {
                const game = games.find(g => g.id === c.gameId);
                return (
                  <div key={c.id} className="bg-card rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl">{game?.emoji || '🎮'}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{game?.name || c.gameId}</div>
                        <div className="text-text-muted text-xs flex items-center gap-1">
                          <Clock size={12} /> Stage {c.stage} • Score to beat: {c.fromScore}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-success/20 text-success font-semibold py-2 rounded-lg text-sm hover:bg-success/30 transition-colors">
                        <Trophy size={14} className="inline mr-1" /> Play!
                      </button>
                      <button className="bg-card-hover text-text-muted font-semibold py-2 px-4 rounded-lg text-sm hover:text-text transition-colors">
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="text-center text-text-muted text-sm py-12">
            No challenge history yet. ⚔️
          </div>
        )}

        {tab === 'duel' && (
          <div>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">⚔️</div>
              <h2 className="text-lg font-bold mb-1">Duel Games</h2>
              <p className="text-text-muted text-sm">Pick a game, set a high score, then challenge a friend to beat it!</p>
            </div>

            <div className="space-y-2">
              {DUEL_GAMES.map(g => {
                const fullGame = games.find(gg => gg.id === g.id);
                return (
                  <div key={g.id} className="bg-card rounded-xl p-3 flex items-center gap-3">
                    <div className="text-2xl">{g.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{g.name}</div>
                      <div className="text-text-muted text-xs">{g.desc}</div>
                    </div>
                    <button className="bg-accent/20 text-accent font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-accent/30 transition-colors flex items-center gap-1 flex-shrink-0">
                      <Zap size={12} /> Play
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
