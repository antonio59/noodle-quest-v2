import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import type { GameProps } from '@/types';

const PIECE_UNICODE: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟︎',
};

const PIECE_COLORS: Record<string, string> = {
  w: '#ffffff',
  b: '#1a1a2e',
};

const PIECE_STROKE: Record<string, string> = {
  w: '#555555',
  b: '#000000',
};

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evaluateBoard(game: Chess): number {
  const board = game.board();
  let score = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell) {
        const val = PIECE_VALUES[cell.type] || 0;
        score += cell.color === 'w' ? val : -val;
      }
    }
  }
  return game.turn() === 'w' ? score : -score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return evaluateBoard(game);
  const moves = game.moves();
  if (moves.length === 0) return game.isCheckmate() ? -1000 : 0;
  let best = -Infinity;
  for (const m of moves) {
    game.move(m);
    const score = -minimax(game, depth - 1, -beta, -alpha);
    game.undo();
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function getAiMove(game: Chess, difficulty: string): string | null {
  const moves = game.moves();
  if (moves.length === 0) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  if (difficulty === 'medium') {
    const captures = moves.filter(m => m.includes('x'));
    const checks = moves.filter(m => m.includes('+'));
    const pool = checks.length > 0 ? checks : captures.length > 0 ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    game.move(m);
    const score = -minimax(game, 2, -Infinity, Infinity);
    game.undo();
    if (score > bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove;
}

const MAX_LOSSES = 3;

function ChessGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const [game] = useState(() => new Chess());
  const [, setFen] = useState(game.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });
  const targetWins = Math.max(1, Math.min(stage, 10));
  const difficulty = aiDifficulty || 'medium';
  const [boardSize, setBoardSize] = useState(320);

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
    const update = () => setBoardSize(Math.min(window.innerWidth - 24, 400));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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
      ? `Won ${finalWins} of ${finalWins + finalLosses} chess games!`
      : `AI won the match — ${finalWins} wins vs ${finalLosses} losses.`;
    onEnd({ score: finalWins * 200, stars, summary });
  }, [onEnd]);

  const resetBoard = useCallback(() => {
    if (endedRef.current) return;
    game.reset();
    setFen(game.fen());
    setSelected(null);
    setLegalMoves([]);
    setLastMove(null);
    setTurn('w');
    setCaptured({ w: [], b: [] });
    onMessage('Your turn! (White)');
  }, [game, onMessage]);

  const doAiMove = useCallback(() => {
    if (endedRef.current || game.isGameOver()) return;
    const moveStr = getAiMove(game, difficulty);
    if (!moveStr) return;
    const move = game.move(moveStr);
    if (!move) return;
    if (move.captured) {
      const capturedType = move.captured;
      setCaptured(p => ({ ...p, b: [...p.b, capturedType] }));
    }
    setLastMove({ from: move.from as Square, to: move.to as Square });
    setFen(game.fen());
    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        const newLosses = lossesRef.current + 1;
        lossesRef.current = newLosses;
        setLosses(newLosses);
        onMessage('Checkmate — AI wins!');
        if (newLosses >= MAX_LOSSES) {
          schedule(() => finishMatch('lose'), 1500);
        } else {
          schedule(resetBoard, 2000);
        }
      } else {
        // draw: neither wins, just reset — doesn't count toward progress
        onMessage('Draw! New game...');
        schedule(resetBoard, 2000);
      }
      return;
    }
    onMessage(game.isCheck() ? 'Check! Your turn' : 'Your turn!');
    setTurn('w');
  }, [game, difficulty, onMessage, resetBoard, schedule, finishMatch]);

  const handleSquareClick = useCallback((sq: Square) => {
    if (turn !== 'w' || game.isGameOver()) return;

    if (selected) {
      if (sq === selected) { setSelected(null); setLegalMoves([]); return; }
      const moves = game.moves({ square: selected, verbose: true });
      const target = moves.find(m => m.to === sq);
      if (target) {
        const move = game.move({ from: selected, to: sq, promotion: 'q' });
        if (move) {
          if (move.captured) {
            const capturedType = move.captured;
            setCaptured(p => ({ ...p, w: [...p.w, capturedType] }));
          }
          setLastMove({ from: move.from as Square, to: move.to as Square });
          setFen(game.fen());
          setSelected(null);
          setLegalMoves([]);

          if (game.isGameOver()) {
            if (game.isCheckmate()) {
              const newWins = winsRef.current + 1;
              winsRef.current = newWins;
              setWins(newWins);
              onScore(200);
              onProgress(newWins / targetWins);
              onMessage('Checkmate! You win!');
              if (newWins >= targetWins) {
                schedule(() => finishMatch('win'), 1500);
              } else {
                schedule(resetBoard, 2000);
              }
              return;
            }
            onMessage('Draw! New game...');
            schedule(resetBoard, 2000);
            return;
          }
          setTurn('b');
          onMessage('AI thinking...');
          schedule(doAiMove, 300);
          return;
        }
      }
    }

    const piece = game.get(sq);
    if (piece && piece.color === 'w') {
      setSelected(sq);
      setLegalMoves(game.moves({ square: sq, verbose: true }).map(m => m.to as Square));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [turn, selected, game, targetWins, onScore, onProgress, onMessage, doAiMove, resetBoard, schedule, finishMatch]);

  const board = game.board();
  const cs = boardSize / 8;
  const files = 'abcdefgh'.split('');
  const ranks = '87654321'.split('');

  return (
    <div className="h-full flex flex-col items-center p-2">
      <div className="flex gap-3 mb-2 text-sm items-center">
        <span className="bg-card rounded-lg px-3 py-1 text-text-muted text-xs">
          AI took: {captured.b.map(p => PIECE_UNICODE['b' + p] || p).join('')}
        </span>
        <span className="bg-card rounded-lg px-3 py-1 text-accent text-xs font-bold">{wins}/{targetWins}</span>
        {losses > 0 && (
          <span className="bg-card rounded-lg px-3 py-1 text-danger text-xs">L: {losses}/{MAX_LOSSES}</span>
        )}
      </div>

      <svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`} className="rounded-lg overflow-hidden shadow-lg">
        {board.map((row, r) => row.map((cell, c) => {
          const isLight = (r + c) % 2 === 0;
          const sqName = `${files[c]}${ranks[r]}` as Square;
          const isSel = selected === sqName;
          const isLegal = legalMoves.includes(sqName);
          const isLast = lastMove?.from === sqName || lastMove?.to === sqName;
          const pk = cell ? `${cell.color}${cell.type}` : null;
          return (
            <g key={sqName} onClick={() => handleSquareClick(sqName)} style={{ cursor: turn === 'w' ? 'pointer' : 'default' }}>
              <rect x={c * cs} y={r * cs} width={cs} height={cs}
                fill={isSel ? '#7b61ff' : isLast ? '#baca2b' : isLight ? '#f0d9b5' : '#b58863'}
                opacity={isSel ? 0.8 : 1} />
              {isLegal && (cell
                ? <circle cx={c * cs + cs / 2} cy={r * cs + cs / 2} r={cs * 0.44} fill="none" stroke="#7b61ff" strokeWidth={3} opacity={0.6} />
                : <circle cx={c * cs + cs / 2} cy={r * cs + cs / 2} r={cs * 0.16} fill="#7b61ff" opacity={0.5} />)}
              {cell && pk && (
                <>
                  <text x={c * cs + cs / 2} y={r * cs + cs / 2} textAnchor="middle" dominantBaseline="central"
                    fontSize={cs * 0.7} fill={PIECE_STROKE[cell.color]} stroke={PIECE_STROKE[cell.color]} strokeWidth={cell.color === 'w' ? 0.5 : 0}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>{PIECE_UNICODE[pk]}</text>
                  <text x={c * cs + cs / 2} y={r * cs + cs / 2} textAnchor="middle" dominantBaseline="central"
                    fontSize={cs * 0.7} fill={PIECE_COLORS[cell.color]}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>{PIECE_UNICODE[pk]}</text>
                </>
              )}
            </g>
          );
        }))}
        {files.map((f, i) => <text key={`f${f}`} x={i * cs + cs - 3} y={boardSize - 3} fontSize={9} fill={(i + 7) % 2 === 0 ? '#b58863' : '#f0d9b5'} textAnchor="end" style={{ pointerEvents: 'none' }}>{f}</text>)}
        {ranks.map((r, i) => <text key={`r${r}`} x={3} y={i * cs + 11} fontSize={9} fill={i % 2 === 0 ? '#f0d9b5' : '#b58863'} style={{ pointerEvents: 'none' }}>{r}</text>)}
      </svg>

      <div className="mt-2 flex gap-3 text-sm items-center">
        <span className="bg-card rounded-lg px-3 py-1 text-text-muted text-xs">
          You took: {captured.w.map(p => PIECE_UNICODE['w' + p] || p).join('') || '—'}
        </span>
      </div>
      <div className="mt-2 text-xs text-text-muted text-center">
        {turn === 'w' ? 'Your turn — tap a piece then tap a square' : 'AI is thinking...'}
      </div>
    </div>
  );
}

export default ChessGame;