/**
 * Monthly bonus multiplier system.
 *
 * The bonus pool is derived from the last 30 days of global play counts:
 * the 3 least-played games earn 3×, the next 3 earn 2×. Everything else
 * is 1× (no badge). As people play, the pool naturally rotates — no admin
 * action or cron required.
 */

export interface BonusTier {
  multiplier: number;
  label: string;
  color: string;
}

export const BONUS_POOL_3X = 3;
export const BONUS_POOL_2X = 3;

/**
 * Given global play counts and the full game-id list, assign a multiplier
 * to each game. Games not in the bonus pool are omitted (caller treats as 1×).
 */
export function computeBonusTiers(
  playCounts: Readonly<Record<string, number>>,
  allGameIds: readonly string[],
): Record<string, number> {
  // Stable tie-break by gameId so the pool is deterministic across renders.
  const ranked = [...allGameIds].sort((a, b) => {
    const diff = (playCounts[a] ?? 0) - (playCounts[b] ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
  const tiers: Record<string, number> = {};
  for (const id of ranked.slice(0, BONUS_POOL_3X)) tiers[id] = 3;
  for (const id of ranked.slice(BONUS_POOL_3X, BONUS_POOL_3X + BONUS_POOL_2X)) tiers[id] = 2;
  return tiers;
}

export function getBonusTier(multiplier: number | undefined): BonusTier | null {
  if (!multiplier || multiplier <= 1) return null;
  if (multiplier >= 3) return { multiplier: 3, label: '3× Bonus', color: 'text-warning' };
  if (multiplier >= 2) return { multiplier: 2, label: '2× Bonus', color: 'text-success' };
  return null;
}

export function applyBonus(score: number, multiplier: number | undefined): number {
  if (!multiplier || multiplier <= 1) return score;
  return Math.round(score * multiplier);
}
