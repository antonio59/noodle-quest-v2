import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllGames } from '@/lib/game-registry';
import { GAME_CATEGORIES, type GameCategory } from '@/types';
import { Heart, Search, Play, Pause, Users } from 'lucide-react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { TRACKS } from '@/tracks/track-list';

const TABS = [
  { id: 'brain', label: '🧠 Brain', emoji: '🧠' },
  { id: 'board', label: '🎲 Board', emoji: '🎲' },
  { id: 'breathe', label: '🌬️ Breathe', emoji: '🌬️' },
  { id: 'tracks', label: '🎵 Tracks', emoji: '🎵' },
];

export function GameHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'brain';
  const [tab, setTab] = useState(initialTab);
  const audio = useAudioEngine();
  const [category, setCategory] = useState<GameCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('nq_favorites') || '[]'));
    } catch { return new Set(); }
  });

  const allGames = getAllGames();
  const brainGames = allGames.filter(g => g.category !== 'board' && g.category !== 'breathe');
  const filteredGames = brainGames.filter(g => {
    if (category !== 'all' && g.category !== category) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const favGames = brainGames.filter(g => favorites.has(g.id));

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSearchParams(newTab === 'brain' ? {} : { tab: newTab });
  };

  const navigateToGame = (gameId: string, stage: number = 1) => {
    navigate(`/play/${gameId}`, { state: { stage, fromTab: tab } });
  };

  const navigateToMultiplayer = (gameId: string) => {
    navigate(`/play/${gameId}`, { state: { stage: 1, fromTab: tab, multiplayer: true } });
  };

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('nq_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-white/5 flex-shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex-1 min-w-[80px] py-3 text-xs sm:text-sm font-semibold text-center transition-colors border-b-2 whitespace-nowrap ${
              tab === t.id
                ? 'text-accent border-accent'
                : 'text-text-muted border-transparent hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'brain' && (
        <div className="flex-1 overflow-y-auto">
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

          {favGames.length > 0 && !search && (
            <div className="p-4 pb-0">
              <h3 className="text-sm font-bold text-text-dim mb-3 flex items-center gap-1.5">
                <Heart size={14} className="text-danger" fill="currentColor" /> Favorites
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {favGames.map(g => (
                  <button
                    key={g.id}
                    onClick={() => navigateToGame(g.id)}
                    className="bg-card hover:bg-card-hover rounded-xl p-3 text-center transition-all active:scale-95"
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="text-xs font-semibold truncate">{g.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 pb-0">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              <button
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  category === 'all' ? 'bg-accent text-bg' : 'bg-card text-text-muted hover:text-text'
                }`}
              >
                All
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

          <div className="p-4 grid grid-cols-2 gap-3">
            {filteredGames.map(g => (
              <div key={g.id} className="bg-card rounded-xl p-4 relative group">
                <button
                  onClick={() => toggleFav(g.id)}
                  className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Heart
                    size={16}
                    className={favorites.has(g.id) ? 'text-danger' : 'text-text-muted'}
                    fill={favorites.has(g.id) ? 'currentColor' : 'none'}
                  />
                </button>
                <button onClick={() => navigateToGame(g.id)} className="text-left w-full">
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <div className="font-semibold text-sm mb-1">{g.name}</div>
                  <div className="text-text-muted text-xs line-clamp-2">{g.description}</div>
                  <div className="text-text-muted text-xs mt-2">{g.stages} stages</div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 grid grid-cols-2 gap-3">
            {allGames.filter(g => g.category === 'board').map(g => (
              <div key={g.id} className="bg-card rounded-xl p-4">
                <button onClick={() => navigateToGame(g.id)} className="text-left w-full">
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <div className="font-semibold text-sm mb-1">{g.name}</div>
                  <div className="text-text-muted text-xs line-clamp-2">{g.description}</div>
                </button>
                <button
                  onClick={() => navigateToMultiplayer(g.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 bg-accent/10 text-accent text-xs font-semibold py-2 rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <Users size={14} /> Play with Friend
                </button>
              </div>
            ))}
            {allGames.filter(g => g.category === 'board').length === 0 && (
              <div className="col-span-2 text-center text-text-muted text-sm py-12">
                <div className="text-5xl mb-4">🎲</div>
                <h3 className="text-lg font-bold mb-2 text-text">Board Games</h3>
                <p>Board games loading...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'breathe' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 grid grid-cols-2 gap-3">
            {allGames.filter(g => g.category === 'breathe').map(g => (
              <button
                key={g.id}
                onClick={() => navigateToGame(g.id)}
                className="bg-card hover:bg-card-hover rounded-xl p-4 text-left transition-all active:scale-95"
              >
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="font-semibold text-sm mb-1">{g.name}</div>
                <div className="text-text-muted text-xs line-clamp-2">{g.description}</div>
                <div className="text-text-muted text-xs mt-2">{g.stages} stages</div>
              </button>
            ))}
          </div>
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
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-95 ${
                isPlaying ? 'bg-accent/20 ring-1 ring-accent' : 'bg-card hover:bg-card-hover'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                isPlaying ? 'bg-accent/30' : 'bg-card-hover'
              }`}>
                {track.emoji}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">{track.name}</div>
                <div className="text-text-muted text-xs">{track.description}</div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
