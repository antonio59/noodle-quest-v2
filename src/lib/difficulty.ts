export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * AI difficulty for a given stage. Keyed to the stage being played — not
 * the player's furthest unlock — so replaying an early stage is always a
 * gentle match, and the opponent players see is the one the stage label
 * promises.
 *
 * Bands: 1-3 easy, 4-9 medium, 10+ hard.
 */
export function difficultyForStage(stage: number): Difficulty {
  if (stage <= 3) return 'easy';
  if (stage <= 9) return 'medium';
  return 'hard';
}

/** Display styling for difficulty badges. */
export const DIFFICULTY_STYLE: Record<Difficulty, { label: string; className: string; dot: string }> = {
  easy: { label: 'Easy', className: 'text-success', dot: 'bg-success' },
  medium: { label: 'Medium', className: 'text-warning', dot: 'bg-warning' },
  hard: { label: 'Hard', className: 'text-danger', dot: 'bg-danger' },
};
