import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Clock } from 'lucide-react';

interface Challenge {
  id: string;
  fromId: string;
  gameId: string;
  stage: number;
  fromScore: number;
  createdAt: number;
  fromName?: string;
  fromAvatar?: string;
}

export function Challenges() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
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
        {(['pending', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              tab === t ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text'
            }`}
          >
            {t === 'pending' ? '⏳ Pending' : '📜 History'}
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
              challenges.map(c => (
                <div key={c.id} className="bg-card rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-2xl">⚔️</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Challenge on {c.gameId}</div>
                      <div className="text-text-muted text-xs flex items-center gap-1">
                        <Clock size={12} /> Stage {c.stage} • Score: {c.fromScore}
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
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="text-center text-text-muted text-sm py-12">
            No challenge history yet. ⚔️
          </div>
        )}
      </div>
    </div>
  );
}
