import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import type { GameDefinition } from '@/types';
import { Star, Zap, Trophy } from 'lucide-react';

interface HomeProps {
  onPlay: (game: GameDefinition, id: string, stage: number) => void;
}

export function Home({ onPlay }: HomeProps) {
  const { player } = useAuth();
  const games = getAllGames();
  const recentGames = games.slice(0, 4);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-text-muted text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold">{player?.avatar} {player?.name}</h1>
          </div>
          <button className="text-3xl active:scale-90 transition-transform">
            {player?.avatar || '🎮'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Star, label: 'Stars', value: '0', color: 'text-warning' },
            { icon: Zap, label: 'Streak', value: '0', color: 'text-success' },
            { icon: Trophy, label: 'Games', value: String(games.length), color: 'text-accent' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-3 text-center">
              <s.icon className={`mx-auto mb-1 ${s.color}`} size={20} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-text-muted text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Play */}
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Zap size={18} className="text-accent" /> Quick Play
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {recentGames.map(g => (
            <button
              key={g.id}
              onClick={() => onPlay(g, g.id, 1)}
              className="bg-card hover:bg-card-hover rounded-xl p-4 text-left transition-all active:scale-95"
            >
              <div className="text-3xl mb-2">{g.emoji}</div>
              <div className="font-semibold text-sm">{g.name}</div>
              <div className="text-text-muted text-xs mt-1 line-clamp-2">{g.description}</div>
            </button>
          ))}
        </div>

        {/* All Games CTA */}
        <button
          onClick={() => {}}
          className="w-full bg-accent-soft text-accent font-semibold py-3 rounded-xl hover:bg-accent/20 transition-colors"
        >
          Browse All Games →
        </button>
      </div>
    </div>
  );
}
