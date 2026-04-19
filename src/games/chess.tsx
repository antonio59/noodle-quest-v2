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

const PROMOTION_PIECES: { type: 'q' | 'r' | 'b' | 'n'; label: string }[] = [
  { type: 'q', label: 'Queen' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
];

function ChessGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const myColor: 'w' | 'b' = isOnline ? (multiplayerState.playerNumber === 1 ? 'w' : 'b') : 'w';
  const otherColor: 'w' | 'b' = myColor === 'w' ? 'b' : 'w';

  const [game] = useState(() => new Chess());
  const [, setFen] = useState(game.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const difficulty = aiDifficulty || 'medium';
  const [boardSize, setBoardSize] = useState(320);
  const [started, setStarted] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    const update = () => setBoardSize(Math.min(window.innerWidth - 32, 480));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Scroll move history to bottom on new move
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Online sync: hydrate chess.js from the server FEN each tick.
  useEffect(() => {
    if (!isOnline) return;
    const bs = multiplayerState.boardState as { fen?: string; lastFrom?: string; lastTo?: string } | null | undefined;
    if (bs && typeof bs.fen === 'string') {
      try {
        game.load(bs.fen);
      } catch {
        return;
      }
      setFen(game.fen());
      setTurn(game.turn());
      setSelected(null);
      setLegalMoves([]);
      setMoveHistory(game.history());
      if (bs.lastFrom && bs.lastTo) {
        setLastMove({ from: bs.lastFrom as Square, to: bs.lastTo as Square });
      }
      if (game.isGameOver() && !endedRef.current) {
        endedRef.current = true;
        setGameOver(true);
        if (game.isCheckmate()) {
          const loser = game.turn();
          const won = loser !== myColor;
          setGameResult(won ? 'win' : 'lose');
          onEnd({
            score: won ? 200 : 10,
            stars: won ? 3 : 1,
            summary: won ? 'Checkmate — you win!' : 'Checkmate — opponent wins.',
          });
        } else {
          setGameResult('draw');
          onEnd({ score: 50, stars: 2, summary: 'Draw.' });
        }
      }
    }
  }, [isOnline, multiplayerState, game, myColor, onEnd]);

  const handleGameOver = useCallback((source: 'player' | 'ai') => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameOver(true);

    if (game.isCheckmate()) {
      const won = source === 'player';
      setGameResult(won ? 'win' : 'lose');
      onScore(won ? 200 : 10);
      onProgress(1);
      const summary = won
        ? 'Checkmate! You win! 🎉'
        : 'Checkmate — the AI wins. Better luck next time!';
      onMessage(won ? 'Checkmate! You win!' : 'Checkmate — AI wins.');
      onEnd({ score: won ? 200 : 10, stars: won ? 3 : 1, summary });
    } else if (game.isStalemate()) {
      setGameResult('draw');
      onScore(50);
      onProgress(0.5);
      onMessage('Stalemate — draw!');
      onEnd({ score: 50, stars: 2, summary: 'Stalemate — the game is a draw.' });
    } else if (game.isDraw()) {
      setGameResult('draw');
      onScore(50);
      onProgress(0.5);
      onMessage('Draw — insufficient material or repetition.');
      onEnd({ score: 50, stars: 2, summary: 'Draw — by insufficient material or threefold repetition.' });
    }
  }, [game, onScore, onProgress, onMessage, onEnd]);

  const doAiMove = useCallback(() => {
    if (endedRef.current || game.isGameOver()) return;
    const moveStr = getAiMove(game, difficulty);
    if (!moveStr) return;
    const move = game.move(moveStr);
    if (!move) return;
    if (move.captured) {
      setCaptured(p => ({ ...p, b: [...p.b, move.captured!] }));
    }
    setLastMove({ from: move.from as Square, to: move.to as Square });
    setFen(game.fen());
    setMoveHistory(game.history());
    setTurn(game.turn());

    if (game.isGameOver()) {
      handleGameOver('ai');
      return;
    }
    onMessage(game.isCheck() ? 'Check! Your turn' : 'Your turn!');
  }, [game, difficulty, onMessage, handleGameOver]);

  const completeMove = useCallback((from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
    const activeColor = isOnline ? myColor : 'w';
    const move = game.move({ from, to, promotion: promotion || 'q' });
    if (!move) return false;

    if (move.captured) {
      setCaptured(p => ({ ...p, [activeColor]: [...p[activeColor], move.captured!] }));
    }
    setLastMove({ from: move.from as Square, to: move.to as Square });
    setFen(game.fen());
    setMoveHistory(game.history());
    setSelected(null);
    setLegalMoves([]);
    setTurn(game.turn());
    setPendingPromotion(null);
    onScore(5);

    if (isOnline) {
      let serverWinner: number | undefined;
      if (game.isGameOver()) {
        if (game.isCheckmate()) serverWinner = multiplayerState!.playerNumber;
        else serverWinner = 0;
      }
      onMultiplayerMove?.({
        boardState: { fen: game.fen(), lastFrom: move.from, lastTo: move.to },
        winner: serverWinner,
      });
      return true;
    }

    if (game.isGameOver()) {
      handleGameOver('player');
      return true;
    }

    onMessage('AI thinking...');
    schedule(doAiMove, 600);
    return true;
  }, [game, onScore, onMessage, handleGameOver, doAiMove, schedule, isOnline, myColor, multiplayerState, onMultiplayerMove]);

  const handleSquareClick = useCallback((sq: Square) => {
    if (gameOver || endedRef.current) return;
    const activeColor = isOnline ? myColor : 'w';
    if (turn !== activeColor) return;

    if (selected) {
      if (sq === selected) { setSelected(null); setLegalMoves([]); return; }
      const moves = game.moves({ square: selected, verbose: true });
      const target = moves.find(m => m.to === sq);
      if (target) {
        const piece = game.get(selected);
        const isPromotion = piece?.type === 'p' && (
          (piece.color === 'w' && sq[1] === '8') || (piece.color === 'b' && sq[1] === '1')
        );
        if (isPromotion && !isOnline) {
          setPendingPromotion({ from: selected, to: sq });
          return;
        }
        completeMove(selected, sq);
        return;
      }
    }

    const piece = game.get(sq);
    if (piece && piece.color === activeColor) {
      setSelected(sq);
      setLegalMoves(game.moves({ square: sq, verbose: true }).map(m => m.to as Square));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [gameOver, turn, selected, game, isOnline, myColor, completeMove]);

  const board = game.board();
  const cs = boardSize / 8;
  const files = 'abcdefgh'.split('');
  const ranks = '87654321'.split('');
  const activeColor = isOnline ? myColor : 'w';
  const isMyTurn = turn === activeColor;

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl">♔</div>
        <h2 className="text-2xl font-bold">Chess</h2>
        <p className="text-text-muted text-sm text-center max-w-xs">
          Classic strategy game. Checkmate the opponent's king to win!
        </p>
        <button
          onClick={() => setStarted(true)}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 p-2 overflow-hidden">
      {/* Board area */}
      <div className="flex-1 flex flex-col items-center min-w-0 overflow-auto">
        {isOnline ? (
          <div className="flex gap-2 mb-2 text-xs items-center flex-wrap justify-center">
            <span className={`bg-card rounded-lg px-3 py-1.5 font-bold ${isMyTurn ? 'text-accent' : 'text-text-muted'}`}>
              You ({myColor === 'w' ? 'White' : 'Black'})
            </span>
            <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">
              {multiplayerState?.opponentAvatar} {multiplayerState?.opponentName} ({otherColor === 'w' ? 'White' : 'Black'})
            </span>
            <span className={`font-bold ${isMyTurn ? 'text-success animate-pulse' : 'text-text-dim'}`}>
              {isMyTurn ? (game.isCheck() ? 'Check! Your turn' : 'Your turn') : 'Waiting...'}
            </span>
          </div>
        ) : (
          <div className="flex gap-3 mb-2 text-sm items-center">
            <span className="bg-card rounded-lg px-3 py-1 text-text-muted text-xs">
              AI took: {captured.b.map(p => PIECE_UNICODE['b' + p] || p).join('') || '—'}
            </span>
            <span className={`bg-card rounded-lg px-3 py-1 text-xs font-bold ${game.isCheck() && turn === 'w' ? 'text-danger' : 'text-accent'}`}>
              {game.isCheck() ? '⚠️ Check!' : isMyTurn ? 'Your turn (White)' : 'AI thinking...'}
            </span>
          </div>
        )}

        <svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`} className="rounded-lg overflow-hidden shadow-lg flex-shrink-0">
          {board.map((row, r) => row.map((cell, c) => {
            const isLight = (r + c) % 2 === 0;
            const sqName = `${files[c]}${ranks[r]}` as Square;
            const isSel = selected === sqName;
            const isLegal = legalMoves.includes(sqName);
            const isLast = lastMove?.from === sqName || lastMove?.to === sqName;
            const pk = cell ? `${cell.color}${cell.type}` : null;
            return (
              <g key={sqName} onClick={() => handleSquareClick(sqName)} style={{ cursor: isMyTurn && !gameOver ? 'pointer' : 'default' }}>
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
      </div>

      {/* Move history sidebar */}
      <div className="lg:w-52 flex-shrink-0 bg-card rounded-xl p-3 overflow-hidden flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1">
          <span>📜</span> Moves
        </h3>
        <div ref={historyScrollRef} className="flex-1 overflow-y-auto space-y-1 text-sm min-h-0">
          {moveHistory.length === 0 && (
            <p className="text-text-dim text-xs italic">No moves yet. White to move.</p>
          )}
          {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
            const white = moveHistory[i * 2];
            const black = moveHistory[i * 2 + 1];
            const isLast = i * 2 + (black ? 1 : 0) === moveHistory.length - 1;
            return (
              <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded ${isLast ? 'bg-accent-soft/50' : ''}`}>
                <span className="text-text-muted text-xs w-5">{i + 1}.</span>
                <span className="flex-1 font-mono text-xs">{white}</span>
                {black && <span className="flex-1 font-mono text-xs">{black}</span>}
              </div>
            );
          })}
        </div>
        {gameOver && gameResult && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className={`text-center text-sm font-bold ${
              gameResult === 'win' ? 'text-success' : gameResult === 'lose' ? 'text-danger' : 'text-warning'
            }`}>
              {gameResult === 'win' ? '🎉 You Won!' : gameResult === 'lose' ? '💔 AI Won' : '🤝 Draw'}
            </div>
          </div>
        )}
      </div>

      {/* Promotion picker modal */}
      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-6 max-w-xs w-full shadow-2xl border border-white/10 text-center">
            <h3 className="text-lg font-bold mb-1">Pawn Promotion</h3>
            <p className="text-text-muted text-sm mb-4">Choose a piece to promote to:</p>
            <div className="grid grid-cols-2 gap-3">
              {PROMOTION_PIECES.map(({ type, label }) => {
                const pk = `${myColor}${type}`;
                return (
                  <button
                    key={type}
                    onClick={() => completeMove(pendingPromotion.from, pendingPromotion.to, type)}
                    className="flex flex-col items-center gap-1 bg-surface hover:bg-card-hover p-3 rounded-xl transition-colors active:scale-95"
                  >
                    <span className="text-3xl">{PIECE_UNICODE[pk]}</span>
                    <span className="text-xs text-text-muted">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChessGame;
