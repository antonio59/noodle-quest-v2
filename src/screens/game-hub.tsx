import { useState, useEffect, useCallback } from 'react';
import { getAllGames } from '@/lib/game-registry';
import { GAME_CATEGORIES, type GameDefinition, type GameCategory } from '@/types';
import { Heart, Search, Play, Pause, Brain, Zap, Target } from 'lucide-react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { TRACKS } from '@/tracks/track-list';
import { useAuth } from '@/contexts/useAuth';
import { Breathe } from '@/screens/breathe';

interface GameHubProps {
  onPlay: (game: GameDefinition, id: string, stage: number) => void;
}

const TABS = [
  { id: 'all', label: '🎮 All Games', emoji: '🎮' },
  { id: 'breathe', label: '🫧 Breathe', emoji: '🫧' },
  { id: 'tracks', label: '🎵 Tracks', emoji: '🎵' },
];

const TAB_BENEFITS: Record<string, { title: string; desc: string; icon: typeof Brain }> = {
  all: {
    title: 'All Games',
    desc: '40+ games to train focus, memory, problem-solving, and more. Board games included!',
    icon: Brain,
  },
  breathe: {
    title: 'Breathe & Relax',
    desc: 'Simple breathing exercises to help you calm down, focus, and feel better. Great before bed or when stressed!',
    icon: Zap,
  },
  tracks: {
    title: 'Focus Tracks',
    desc: 'Lo-fi beats and calming sounds to help you concentrate while playing or studying.',
    icon: Target,
  },
};

export function GameHub({ onPlay }: GameHubProps) {
  const { player } = useAuth();
  const [tab, setTab] = useState('all');
  const audio = useAudioEngine();
  const [category, setCategory] = useState<GameCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('nq_favorites') || '[]'));
    } catch { return new Set(); }
  });
  const [playedGames, setPlayedGames] = useState<Set<string>>(new Set());

  const allGames = getAllGames().sort((a, b) => a.name.localeCompare(b.name));
  const filteredGames = allGames.filter(g => {
    if (category !== 'all' && g.category !== category) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const favGames = allGames.filter(g => favorites.has(g.id));

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('nq_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  // Fetch played games
  const fetchPlayed = useCallback(async () => {
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
      if (data.value?.playedGameIds) {
        setPlayedGames(new Set(data.value.playedGameIds));
      }
    } catch { /* offline */ }
  }, [player]);

  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(fetchPlayed, 0);
    return () => clearTimeout(timer);
  }, [player, fetchPlayed]);

  const benefit = TAB_BENEFITS[tab];
  const BenefitIcon = benefit?.icon || Brain;

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              tab === t.id
                ? 'text-accent border-accent'
                : 'text-text-muted border-transparent hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Benefit description */}
      {benefit && (
        <div className="bg-accent-soft/30 border-b border-accent/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <BenefitIcon size={20} className="text-accent flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-text">{benefit.title}</div>
            <div className="text-xs text-text-muted">{benefit.desc}</div>
          </div>
        </div>
      )}

      {tab === 'all' && (
        <div className="flex-1 overflow-y-auto">
          {/* Search */}
          <div className="p-4 pb-0">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-card rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent"
              />
            </div>
          </div>

          {/* Favorites */}
          {favGames.length > 0 && !search && (
            <div className="p-4 pb-0">
              <h3 className="text-sm font-bold text-text-dim mb-3 flex items-center gap-1.5">
                <Heart size={14} className="text-danger" fill="currentColor" /> Favorites
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {favGames.map(g => (
                  <button
                    key={g.id}
                    onClick={() => onPlay(g, g.id, 1)}
                    className="bg-card hover:bg-card-hover rounded-xl p-3 text-center transition-all active:scale-95"
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="text-xs font-semibold truncate">{g.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter — includes board */}
          <div className="p-4 pb-0">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              <button
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  category === 'all' ? 'bg-accent text-bg' : 'bg-card text-text-muted hover:text-text'
                }`}
              >
                All ({allGames.length})
              </button>
              <button
                onClick={() => setCategory('board' as GameCategory)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  category === 'board' ? 'bg-accent text-bg' : 'bg-card text-text-muted hover:text-text'
                }`}
              >
                🎲 Board
              </button>
              {GAME_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    category === c.id ? 'bg-accent text-bg' : 'bg-card text-text-muted hover:text-text'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Game Grid */}
          <div className="mobile-p-4 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredGames.map(g => (
              <div key={g.id} className="bg-card rounded-xl p-4 relative group">
                <button
                  onClick={() => toggleFav(g.id)}
                  className="absolute top-2 right-2 p-1.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Heart
                    size={16}
                    className={favorites.has(g.id) ? 'text-danger' : 'text-text-muted'}
                    fill={favorites.has(g.id) ? 'currentColor' : 'none'}
                  />
                </button>
                <button onClick={() => onPlay(g, g.id, 1)} className="text-left w-full">
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <div className="font-semibold text-sm mb-1">{g.name}</div>
                  <div className="text-text-muted text-xs line-clamp-2">{g.description}</div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-text-muted text-xs">{g.stages} stages</span>
                    {g.category === 'board' && <span className="text-primary text-xs">🎲 Solo</span>}
                    {playedGames.has(g.id) && <span className="text-success text-xs">✓</span>}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'breathe' && (
        <div className="flex-1 overflow-hidden">
          <Breathe />
        </div>
      )}

      {tab === 'tracks' && (
        <TracksPanel audio={audio} />
      )}
    </div>
  );
}

function TracksPanel({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const [filter, setFilter] = useState<string>('all');
  const types = ['all', 'lofi', 'focus', 'nature', 'meditation'];
  const filtered = TRACKS.filter(t => filter === 'all' || t.type === filter);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-0">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === t ? 'bg-accent text-bg' : 'bg-card text-text-muted hover:text-text'
              }`}
            >
              {t === 'all' ? 'All' : t === 'lofi' ? '☕ Lo-Fi' : t === 'focus' ? '🧠 Focus' : t === 'nature' ? '🌿 Nature' : '🧘 Meditation'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {filtered.map(track => {
          const isPlaying = audio.isPlaying && audio.currentTrack === track.id;
          return (
            <button
              key={track.id}
              onClick={() => audio.toggle(track.id, { type: track.type, bpm: track.bpm })}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-95 text-left ${
                isPlaying ? 'bg-accent/20 ring-1 ring-accent' : 'bg-card hover:bg-card-hover'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                isPlaying ? 'bg-accent/30' : 'bg-card-hover'
              }`}>
                {track.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{track.name}</div>
                <div className="text-text-muted text-xs">{track.description}</div>
                <div className="text-accent text-xs mt-1">💡 {track.bestFor}</div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isPlaying ? 'bg-accent text-bg' : 'bg-card-hover text-text-muted'
              }`}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </div>
            </button>
          );
        })}
      </div>

      {audio.isPlaying && (
        <div className="sticky bottom-0 p-3 bg-surface/80 backdrop-blur border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="text-xl animate-[celebrate_2s_ease_infinite]">🎵</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-accent">Now Playing</div>
              <div className="text-xs text-text-muted">
                {TRACKS.find(t => t.id === audio.currentTrack)?.name}
              </div>
            </div>
            <button
              onClick={audio.stop}
              className="bg-card text-text px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-card-hover"
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
