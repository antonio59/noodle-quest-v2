import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { Star, Zap, Gamepad2, Sparkles, ChevronRight, ArrowRight } from 'lucide-react';
import { computeBonusTiers, getBonusTier } from '@/lib/bonus-multiplier';
import { getRankTier, RANK_TIERS } from '@/lib/rank-tiers';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Home() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const games = getAllGames();

  const stats = useQuery(api.games.getPlayerStats, player?.playerId ? { playerId: player.playerId as any } : 'skip' as any);
  const isLoading = stats === undefined && !!player?.playerId;
  const monthlyPlays = useQuery(api.games.getMonthlyPlayCounts, {});
  const bonusTiers = monthlyPlays ? computeBonusTiers(monthlyPlays.counts, games.map(g => g.id)) : {};

  const gameStages = stats?.gameStages ?? {};
  const totalStars = stats?.totalStars ?? 0;
  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const totalPlays = Object.values(gameStages).reduce((s, g) => s + (g.timesPlayed || 0), 0);

  const tier = getRankTier(totalStars);
  const nextTierStars = tier.next;
  const tierProgress = nextTierStars !== null
    ? Math.min(((totalStars - tier.min) / (nextTierStars - tier.min)) * 100, 100)
    : 100;
  const nextTier = nextTierStars !== null ? RANK_TIERS.find(t => t.min === nextTierStars) : null;

  // Quick Play: played games first (by recency), then unplayed
  const played = games
    .filter(g => (gameStages[g.id]?.timesPlayed ?? 0) > 0)
    .sort((a, b) => (gameStages[b.id]?.timesPlayed ?? 0) - (gameStages[a.id]?.timesPlayed ?? 0));
  const unplayed = games.filter(g => (gameStages[g.id]?.timesPlayed ?? 0) === 0);
  const quickPlay = [...played, ...unplayed].slice(0, 4);

  // Bonus picks — games in this month's global bonus pool
  const bonusPicks = games
    .filter(g => (bonusTiers[g.id] ?? 1) > 1)
    .sort((a, b) => (bonusTiers[b.id] ?? 1) - (bonusTiers[a.id] ?? 1))
    .slice(0, 6);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-5 pb-8">

        {/* ── Greeting header ─────────────────────────────── */}
        <div className={`rounded-2xl border ${tier.border} ${tier.bg} p-4 relative overflow-hidden`}>
          {/* glow blob */}
          <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-25 ${tier.bg}`} />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-text-muted text-xs">{getGreeting()},</p>
              <h1 className="text-xl font-bold text-text truncate mt-0.5">{player?.name}</h1>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border mt-1.5 ${tier.bg} ${tier.border} ${tier.color}`}>
                {tier.emoji} {tier.label}
              </span>
            </div>
            <div className={`w-16 h-16 rounded-2xl ${tier.bg} border ${tier.border} flex items-center justify-center text-4xl flex-shrink-0`}>
              {player?.avatar || '🎮'}
            </div>
          </div>

          {/* Rank progress bar */}
          {nextTier && (
            <div className="relative mt-3.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-text-muted">Progress to {nextTier.emoji} {nextTier.label}</span>
                <span className={`text-[10px] font-bold ${tier.color}`}>{totalStars} / {nextTierStars} ⭐</span>
              </div>
              <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    tier.label === 'Starter' ? 'bg-emerald-400' :
                    tier.label === 'Bronze'  ? 'bg-orange-400' :
                    tier.label === 'Silver'  ? 'bg-slate-300'  : 'bg-yellow-400'
                  }`}
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
            </div>
          )}
          {!nextTier && (
            <p className={`relative text-xs font-bold mt-3 ${tier.color}`}>💎 Maximum rank — Diamond achieved!</p>
          )}
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-2xl p-3.5 border border-white/5 text-center">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center mx-auto mb-1.5">
              <Star size={15} className="text-yellow-400" fill="currentColor" />
            </div>
            <div className="text-xl font-black text-text">{isLoading ? '—' : totalStars}</div>
            <div className="text-[10px] text-text-muted font-medium mt-0.5">Stars</div>
          </div>
          <div className="bg-card rounded-2xl p-3.5 border border-white/5 text-center">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center mx-auto mb-1.5">
              <Gamepad2 size={15} className="text-sky-400" />
            </div>
            <div className="text-xl font-black text-text">{isLoading ? '—' : gamesPlayed}</div>
            <div className="text-[10px] text-text-muted font-medium mt-0.5">Games</div>
          </div>
          <div className="bg-card rounded-2xl p-3.5 border border-white/5 text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-1.5">
              <Zap size={15} className="text-emerald-400" />
            </div>
            <div className="text-xl font-black text-text">{isLoading ? '—' : totalPlays}</div>
            <div className="text-[10px] text-text-muted font-medium mt-0.5">Plays</div>
          </div>
        </div>

        {/* ── Quick Play ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Zap size={16} className="text-accent" /> Quick Play
            </h2>
            <button
              onClick={() => navigate('/games')}
              className="text-xs text-text-muted hover:text-accent flex items-center gap-0.5 transition-colors"
            >
              All games <ChevronRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {quickPlay.map(g => {
              const gs = gameStages[g.id];
              const earned = Math.min(gs?.starsEarned ?? 0, 3);
              const hasPlayed = (gs?.timesPlayed ?? 0) > 0;
              const bonusTier = getBonusTier(bonusTiers[g.id]);

              return (
                <button
                  key={g.id}
                  onClick={() => navigate(`/play/${g.id}`, { state: { stage: 1 } })}
                  className="bg-card hover:bg-card-hover rounded-2xl p-4 text-left transition-all active:scale-[0.97] border border-white/5 hover:border-white/10 group relative overflow-hidden"
                >
                  {/* New badge */}
                  {!hasPlayed && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full border border-accent/30">
                      NEW
                    </span>
                  )}
                  {/* Bonus badge */}
                  {bonusTier && hasPlayed && (
                    <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-surface ${bonusTier.color}`}>
                      {bonusTier.label}
                    </span>
                  )}

                  <div className="text-3xl mb-2.5">{g.emoji}</div>
                  <div className="font-bold text-sm text-text mb-0.5 pr-10 leading-tight">{g.name}</div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(i => (
                        <Star
                          key={i}
                          size={11}
                          className={i <= earned ? 'text-yellow-400' : 'text-white/15'}
                          fill="currentColor"
                        />
                      ))}
                    </div>
                    {hasPlayed ? (
                      <span className="text-[10px] text-text-muted">{gs?.timesPlayed}× played</span>
                    ) : (
                      <span className="text-[10px] text-accent font-semibold">Play →</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bonus Picks ─────────────────────────────────── */}
        {bonusPicks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-yellow-400" />
              <h2 className="text-base font-bold">Bonus Points</h2>
              <span className="text-[10px] bg-yellow-500/15 text-yellow-300 border border-yellow-500/25 font-semibold px-2 py-0.5 rounded-full">
                This month
              </span>
            </div>
            <p className="text-text-muted text-xs mb-3">These games earn extra stars right now — play them before the pool resets.</p>

            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
              {bonusPicks.map(g => {
                const bonusTier = getBonusTier(bonusTiers[g.id]);
                const gs = gameStages[g.id];
                const earned = Math.min(gs?.starsEarned ?? 0, 3);
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/play/${g.id}`, { state: { stage: 1 } })}
                    className="flex-shrink-0 w-28 bg-card hover:bg-card-hover rounded-2xl p-3.5 text-center border border-yellow-500/15 hover:border-yellow-500/30 transition-all active:scale-95"
                  >
                    <div className="text-2xl mb-1.5">{g.emoji}</div>
                    <div className="text-xs font-semibold text-text truncate mb-1">{g.name}</div>
                    <div className="flex gap-0.5 justify-center mb-1.5">
                      {[1, 2, 3].map(i => (
                        <Star key={i} size={9} className={i <= earned ? 'text-yellow-400' : 'text-white/15'} fill="currentColor" />
                      ))}
                    </div>
                    {bonusTier && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 ${bonusTier.color}`}>
                        {bonusTier.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Browse CTA ──────────────────────────────────── */}
        <button
          onClick={() => navigate('/games')}
          className="w-full flex items-center justify-between bg-card hover:bg-card-hover border border-white/5 hover:border-accent/30 rounded-2xl px-5 py-4 transition-all active:scale-[0.98] group"
        >
          <div className="text-left">
            <p className="font-bold text-sm text-text">Browse all {games.length} games</p>
            <p className="text-text-muted text-xs mt-0.5">Brain, board, breathe, and tracks</p>
          </div>
          <ArrowRight size={18} className="text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  );
}
