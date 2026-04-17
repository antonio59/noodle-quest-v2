import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const MAX_LOSSES = 3;

type Piece = { color: 'red' | 'black'; king: boolean };
type Board = (Piece | null)[][];
type Pos = [number, number];

const SIZE = 8;

function initBoard(): Board {
  const board: Board = Array.from({ length: SIZE }, () =>
    Array<Piece | null>(SIZE).fill(null),
  );
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < SIZE; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
  for (let r = 5; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
  return board;
}

function cloneBoard(b: Board): Board {
  return b.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function getDirs(p: Piece): number[][] {
  if (p.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return p.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function getJumps(b: Board, r: number, c: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  const out: Pos[] = [];
  for (const [dr, dc] of getDirs(p)) {
    const mr = r + dr,
      mc = c + dc,
      jr = r + 2 * dr,
      jc = c + 2 * dc;
    if (
      jr >= 0 &&
      jr < SIZE &&
      jc >= 0 &&
      jc < SIZE &&
      b[mr][mc] &&
      b[mr][mc]!.color !== p.color &&
      !b[jr][jc]
    )
      out.push([jr, jc]);
  }
  return out;
}

function getSteps(b: Board, r: number, c: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  const out: Pos[] = [];
  for (const [dr, dc] of getDirs(p)) {
    const nr = r + dr,
      nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !b[nr][nc])
      out.push([nr, nc]);
  }
  return out;
}

function allMoves(
  b: Board,
  color: 'red' | 'black',
): { from: Pos; to: Pos; jump: boolean }[] {
  const jumps: { from: Pos; to: Pos; jump: boolean }[] = [];
  const steps: { from: Pos; to: Pos; jump: boolean }[] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (b[r][c]?.color === color) {
        for (const to of getJumps(b, r, c))
          jumps.push({ from: [r, c], to, jump: true });
        for (const to of getSteps(b, r, c))
          steps.push({ from: [r, c], to, jump: false });
      }
  return jumps.length > 0 ? jumps : steps;
}

function pieceTargets(
  b: Board,
  r: number,
  c: number,
  color: 'red' | 'black',
): Pos[] {
  const p = b[r][c];
  if (!p || p.color !== color) return [];
  const jumps = getJumps(b, r, c);
  if (jumps.length > 0) return jumps;
  if (allMoves(b, color).some(m => m.jump)) return [];
  return getSteps(b, r, c);
}

function applyMove(b: Board, from: Pos, to: Pos): Board {
  const nb = cloneBoard(b);
  const p = { ...nb[from[0]][from[1]]! };
  nb[to[0]][to[1]] = p;
  nb[from[0]][from[1]] = null;
  if (Math.abs(to[0] - from[0]) === 2) {
    nb[(from[0] + to[0]) / 2][(from[1] + to[1]) / 2] = null;
  }
  if (
    (p.color === 'red' && to[0] === 0) ||
    (p.color === 'black' && to[0] === SIZE - 1)
  ) {
    p.king = true;
    nb[to[0]][to[1]] = p;
  }
  return nb;
}

function countPieces(b: Board, color: 'red' | 'black'): number {
  let n = 0;
  for (const row of b) for (const c of row) if (c?.color === color) n++;
  return n;
}

function evaluate(b: Board): number {
  let s = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const p = b[r][c];
      if (!p) continue;
      const v = p.king ? 5 : 1;
      const adv = p.color === 'black' ? r : 7 - r;
      const cen = (3.5 - Math.abs(c - 3.5)) * 0.1;
      const t = v + adv * 0.15 + cen;
      s += p.color === 'black' ? t : -t;
    }
  return s;
}

function minimax(
  b: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const col: 'red' | 'black' = maximizing ? 'black' : 'red';
  const moves = allMoves(b, col);
  if (moves.length === 0) return maximizing ? -100 : 100;
  if (depth === 0) return evaluate(b);
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(b, m.from, m.to);
      const sc = minimax(nb, depth - 1, alpha, beta, false);
      best = Math.max(best, sc);
      alpha = Math.max(alpha, sc);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(b, m.from, m.to);
      const sc = minimax(nb, depth - 1, alpha, beta, true);
      best = Math.min(best, sc);
      beta = Math.min(beta, sc);
      if (alpha >= beta) break;
    }
    return best;
  }
}

function aiPick(
  b: Board,
  diff: 'easy' | 'medium' | 'hard',
): { from: Pos; to: Pos; jump: boolean } | null {
  const moves = allMoves(b, 'black');
  if (moves.length === 0) return null;
  if (diff === 'easy')
    return moves[Math.floor(Math.random() * moves.length)];
  if (diff === 'medium') {
    const jumps = moves.filter(m => m.jump);
    if (jumps.length > 0)
      return jumps[Math.floor(Math.random() * jumps.length)];
    const sorted = [...moves].sort((a, b) => b.to[0] - a.to[0]);
    return sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
  }
  let best = moves[0],
    bestSc = -Infinity;
  for (const m of moves) {
    const nb = applyMove(b, m.from, m.to);
    const sc = minimax(nb, 3, -Infinity, Infinity, false);
    if (sc > bestSc) {
      bestSc = sc;
      best = m;
    }
  }
  return best;
}

function CheckersGame({
  stage,
  onScore,
  onProgress,
  onMessage,
  onEnd,
  aiDifficulty,
}: GameProps) {
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [targets, setTargets] = useState<Pos[]>([]);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [multiJumpPos, setMultiJumpPos] = useState<Pos | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [boardSize, setBoardSize] = useState(320);
  const targetWins = Math.max(1, Math.min(stage + 1, 10));
  const diff = aiDifficulty || 'medium';

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const winsRef = useRef(0);
  const lossesRef = useRef(0);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const u = () => setBoardSize(Math.min(window.innerWidth - 24, 400));
    u();
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);

  const finishMatch = useCallback((outcome: 'win' | 'lose') => {
    if (endedRef.current) return;
    endedRef.current = true;
    const finalWins = winsRef.current;
    const finalLosses = lossesRef.current;
    const stars = outcome === 'win'
      ? (finalLosses === 0 ? 3 : finalLosses === 1 ? 2 : 1)
      : (finalWins > 0 ? 2 : 1);
    const summary = outcome === 'win'
      ? `Won ${finalWins} of ${finalWins + finalLosses} checkers games!`
      : `AI won the match — ${finalWins} wins vs ${finalLosses} losses.`;
    onEnd({ score: finalWins * 150, stars, summary });
  }, [onEnd]);

  const resetBoard = useCallback(() => {
    if (endedRef.current) return;
    setBoard(initBoard());
    setSelected(null);
    setTargets([]);
    setTurn('red');
    setMultiJumpPos(null);
    onMessage('Your turn! (Red pieces)');
  }, [onMessage]);

  const handleEnd = useCallback(
    (b: Board): boolean => {
      if (endedRef.current) return true;
      const bk = countPieces(b, 'black'),
        rd = countPieces(b, 'red');
      if (bk === 0 || allMoves(b, 'black').length === 0) {
        const w = winsRef.current + 1;
        winsRef.current = w;
        setWins(w);
        onScore(150);
        onProgress(w / targetWins);
        if (w >= targetWins) {
          onMessage('You won the match!');
          schedule(() => finishMatch('win'), 1200);
        } else {
          onMessage(`You win! (${w}/${targetWins})`);
          schedule(resetBoard, 1500);
        }
        return true;
      }
      if (rd === 0 || allMoves(b, 'red').length === 0) {
        const l = lossesRef.current + 1;
        lossesRef.current = l;
        setLosses(l);
        if (l >= MAX_LOSSES) {
          onMessage('AI won the match!');
          schedule(() => finishMatch('lose'), 1200);
        } else {
          onMessage(`You lost — ${l}/${MAX_LOSSES} losses.`);
          schedule(resetBoard, 1500);
        }
        return true;
      }
      return false;
    },
    [targetWins, onScore, onProgress, onMessage, resetBoard, schedule, finishMatch],
  );

  const doAiTurn = useCallback(
    (b: Board) => {
      onMessage('AI thinking...');

      const step = (cb: Board, pos: Pos | null, wasJump: boolean) => {
        if (endedRef.current) return;
        if (wasJump && pos) {
          const more = getJumps(cb, pos[0], pos[1]);
          if (more.length > 0) {
            const pick = more[Math.floor(Math.random() * more.length)];
            const nb = applyMove(cb, pos, pick);
            setBoard(nb);
            schedule(() => step(nb, pick, true), 350);
            return;
          }
        }
        if (handleEnd(cb)) return;
        setTurn('red');
        onMessage('Your turn!');
      };

      schedule(() => {
        const m = aiPick(b, diff);
        if (!m) {
          handleEnd(b);
          return;
        }
        const nb = applyMove(b, m.from, m.to);
        setBoard(nb);
        schedule(() => step(nb, m.to, m.jump), 350);
      }, 400);
    },
    [diff, onMessage, handleEnd, schedule],
  );

  const handleClick = useCallback(
    (r: number, c: number) => {
      if (turn !== 'red') return;
      const p = board[r][c];

      if (multiJumpPos) {
        if (targets.some(([tr, tc]) => tr === r && tc === c)) {
          const nb = applyMove(board, multiJumpPos, [r, c]);
          setBoard(nb);
          const more = getJumps(nb, r, c);
          if (more.length > 0) {
            setMultiJumpPos([r, c]);
            setSelected([r, c]);
            setTargets(more);
            onMessage('Continue jumping!');
          } else {
            setSelected(null);
            setTargets([]);
            setMultiJumpPos(null);
            if (!handleEnd(nb)) {
              setTurn('black');
              doAiTurn(nb);
            }
          }
        }
        return;
      }

      if (p?.color === 'red') {
        const t = pieceTargets(board, r, c, 'red');
        setSelected([r, c]);
        setTargets(t);
        return;
      }

      if (selected && targets.some(([tr, tc]) => tr === r && tc === c)) {
        const nb = applyMove(board, selected, [r, c]);
        setBoard(nb);
        const isJump = Math.abs(r - selected[0]) === 2;
        if (isJump) {
          const more = getJumps(nb, r, c);
          if (more.length > 0) {
            setMultiJumpPos([r, c]);
            setSelected([r, c]);
            setTargets(more);
            onMessage('Continue jumping!');
            return;
          }
        }
        setSelected(null);
        setTargets([]);
        if (!handleEnd(nb)) {
          setTurn('black');
          doAiTurn(nb);
        }
      }
    },
    [board, selected, targets, turn, multiJumpPos, onMessage, handleEnd, doAiTurn],
  );

  const cs = boardSize / SIZE;
  const redCount = countPieces(board, 'red');
  const blackCount = countPieces(board, 'black');

  return (
    <div className="h-full flex flex-col items-center p-2">
      <div className="flex gap-3 mb-2 text-sm">
        <span className="bg-card rounded-lg px-3 py-1.5">
          <span className="text-red-500 font-bold">You: {redCount}</span>
        </span>
        <span className="bg-card rounded-lg px-3 py-1.5">
          <span className="text-gray-400 font-bold">AI: {blackCount}</span>
        </span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">
          {wins}/{targetWins}
        </span>
        {losses > 0 && (
          <span className="bg-card rounded-lg px-3 py-1.5 text-danger text-xs">
            L: {losses}/{MAX_LOSSES}
          </span>
        )}
      </div>

      <svg
        width={boardSize}
        height={boardSize}
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        className="rounded-lg overflow-hidden shadow-lg"
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel =
              selected?.[0] === r && selected?.[1] === c;
            const isTarget = targets.some(
              ([tr, tc]) => tr === r && tc === c,
            );
            return (
              <g
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                style={{ cursor: turn === 'red' ? 'pointer' : 'default' }}
              >
                <rect
                  x={c * cs}
                  y={r * cs}
                  width={cs}
                  height={cs}
                  fill={isSel ? '#FBBF24' : dark ? '#5c4033' : '#DEB887'}
                />
                {isTarget && !cell && (
                  <circle
                    cx={c * cs + cs / 2}
                    cy={r * cs + cs / 2}
                    r={cs * 0.15}
                    fill="rgba(34,197,94,0.6)"
                  />
                )}
                {isTarget && cell && (
                  <circle
                    cx={c * cs + cs / 2}
                    cy={r * cs + cs / 2}
                    r={cs * 0.42}
                    fill="none"
                    stroke="rgba(34,197,94,0.7)"
                    strokeWidth={3}
                  />
                )}
                {cell && (
                  <>
                    {/* Selection ring for selected piece */}
                    {isSel && (
                      <circle
                        cx={c * cs + cs / 2}
                        cy={r * cs + cs / 2}
                        r={cs * 0.44}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={3}
                        opacity={0.9}
                      />
                    )}
                    <circle
                      cx={c * cs + cs / 2}
                      cy={r * cs + cs / 2}
                      r={cs * 0.38}
                      fill={cell.color === 'red' ? '#DC2626' : '#1F2937'}
                      stroke={cell.color === 'red' ? '#991B1B' : '#111827'}
                      strokeWidth={2}
                    />
                    <circle
                      cx={c * cs + cs / 2}
                      cy={r * cs + cs / 2}
                      r={cs * 0.28}
                      fill={
                        cell.color === 'red'
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(255,255,255,0.08)'
                      }
                    />
                    {cell.king && (
                      <>
                        <circle
                          cx={c * cs + cs / 2}
                          cy={r * cs + cs / 2}
                          r={cs * 0.24}
                          fill="none"
                          stroke="#FCD34D"
                          strokeWidth={2}
                        />
                        <text
                          x={c * cs + cs / 2}
                          y={r * cs + cs / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={cs * 0.28}
                          fill="#FCD34D"
                          fontWeight="bold"
                          style={{
                            pointerEvents: 'none',
                            userSelect: 'none',
                          }}
                        >
                          ♛
                        </text>
                      </>
                    )}
                  </>
                )}
              </g>
            );
          }),
        )}
      </svg>

      <div className="mt-2 text-xs text-text-muted text-center">
        {turn === 'red'
          ? multiJumpPos
            ? 'Continue your jump!'
            : 'Your turn — tap a piece then tap a square'
          : 'AI is thinking...'}
      </div>
    </div>
  );
}

export default CheckersGame;
