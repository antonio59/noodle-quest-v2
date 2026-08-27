/**
 * Lightweight server-side move checks for online board games.
 * Verifies claimed wins match the submitted board shape/rules.
 */

type Seat = number;

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

/** Connect Four: 6×7 board of null | 'red' | 'yellow'. */
export function validateConnectFour(
  boardState: unknown,
  winner: unknown,
  seat: Seat,
): string | null {
  if (!boardState || typeof boardState !== "object") return "Missing board state.";
  const board = (boardState as { board?: unknown }).board;
  if (!Array.isArray(board) || board.length !== 6) return "Invalid board.";
  for (const row of board) {
    if (!Array.isArray(row) || row.length !== 7) return "Invalid board.";
    for (const cell of row) {
      if (cell !== null && cell !== "red" && cell !== "yellow") return "Invalid cell.";
    }
  }
  if (winner === undefined) return null;
  if (winner === 0) return null;
  if (winner !== seat) return "Winner must be the mover.";
  const color = seat === 1 ? "red" : "yellow";
  if (!hasConnectFourWin(board as (string | null)[][], color)) {
    return "Board does not show a win.";
  }
  return null;
}

function hasConnectFourWin(board: (string | null)[][], color: string): boolean {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] !== color) continue;
      for (const [dr, dc] of dirs) {
        let n = 1;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || board[rr][cc] !== color) break;
          n++;
        }
        if (n >= 4) return true;
      }
    }
  }
  return false;
}

/** Score Four: flat 64-cell board of 0|1|2. */
export function validateScoreFour(
  boardState: unknown,
  winner: unknown,
  seat: Seat,
): string | null {
  if (!boardState || typeof boardState !== "object") return "Missing board state.";
  const board = (boardState as { board?: unknown }).board;
  if (!Array.isArray(board) || board.length !== 64) return "Invalid board.";
  for (const cell of board) {
    if (cell !== 0 && cell !== 1 && cell !== 2) return "Invalid cell.";
  }
  if (winner === undefined) return null;
  if (winner === 0) return null;
  if (winner !== seat) return "Winner must be the mover.";
  if (!hasScoreFourWin(board as number[], seat as 1 | 2)) {
    return "Board does not show a win.";
  }
  return null;
}

function hasScoreFourWin(b: number[], player: 1 | 2): boolean {
  const N = 4;
  const idx = (x: number, y: number, z: number) => x + z * N + y * N * N;
  const dirs = [
    [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1], [0, 1, 1], [0, 1, -1],
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
  ];
  for (const [dx, dy, dz] of dirs) {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        for (let z = 0; z < N; z++) {
          const ex = x + dx * 3;
          const ey = y + dy * 3;
          const ez = z + dz * 3;
          if (ex < 0 || ex >= N || ey < 0 || ey >= N || ez < 0 || ez >= N) continue;
          if ([0, 1, 2, 3].every(i => b[idx(x + dx * i, y + dy * i, z + dz * i)] === player)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/** Tic-tac-toe: flat length-9 board of null | 'X' | 'O'. */
export function validateTicTacToe(
  boardState: unknown,
  winner: unknown,
  seat: Seat,
): string | null {
  if (!boardState || typeof boardState !== "object") return "Missing board state.";
  const board = (boardState as { board?: unknown }).board;
  if (!Array.isArray(board) || board.length !== 9) return "Invalid board.";
  for (const cell of board) {
    if (cell !== null && cell !== "X" && cell !== "O") return "Invalid cell.";
  }
  if (winner === undefined) return null;
  if (winner === 0) return null;
  if (winner !== seat) return "Winner must be the mover.";
  const mark = seat === 1 ? "X" : "O";
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const cells = board as (string | null)[];
  const won = lines.some(line => line.every(i => cells[i] === mark));
  if (!won) return "Board does not show a win.";
  return null;
}

export function validateMoveForGame(
  gameId: string,
  boardState: unknown,
  winner: unknown,
  seat: Seat,
): string | null {
  if (winner !== undefined && !isInt(winner)) return "Invalid winner.";
  switch (gameId) {
    case "connect-four":
      return validateConnectFour(boardState, winner, seat);
    case "score-four":
      return validateScoreFour(boardState, winner, seat);
    case "tic-tac-toe":
      return validateTicTacToe(boardState, winner, seat);
    default:
      return null;
  }
}
