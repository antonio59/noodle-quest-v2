import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllGames } from '@/lib/game-registry';
import { GAME_CATEGORIES, type GameCategory } from '@/types';
import { Heart, Search, Play, Pause, Users, Brain, Gamepad2, Wind, Music, Trophy, Zap } from 'lucide-react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { TRACKS } from '@/tracks/track-list';

const TABS = [
  { 
    id: 'brain', 
    label: '🧠 Brain', 
    emoji: '🧠',
    description: 'Brain games across 6 categories to train focus, memory, motor skills, flexibility, social awareness, and sequencing.',
    benefits: [
      'Improves concentration and attention span',
      'Strengthens working memory',
      'Enhances problem-solving abilities',
      'Builds cognitive flexibility',
      'Develops social-emotional skills',
      'Boosts processing speed'
    ]
  },
  { 
    id: 'board', 
    label: '🎲 Board', 
    emoji: '🎲',
    description: 'board games to play solo against AI or with friends — Tic-Tac-Toe, Checkers, Chess, Connect Four, Ludo, Snakes & Ladders, Crossword, Word Search, Bingo, UNO, and Scrabble.',
    benefits: [
      'Develops strategic thinking and planning',
      'Improves decision-making under pressure',
      'Builds patience and perseverance',
      'Enhances pattern recognition',
      'Teaches turn-taking and sportsmanship',
      'Provides relaxing mental challenge'
    ]
  },
  { 
    id: 'breathe', 
    label: '🌬️ Breathe', 
    emoji: '🌬️',
    description: '4 scientifically-backed breathing exercises to reduce stress, improve focus, and enhance emotional regulation.',
    benefits: [
      'Lowers heart rate and blood pressure',
      'Reduces anxiety and stress hormones',
      'Improves oxygen flow to the brain',
      'Enhances mindfulness and presence',
      'Supports better sleep quality',
      'Increases energy and mental clarity'
    ]
  },
  { 
    id: 'tracks', 
    label: '🎵 Tracks', 
    emoji: '🎵',
    description: '8 curated audio tracks designed to support different mental states — lo-fi beats, focus music, nature sounds, and meditation tones.',
    benefits: [
      'Blocks distracting background noise',
      'Promotes deep focus and flow state',
      'Creates calming atmosphere for relaxation',
      'Supports creative thinking and brainstorming',
      'Aids in mindfulness and meditation practice',
      'Provides consistent audio environment'
    ]
  },
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

  const navigateToAiDifficulty = (gameId: string, difficulty: 'easy' | 'medium' | 'hard') => {
    navigate(`/play/${gameId}`, { state: { stage: 1, fromTab: tab, aiDifficulty: difficulty } });
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

  const currentTab = TABS.find(t => t.id === tab) || TABS[0];

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

      {/* Tab description and benefits */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2">
          {currentTab.emoji} {currentTab.label}
        </h2>
        <p className="text-text-muted text-xs mb-2 line-clamp-1">
          {tab === 'brain' && `${brainGames.length} `}
          {tab === 'board' && `${allGames.filter(g => g.category === 'board').length} `}
          {tab === 'breathe' && `${allGames.filter(g => g.category === 'breathe').length} `}
          {currentTab.description}
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {currentTab.benefits.map((benefit, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card text-[10px] text-text-muted whitespace-nowrap">
              <span className="text-accent">•</span>
              {benefit}
            </span>
          ))}
        </div>
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
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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
              {GAME_CATEGORIES.filter(c => c.id !== 'board' && c.id !== 'breathe').map(c => (
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

          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredGames.map(g => (
              <div key={g.id} className="bg-card rounded-xl p-4 relative group shadow-sm hover:shadow-md transition-shadow">
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
                  <div className="text-text-muted text-xs mt-2">{g.stages} levels</div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allGames
              .filter(g => g.category === 'board')
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(g => (
              <div
                key={g.id}
                onClick={() => navigateToGame(g.id)}
                className="bg-card hover:bg-card-hover rounded-xl p-4 relative cursor-pointer transition-colors shadow-sm hover:shadow-md"
              >
                <button
                  onClick={e => { e.stopPropagation(); navigateToMultiplayer(g.id); }}
                  className="absolute top-2 right-2 p-2 text-text-muted hover:text-accent transition-colors"
                  title="Play with Friend"
                >
                  <Users size={16} />
                </button>
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="font-semibold text-sm mb-1">{g.name}</div>
                <div className="text-text-muted text-xs line-clamp-2 mb-3">{g.description}</div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => navigateToAiDifficulty(g.id, 'easy')}
                    className="flex-1 bg-surface text-text-muted text-[10px] font-semibold py-1.5 rounded-lg hover:bg-card-hover transition-colors"
                  >
                    Easy
                  </button>
                  <button
                    onClick={() => navigateToAiDifficulty(g.id, 'medium')}
                    className="flex-1 bg-accent/20 text-accent text-[10px] font-semibold py-1.5 rounded-lg hover:bg-accent/30 transition-colors"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => navigateToAiDifficulty(g.id, 'hard')}
                    className="flex-1 bg-danger/20 text-danger text-[10px] font-semibold py-1.5 rounded-lg hover:bg-danger/30 transition-colors"
                  >
                    Hard
                  </button>
                </div>
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
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allGames.filter(g => g.category === 'breathe').map(g => (
              <button
                key={g.id}
                onClick={() => navigateToGame(g.id)}
                className="bg-card hover:bg-card-hover rounded-xl p-4 text-left transition-all active:scale-95 shadow-sm hover:shadow-md"
              >
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="font-semibold text-sm mb-1">{g.name}</div>
                <div className="text-text-muted text-xs line-clamp-2">{g.description}</div>
                <div className="text-text-muted text-xs mt-2">{g.stages} levels</div>
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function NowPlayingBar({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const [elapsed, setElapsed] = useState(0);
  const duration = 180; // 3 minutes per procedural track

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(prev => (prev + 1) % duration);
    }, 1000);
    return () => clearInterval(interval);
  }, [audio.currentTrack]);

  const track = TRACKS.find(t => t.id === audio.currentTrack);
  const pct = (elapsed / duration) * 100;

  return (
    <div className="sticky bottom-0 p-3 bg-surface/80 backdrop-blur border-t border-white/5">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xl animate-[celebrate_2s_ease_infinite]">🎵</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-accent flex items-center gap-2">
            Now Playing
            <span className="inline-flex items-end gap-[2px] h-3">
              <span className="w-[3px] bg-accent rounded-full animate-[equalizer_0.6s_ease-in-out_infinite]" style={{ height: '60%' }} />
              <span className="w-[3px] bg-accent rounded-full animate-[equalizer_0.8s_ease-in-out_infinite_0.1s]" style={{ height: '100%' }} />
              <span className="w-[3px] bg-accent rounded-full animate-[equalizer_0.5s_ease-in-out_infinite_0.2s]" style={{ height: '40%' }} />
            </span>
          </div>
          <div className="text-xs text-text-muted">{track?.name}</div>
        </div>
        <div className="text-xs text-text-muted tabular-nums">
          {formatTime(elapsed)} / {formatTime(duration)}
        </div>
        <button
          onClick={audio.stop}
          className="bg-card text-text px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-card-hover"
        >
          Stop
        </button>
      </div>
      <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all duration-1000 rounded-full" style={{ width: `${pct}%` }} />
      </div>
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
                <div className="font-semibold text-sm flex items-center gap-2">
                  {track.name}
                  {isPlaying && (
                    <span className="inline-flex items-end gap-[2px] h-3">
                      <span className="w-[3px] bg-accent rounded-full animate-[equalizer_0.6s_ease-in-out_infinite]" style={{ height: '60%' }} />
                      <span className="w-[3px] bg-accent rounded-full animate-[equalizer_0.8s_ease-in-out_infinite_0.1s]" style={{ height: '100%' }} />
                      <span className="w-[3px] bg-accent rounded-full animate-[equalizer_0.5s_ease-in-out_infinite_0.2s]" style={{ height: '40%' }} />
                    </span>
                  )}
                </div>
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
        <NowPlayingBar audio={audio} />
      )}
    </div>
  );
}
