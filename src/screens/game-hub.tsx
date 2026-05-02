import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { GAME_CATEGORIES, type GameCategory } from '@/types';
import { Heart, Search, Play, Pause, Users, Brain, Gamepad2, Wind, Music, Trophy, Zap, Star } from 'lucide-react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { TRACKS } from '@/tracks/track-list';
import { computeBonusTiers, getBonusTier } from '@/lib/bonus-multiplier';

const BREATHE_THEMES: Record<string, { from: string; border: string; glow: string; accent: string; iconBg: string }> = {
  'box-breathing':      { from: 'from-violet-600/20 to-violet-900/5',  border: 'border-violet-500/25', glow: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.18)]', accent: 'text-violet-400',  iconBg: 'bg-violet-500/20' },
  'calm-breathing':     { from: 'from-blue-600/20 to-blue-900/5',      border: 'border-blue-500/25',   glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.18)]',  accent: 'text-blue-400',    iconBg: 'bg-blue-500/20' },
  'triangle-breathing': { from: 'from-cyan-600/20 to-cyan-900/5',      border: 'border-cyan-500/25',   glow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.18)]',   accent: 'text-cyan-400',    iconBg: 'bg-cyan-500/20' },
  'coherent-breathing': { from: 'from-emerald-600/20 to-emerald-900/5',border: 'border-emerald-500/25',glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.18)]',  accent: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
};

const TRACK_TYPE_STYLES: Record<string, { bg: string; border: string; iconBg: string; accent: string; pill: string }> = {
  lofi:       { bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   iconBg: 'bg-amber-500/20',   accent: 'text-amber-400',   pill: 'bg-amber-500/15 text-amber-400' },
  focus:      { bg: 'bg-sky-500/8',     border: 'border-sky-500/20',     iconBg: 'bg-sky-500/20',     accent: 'text-sky-400',     pill: 'bg-sky-500/15 text-sky-400' },
  nature:     { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20', accent: 'text-emerald-400', pill: 'bg-emerald-500/15 text-emerald-400' },
  meditation: { bg: 'bg-violet-500/8',  border: 'border-violet-500/20',  iconBg: 'bg-violet-500/20',  accent: 'text-violet-400',  pill: 'bg-violet-500/15 text-violet-400' },
};

const TRACK_TYPE_LABELS: Record<string, string> = {
  lofi: '☕ Lo-Fi', focus: '🧠 Focus', nature: '🌿 Nature', meditation: '🧘 Meditation',
};

const CATEGORY_STYLES: Record<string, { label: string; badge: string; glow: string; playBtn: string }> = {
  focus:       { label: 'Focus',       badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',         glow: 'hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]',   playBtn: 'bg-sky-500 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)]' },
  memory:      { label: 'Memory',      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', glow: 'hover:shadow-[0_0_30px_rgba(167,139,250,0.25)]',  playBtn: 'bg-[#a78bfa] hover:shadow-[0_0_20px_rgba(167,139,250,0.5)]' },
  motor:       { label: 'Motor',       badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.25)]',   playBtn: 'bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]' },
  flexibility: { label: 'Flexibility', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', glow: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.25)]',    playBtn: 'bg-yellow-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]' },
  social:      { label: 'Social',      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',       glow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.25)]',   playBtn: 'bg-pink-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]' },
  sequence:    { label: 'Sequence',    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.25)]', playBtn: 'bg-emerald-500 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)]' },
};

const TABS = [
  {
    id: 'brain',
    label: '🧠 Brain',
    emoji: '🧠',
    tagline: 'Train your mind every day',
    description: 'Over 30 games across 6 cognitive areas. Difficulty adapts as you level up — so it always feels just challenging enough.',
    color: 'text-violet-400',
    pillBg: 'bg-violet-500/15 text-violet-300',
    iconBg: 'bg-violet-500/15',
    benefits: ['Sharp focus', 'Better memory', 'Faster thinking', 'Problem solving', 'Emotional skills', 'Mental agility'],
  },
  {
    id: 'board',
    label: '🎲 Board',
    emoji: '🎲',
    tagline: 'Play solo or invite a friend',
    description: 'Classic board games with adaptive AI — or send a link and play with friends and family in real time. Chess, Ludo, Scrabble, UNO, and more.',
    color: 'text-amber-400',
    pillBg: 'bg-amber-500/15 text-amber-300',
    iconBg: 'bg-amber-500/15',
    benefits: ['Strategic thinking', 'Pattern recognition', 'Patience', 'Multiplayer fun', 'Decision making', 'Healthy competition'],
  },
  {
    id: 'breathe',
    label: '🌬️ Breathe',
    emoji: '🌬️',
    tagline: 'Calm down in under 5 minutes',
    description: 'Four science-backed breathing techniques — guided, timed, and visualised. Reduce stress, lower your heart rate, and clear your head.',
    color: 'text-emerald-400',
    pillBg: 'bg-emerald-500/15 text-emerald-300',
    iconBg: 'bg-emerald-500/15',
    benefits: ['Reduces stress', 'Lowers heart rate', 'Aids sleep', 'Clears the mind', 'Eases anxiety', 'Restores focus'],
  },
  {
    id: 'tracks',
    label: '🎵 Tracks',
    emoji: '🎵',
    tagline: 'Set the mood. Stay in flow.',
    description: '8 ambient tracks for any mental state — lo-fi beats, deep focus tones, rain sounds, and meditation. Keeps playing while you game.',
    color: 'text-sky-400',
    pillBg: 'bg-sky-500/15 text-sky-300',
    iconBg: 'bg-sky-500/15',
    benefits: ['Blocks noise', 'Deep focus', 'Relaxation', 'Creative flow', 'Mindfulness', 'Consistent environment'],
  },
];

export function GameHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'brain';
  const [tab, setTab] = useState(initialTab);
  const audio = useAudioEngine();
  const { player } = useAuth();
  const playerStats = useQuery(
    api.games.getPlayerStats,
    player ? { playerId: player.playerId as any } : 'skip' as any,
  );
  const gameStages = playerStats?.gameStages ?? {};
  const monthlyPlays = useQuery(api.games.getMonthlyPlayCounts, {});
  const bonusTiers = monthlyPlays
    ? computeBonusTiers(monthlyPlays.counts, getAllGames().map(g => g.id))
    : {};
  const statsFor = (gameId: string) => ({
    starsEarned: gameStages[gameId]?.starsEarned ?? 0,
    bonusMultiplier: bonusTiers[gameId] ?? 1,
  });
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

  const currentTab = TABS.find(t => t.id === tab) || TABS[0];

  const CardMeta = ({ gameId, size = 'sm' }: { gameId: string; size?: 'sm' | 'lg' }) => {
    const { starsEarned, bonusMultiplier } = statsFor(gameId);
    const tier = getBonusTier(bonusMultiplier);
    const earned = Math.min(starsEarned, 3);
    const starSize = size === 'lg' ? 18 : 11;
    return (
      <div className="flex items-center justify-between gap-1 mt-2 min-h-[18px]">
        <div className="flex gap-0.5" aria-label={`${earned} of 3 stars earned`}>
          {[1, 2, 3].map(i => (
            <Star
              key={i}
              size={starSize}
              className={i <= earned ? 'text-warning' : 'text-card-hover'}
              fill={i <= earned ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        {tier && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-surface ${tier.color}`}>
            {tier.label}
          </span>
        )}
      </div>
    );
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
                ? 'text-accent border-accent bg-accent/10'
                : 'text-text-muted border-transparent hover:text-text hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab header — tagline, description, benefit chips */}
      <div className="px-4 pt-3 pb-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-start gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${currentTab.color}`}>
              {currentTab.tagline}
            </p>
            <p className="text-text-muted text-xs leading-relaxed line-clamp-2">
              {currentTab.description}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl ${currentTab.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
            {currentTab.emoji}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {currentTab.benefits.map((benefit, i) => (
            <span key={i} className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${currentTab.pillBg}`}>
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
            {filteredGames.map(g => {
              const style = CATEGORY_STYLES[g.category] ?? CATEGORY_STYLES.memory;
              const { bonusMultiplier } = statsFor(g.id);
              const tier = getBonusTier(bonusMultiplier);
              return (
                <div
                  key={g.id}
                  className={`bg-card rounded-3xl p-5 relative group overflow-hidden cursor-pointer flex flex-col items-center text-center border border-white/5 transition-all duration-300 hover:-translate-y-1 ${style.glow}`}
                  onClick={() => navigateToGame(g.id)}
                >
                  {/* Category badge — top left */}
                  <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${style.badge}`}>
                    {style.label}
                  </span>

                  {/* Bonus badge — top right */}
                  {tier ? (
                    <span className="absolute top-3 right-3 bg-warning/20 text-warning px-2.5 py-1 rounded-full text-[10px] font-bold border border-warning/30 animate-pulse">
                      {tier.label}
                    </span>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(g.id); }}
                      className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart
                        size={14}
                        className={favorites.has(g.id) ? 'text-danger' : 'text-text-muted'}
                        fill={favorites.has(g.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}

                  {/* Emoji */}
                  <div className="text-5xl mt-7 mb-3 leading-none group-hover:scale-110 transition-transform duration-300">
                    {g.emoji}
                  </div>

                  {/* Name + description */}
                  <div className="font-bold text-sm mb-1 text-text">{g.name}</div>
                  <div className="text-text-muted text-xs line-clamp-2 mb-2">{g.description}</div>

                  {/* Stars */}
                  <CardMeta gameId={g.id} size="lg" />

                  {/* Hover play overlay */}
                  <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button
                      className={`${style.playBtn} text-white rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-sm translate-y-4 group-hover:translate-y-0 transition-all duration-300`}
                    >
                      <Play size={16} className="fill-current" />
                      Play Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allGames
              .filter(g => g.category === 'board')
              .slice()
              .sort((a, b) => {
                const ap = gameStages[a.id]?.timesPlayed ?? 0;
                const bp = gameStages[b.id]?.timesPlayed ?? 0;
                if (bp !== ap) return bp - ap;
                return a.name.localeCompare(b.name);
              })
              .map(g => {
                const { bonusMultiplier } = statsFor(g.id);
                const bonusTierBadge = getBonusTier(bonusMultiplier);
                const isMulti = (g.minPlayers ?? 1) >= 2;
                return (
                  <div
                    key={g.id}
                    onClick={() => navigateToGame(g.id)}
                    className="bg-card rounded-3xl p-5 flex flex-col items-center text-center border border-white/5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(167,139,250,0.2)] group relative overflow-hidden"
                  >
                    {/* Bonus badge top-right */}
                    {bonusTierBadge && (
                      <span className={`absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning/20 border border-warning/30 ${bonusTierBadge.color} animate-pulse`}>
                        {bonusTierBadge.label}
                      </span>
                    )}

                    {/* Multiplayer indicator top-left */}
                    {isMulti && (
                      <span className="absolute top-3 left-3 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent">
                        2P
                      </span>
                    )}

                    {/* Emoji */}
                    <div className="text-5xl mb-3 leading-none mt-2 group-hover:scale-110 transition-transform duration-300">{g.emoji}</div>

                    {/* Name + description */}
                    <div className="font-bold text-sm mb-1 text-text">{g.name}</div>
                    <div className="text-text-muted text-xs line-clamp-2 mb-3 px-1">{g.description}</div>

                    <CardMeta gameId={g.id} size="lg" />

                    {/* Solo + Friends buttons */}
                    <div className="flex gap-2 mt-3 w-full" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigateToGame(g.id)}
                        className="flex-1 bg-accent text-bg text-xs font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                      >
                        Play
                      </button>
                      {isMulti && (
                        <button
                          onClick={() => navigateToMultiplayer(g.id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-surface border border-white/10 text-text-muted text-xs font-bold py-2.5 rounded-xl hover:bg-card-hover hover:text-accent hover:border-accent/30 transition-all active:scale-95"
                        >
                          <Users size={12} /> Friends
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
          <div className="p-4 space-y-3">
            {allGames.filter(g => g.category === 'breathe').map(g => {
              const th = BREATHE_THEMES[g.id] ?? BREATHE_THEMES['box-breathing'];
              return (
                <div
                  key={g.id}
                  onClick={() => navigateToGame(g.id)}
                  className={`bg-gradient-to-br ${th.from} border ${th.border} rounded-2xl p-5 cursor-pointer transition-all duration-200 active:scale-[0.98] ${th.glow}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${th.iconBg} border ${th.border} flex items-center justify-center text-3xl flex-shrink-0`}>
                      {g.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-base text-text">{g.name}</h3>
                        {g.duration && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border ${th.border} ${th.accent}`}>
                            {g.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs mb-2.5 leading-relaxed">{g.description}</p>
                      {g.bestFor && g.bestFor.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {g.bestFor.slice(0, 3).map((item, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-text-muted px-2 py-0.5 rounded-full border border-white/8">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <CardMeta gameId={g.id} size="sm" />
                    <button
                      onClick={e => { e.stopPropagation(); navigateToGame(g.id); }}
                      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-white/8 ${th.accent} hover:bg-white/15 transition-colors active:scale-95 border ${th.border}`}
                    >
                      <Wind size={13} /> Begin
                    </button>
                  </div>
                </div>
              );
            })}
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

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [audio.currentTrack]);

  const track = TRACKS.find(t => t.id === audio.currentTrack);
  const ts = TRACK_TYPE_STYLES[track?.type ?? 'focus'];

  return (
    <div className={`sticky bottom-0 p-3 bg-surface/90 backdrop-blur-md border-t border-white/8`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${ts.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
          {track?.emoji ?? '🎵'}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold ${ts.accent} flex items-center gap-1.5`}>
            Now playing
            <span className="inline-flex items-end gap-[2px] h-3">
              <span className={`w-[3px] rounded-full animate-[equalizer_0.6s_ease-in-out_infinite] ${ts.iconBg}`} style={{ height: '60%' }} />
              <span className={`w-[3px] rounded-full animate-[equalizer_0.8s_ease-in-out_infinite_0.1s] ${ts.iconBg}`} style={{ height: '100%' }} />
              <span className={`w-[3px] rounded-full animate-[equalizer_0.5s_ease-in-out_infinite_0.2s] ${ts.iconBg}`} style={{ height: '40%' }} />
            </span>
          </div>
          <div className="text-sm font-semibold text-text truncate">{track?.name}</div>
          <div className="text-[10px] text-text-muted">{formatTime(elapsed)} · looping</div>
        </div>
        <button
          onClick={audio.stop}
          className="flex items-center gap-1 bg-card border border-white/10 text-text-muted text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-card-hover hover:text-text transition-colors"
        >
          <Pause size={12} /> Stop
        </button>
      </div>
    </div>
  );
}

function TracksPanel({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const [filter, setFilter] = useState<string>('all');
  const types = ['all', 'lofi', 'focus', 'nature', 'meditation'];
  const filtered = TRACKS.filter(t => filter === 'all' || t.type === filter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {types.map(t => {
            const active = filter === t;
            const ts = t !== 'all' ? TRACK_TYPE_STYLES[t] : null;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? ts ? `${ts.pill} border ${ts.border}` : 'bg-accent text-bg'
                    : 'bg-card text-text-muted hover:text-text border border-transparent'
                }`}
              >
                {t === 'all' ? '✦ All' : TRACK_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pt-1 space-y-2">
          {filtered.map(track => {
            const isPlaying = audio.isPlaying && audio.currentTrack === track.id;
            const ts = TRACK_TYPE_STYLES[track.type];
            return (
              <button
                key={track.id}
                onClick={() => audio.toggle(track.id, { type: track.type, bpm: track.bpm })}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98] border ${
                  isPlaying
                    ? `${ts.bg} ${ts.border} ring-1 ring-inset ${ts.border}`
                    : 'bg-card border-white/5 hover:bg-card-hover hover:border-white/10'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors ${
                  isPlaying ? ts.iconBg : 'bg-card-hover'
                }`}>
                  {track.emoji}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-text truncate">{track.name}</span>
                    {isPlaying && (
                      <span className="inline-flex items-end gap-[2px] h-3 flex-shrink-0">
                        <span className={`w-[3px] rounded-full animate-[equalizer_0.6s_ease-in-out_infinite] ${ts.iconBg}`} style={{ height: '60%' }} />
                        <span className={`w-[3px] rounded-full animate-[equalizer_0.8s_ease-in-out_infinite_0.1s] ${ts.iconBg}`} style={{ height: '100%' }} />
                        <span className={`w-[3px] rounded-full animate-[equalizer_0.5s_ease-in-out_infinite_0.2s] ${ts.iconBg}`} style={{ height: '40%' }} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ts.pill}`}>
                      {TRACK_TYPE_LABELS[track.type]}
                    </span>
                    <span className="text-text-muted text-xs truncate">{track.description}</span>
                  </div>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isPlaying ? `${ts.iconBg} ${ts.accent}` : 'bg-card-hover text-text-muted'
                }`}>
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {audio.isPlaying && <NowPlayingBar audio={audio} />}
    </div>
  );
}
