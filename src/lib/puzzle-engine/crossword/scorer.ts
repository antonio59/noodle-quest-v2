import type { PlacedWord, CrosswordPuzzle } from './types';

export function scorePuzzle(grid: string[][], placed: PlacedWord[], gridSize: number): number {
  if (placed.length === 0) return -Infinity;

  let score = 0;

  // Reward word count
  score += placed.length * 100;

  // Reward crossings
  const usedCells = new Set<string>();
  const crossingCells = new Set<string>();
  for (const p of placed) {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.direction === 'across' ? p.row : p.row + i;
      const c = p.direction === 'across' ? p.col + i : p.col;
      const key = `${r},${c}`;
      if (usedCells.has(key)) {
        crossingCells.add(key);
      } else {
        usedCells.add(key);
      }
    }
  }
  score += crossingCells.size * 80;

  // Reward density
  const density = usedCells.size / (gridSize * gridSize);
  score += density * 400;

  // Penalise extreme aspect ratio
  const rows = new Set(placed.flatMap(p => {
    const arr: number[] = [];
    for (let i = 0; i < p.word.length; i++) arr.push(p.direction === 'across' ? p.row : p.row + i);
    return arr;
  }));
  const cols = new Set(placed.flatMap(p => {
    const arr: number[] = [];
    for (let i = 0; i < p.word.length; i++) arr.push(p.direction === 'across' ? p.col + i : p.col);
    return arr;
  }));
  const aspect = Math.max(rows.size, 1) / Math.max(cols.size, 1);
  if (aspect > 3 || aspect < 1 / 3) score -= 50;

  // Penalise isolated words
  for (const p of placed) {
    let touches = 0;
    for (const q of placed) {
      if (p === q) continue;
      if (touchesOther(p, q)) touches++;
    }
    if (touches === 0) score -= 120;
  }

  return score;
}

function touchesOther(a: PlacedWord, b: PlacedWord): boolean {
  const cellsA = new Set<string>();
  for (let i = 0; i < a.word.length; i++) {
    const r = a.direction === 'across' ? a.row : a.row + i;
    const c = a.direction === 'across' ? a.col + i : a.col;
    cellsA.add(`${r},${c}`);
  }
  for (let i = 0; i < b.word.length; i++) {
    const r = b.direction === 'across' ? b.row : b.row + i;
    const c = b.direction === 'across' ? b.col + i : b.col;
    if (cellsA.has(`${r},${c}`)) return true;
    // Also count orthogonal adjacency as touching
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (cellsA.has(`${r + dr},${c + dc}`)) return true;
    }
  }
  return false;
}
