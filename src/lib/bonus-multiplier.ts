/**
 * Bonus multiplier system: rewards players for trying less-played games.
 * Applied to scores at runtime to encourage variety across the game library.
 */

export interface BonusTier {
  multiplier: number;
  label: string;
  color: string;
}

export function getBonusMultiplier(timesPlayed: number): number {
  if (timesPlayed <= 0) return 3;
  if (timesPlayed <= 2) return 2;
  if (timesPlayed <= 5) return 1.5;
  return 1;
}

export function getBonusTier(timesPlayed: number): BonusTier | null {
  const m = getBonusMultiplier(timesPlayed);
  if (m <= 1) return null;
  if (m >= 3) return { multiplier: 3, label: '3× Bonus', color: 'text-warning' };
  if (m >= 2) return { multiplier: 2, label: '2× Bonus', color: 'text-success' };
  return { multiplier: 1.5, label: '1.5× Bonus', color: 'text-accent' };
}

export function applyBonus(score: number, multiplier: number): number {
  return Math.round(score * multiplier);
}
