export function buildBlankGrid<T>(size: number, fill: T = null as T): T[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => fill));
}

export function cloneGrid<T>(grid: T[][]): T[][] {
  return grid.map(row => [...row]);
}

export function inBounds(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function fillRandomWeighted(
  grid: string[][],
  rng: () => number,
  weights: Record<string, number>
): void {
  const chars = Object.keys(weights);
  const totals = chars.map(ch => weights[ch] ?? 1);
  const sum = totals.reduce((a, b) => a + b, 0);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) {
        grid[r][c] = pickWeighted(rng, chars, totals, sum);
      }
    }
  }
}

function pickWeighted(
  rng: () => number,
  chars: string[],
  totals: number[],
  sum: number
): string {
  let roll = rng() * sum;
  for (let i = 0; i < chars.length; i++) {
    roll -= totals[i];
    if (roll <= 0) return chars[i];
  }
  return chars[chars.length - 1] ?? 'A';
}
