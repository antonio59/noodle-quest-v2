/**
 * Endless-stage helper — extrapolates game config beyond the highest
 * pre-defined stage by scaling numeric properties.
 *
 * Usage:
 *   const config = scaleFromLast(stage, CONFIG, {
 *     rounds: 0.1,      // +10% per max-stage interval beyond max
 *     timeLimit: -0.1,  // -10% per interval (gets faster)
 *   }, {
 *     rounds: 50,       // cap at 50
 *     timeLimit: 1000,  // cap at 1000ms
 *   });
 */
export function scaleFromLast<T extends Record<string, unknown>>(
  stage: number,
  configs: Record<number, T>,
  multipliers: Partial<Record<keyof T, number>> = {},
  caps: Partial<Record<keyof T, number>> = {},
): T {
  const keys = Object.keys(configs)
    .map(Number)
    .filter(k => !isNaN(k))
    .sort((a, b) => a - b);

  const max = keys[keys.length - 1];
  if (stage <= max) return configs[stage];

  const base = configs[max];
  const factor = (stage - max) / max; // e.g. stage 11 → 0.1, stage 20 → 1.0

  const result = { ...base } as Record<string, unknown>;

  for (const key of Object.keys(base)) {
    const val = base[key];
    if (typeof val !== 'number') continue;

    const mult = (multipliers as Record<string, number>)[key] ?? 0;
    const cap = (caps as Record<string, number | undefined>)[key];

    let newVal: number;
    if (mult === 0) {
      newVal = val; // unchanged
    } else {
      newVal = val + val * factor * mult;
    }

    if (cap !== undefined) {
      newVal = mult >= 0 ? Math.min(newVal, cap) : Math.max(newVal, cap);
    }

    result[key] = Math.round(newVal);
  }

  return result as T;
}
