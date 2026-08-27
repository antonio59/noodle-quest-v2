/** Pure Dual N-Back scoring helpers (unit-tested). */

export type MatchResult = 'hit' | 'miss' | 'fa';

/** Classify a single channel (position or letter) response. */
export function classifyMatch(isMatch: boolean, pressed: boolean): MatchResult {
  if (isMatch && pressed) return 'hit';
  if (!isMatch && !pressed) return 'hit'; // correct rejection
  if (isMatch && !pressed) return 'miss';
  return 'fa'; // false alarm
}

/** Points for one dual trial (both channels). Floor at 0. */
export function pointsForTrial(pos: MatchResult, letter: MatchResult): number {
  let pts = 0;
  if (pos === 'hit') pts += 8;
  if (letter === 'hit') pts += 8;
  if (pos === 'miss' || pos === 'fa') pts -= 3;
  if (letter === 'miss' || letter === 'fa') pts -= 3;
  return Math.max(0, pts);
}

export function nForStage(stage: number): number {
  if (stage <= 2) return 1;
  if (stage <= 5) return 2;
  return 3;
}

export function starsFromScore(score: number, totalTrials: number): number {
  const pct = score / (totalTrials * 16);
  if (pct >= 0.75) return 3;
  if (pct >= 0.5) return 2;
  return 1;
}
