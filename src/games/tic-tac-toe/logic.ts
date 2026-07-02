// Pure Tic-Tac-Toe rules and AI. No React or rendering concerns —
// unit-testable in isolation.

export type Cell = 'X' | 'O' | null;
export type Player = 'X' | 'O';
export type WinLine = number[] | null;
export type AILevel = 'easy' | 'medium' | 'hard';

export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export function checkWinner(board: Cell[]): { result: Cell | 'draw' | null; line: WinLine } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { result: board[a], line };
  }
  if (board.every(c => c !== null)) return { result: 'draw', line: null };
  return { result: null, line: null };
}

function emptyCells(board: Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) out.push(i);
  return out;
}

function other(p: Player): Player {
  return p === 'X' ? 'O' : 'X';
}

/** Cell that completes a line for `player` right now, or -1. */
function findCompleting(board: Cell[], player: Player): number {
  for (const [a, b, c] of WIN_LINES) {
    const line = [board[a], board[b], board[c]];
    if (line.filter(x => x === player).length === 2 && line.includes(null)) {
      return [a, b, c][line.indexOf(null)];
    }
  }
  return -1;
}

// Full-depth minimax. The game tree is tiny (< 9! nodes), so hard plays
// perfectly — the best a human can achieve against it is a draw.
function minimax(board: Cell[], me: Player, turn: Player, depth: number): number {
  const { result } = checkWinner(board);
  if (result === me) return 10 - depth;        // faster wins score higher
  if (result === 'draw') return 0;
  if (result !== null) return depth - 10;      // slower losses score higher

  const scores = emptyCells(board).map(i => {
    board[i] = turn;
    const s = minimax(board, me, other(turn), depth + 1);
    board[i] = null;
    return s;
  });
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

function perfectMove(board: Cell[], ai: Player): number {
  const empty = emptyCells(board);
  let best = empty[0];
  let bestScore = -Infinity;
  for (const i of empty) {
    board[i] = ai;
    const s = minimax(board, ai, other(ai), 1);
    board[i] = null;
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

/**
 * Choose a cell for `ai`.
 *  - easy: half the time fully random; otherwise takes wins/blocks
 *  - medium: win > block > center > corner heuristic (the old "hard" —
 *    solid but fork-able)
 *  - hard: perfect play via minimax
 */
export function bestMove(board: Cell[], ai: Player, difficulty: AILevel): number {
  const empty = emptyCells(board);
  if (empty.length === 0) return -1;
  const human = other(ai);

  if (difficulty === 'hard') return perfectMove([...board], ai);

  const win = findCompleting(board, ai);
  const block = findCompleting(board, human);

  if (difficulty === 'easy') {
    if (Math.random() < 0.5) return empty[Math.floor(Math.random() * empty.length)];
    if (win >= 0) return win;
    if (block >= 0 && Math.random() < 0.6) return block;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // medium
  if (win >= 0) return win;
  if (block >= 0) return block;
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter(i => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}
