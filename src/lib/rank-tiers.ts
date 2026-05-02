export interface RankTier {
  min: number;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  barColor: string;
  next: number | null;
}

export const RANK_TIERS: RankTier[] = [
  { min: 300, label: 'Diamond', emoji: '💎', color: 'text-cyan-300',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',  glow: 'shadow-[0_0_32px_rgba(34,211,238,0.25)]',  barColor: 'bg-cyan-300',   next: null },
  { min: 150, label: 'Gold',    emoji: '🥇', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30',glow: 'shadow-[0_0_32px_rgba(253,224,71,0.25)]',  barColor: 'bg-yellow-400', next: 300  },
  { min: 50,  label: 'Silver',  emoji: '🥈', color: 'text-slate-300',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30', glow: 'shadow-[0_0_32px_rgba(148,163,184,0.2)]',  barColor: 'bg-slate-300',  next: 150  },
  { min: 10,  label: 'Bronze',  emoji: '🥉', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/30',glow: 'shadow-[0_0_32px_rgba(253,186,116,0.2)]',  barColor: 'bg-orange-400', next: 50   },
  { min: 0,   label: 'Starter', emoji: '🌱', color: 'text-emerald-400',bg: 'bg-emerald-500/15',border: 'border-emerald-500/30',glow: 'shadow-[0_0_24px_rgba(52,211,153,0.15)]', barColor: 'bg-emerald-400',next: 10   },
];

export function getRankTier(stars: number): RankTier {
  return RANK_TIERS.find(t => stars >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1];
}
