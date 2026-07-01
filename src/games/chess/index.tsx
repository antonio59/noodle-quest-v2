import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import type { GameProps } from '@/types';
import { bestMove } from './logic';
import { playMove, playCapture } from '@/lib/feedback';

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

// Pawn-scale values for the captured-material display
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

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
    endedRef.current = false;
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
    const moveStr = bestMove(game, difficulty);
    if (!moveStr) return;
    const move = game.move(moveStr);
    if (!move) return;
    if (move.captured) playCapture(); else playMove();
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
    if (move.captured) playCapture(); else playMove();

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
  const FRAME = 18;             // px reserved for coordinate labels
  const svgSize = boardSize + 2 * FRAME;
  const files = 'abcdefgh'.split('');
  const ranks = '87654321'.split('');
  const activeColor = isOnline ? myColor : 'w';
  const isMyTurn = turn === activeColor;
  const isInCheck = game.isCheck();

  // Find king positions for check highlight
  const kingSquares: Record<string, Square | null> = { w: null, b: null };
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (cell?.type === 'k') kingSquares[cell.color] = `${files[c]}${ranks[r]}` as Square;
  }));

  // Material advantage
  const matW = captured.w.reduce((s, p) => s + (PIECE_VALUES[p] || 0), 0);
  const matB = captured.b.reduce((s, p) => s + (PIECE_VALUES[p] || 0), 0);
  const matAdv = matW - matB;

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl">♔</div>
        <h2 className="text-2xl font-bold">Chess</h2>
        <div className="bg-card rounded-xl p-4 max-w-xs w-full space-y-2 text-sm">
          <div className="flex items-center gap-2"><span>⚔️</span><span className="text-text-muted">You play White — make the first move</span></div>
          <div className="flex items-center gap-2"><span>♟</span><span className="text-text-muted">Capture the king to win (Checkmate)</span></div>
          <div className="flex items-center gap-2"><span>🤖</span><span className="text-text-muted capitalize">AI difficulty: <span className="text-accent">{difficulty}</span></span></div>
        </div>
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
          <div className="w-full flex items-center justify-between gap-2 mb-1 px-1">
            {/* AI row */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted font-semibold bg-card px-2 py-0.5 rounded-md">AI ♟</span>
              <span className="text-xs tracking-tight text-text-muted">
                {captured.b.map(p => PIECE_UNICODE['b' + p] || p).join('') || '—'}
              </span>
            </div>
            {/* Turn/check indicator */}
            <div className={`flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-semibold ${
              game.isCheck() && turn === 'w'
                ? 'bg-red-900/40 text-red-400 ring-1 ring-red-500/40'
                : isMyTurn
                  ? 'bg-accent/20 text-accent'
                  : 'bg-card text-text-muted'
            }`}>
              {game.isCheck() && turn === 'w' ? (
                <><span className="animate-pulse">⚠️</span> Check!</>
              ) : isMyTurn ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                  Your turn
                </>
              ) : (
                <><span className="animate-pulse">🤖</span> Thinking…</>
              )}
            </div>
          </div>
        )}

        <svg
          width={svgSize} height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
          role="img"
          aria-label={`Chess board. ${moveHistory.length} moves played. ${turn === (isOnline ? myColor : 'w') ? 'Your turn.' : 'Opponent is thinking.'}`}
        >
          {/* Dark frame background */}
          <rect width={svgSize} height={svgSize} fill="#12102a" rx={6} />

          {/* Board squares */}
          {board.map((row, r) => row.map((cell, c) => {
            const isLight = (r + c) % 2 === 0;
            const sqName = `${files[c]}${ranks[r]}` as Square;
            const isSel = selected === sqName;
            const isLegal = legalMoves.includes(sqName);
            const isLast = lastMove?.from === sqName || lastMove?.to === sqName;
            const isKingInCheck = isInCheck && cell?.type === 'k' && cell.color === turn && sqName === kingSquares[turn];
            const pk = cell ? `${cell.color}${cell.type}` : null;
            const x = FRAME + c * cs;
            const y = FRAME + r * cs;

            let squareFill = isLight ? '#f0d9b5' : '#b58863';
            if (isSel) squareFill = '#6366f1';
            else if (isKingInCheck) squareFill = '#dc2626';
            else if (isLast) squareFill = isLight ? '#cdd26a' : '#aaa23a';

            return (
              <g key={sqName} onClick={() => handleSquareClick(sqName)} style={{ cursor: isMyTurn && !gameOver ? 'pointer' : 'default' }}>
                <rect x={x} y={y} width={cs} height={cs} fill={squareFill} />

                {/* King-in-check pulsing ring */}
                {isKingInCheck && (
                  <circle cx={x + cs / 2} cy={y + cs / 2} r={cs * 0.44} fill="none" stroke="#ff2020" strokeWidth={2.5}>
                    <animate attributeName="opacity" values="0.15;0.9;0.15" dur="0.75s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Legal move indicators */}
                {isLegal && (cell
                  ? <circle cx={x + cs / 2} cy={y + cs / 2} r={cs * 0.45} fill="none" stroke="rgba(99,102,241,0.8)" strokeWidth={3.5} />
                  : <circle cx={x + cs / 2} cy={y + cs / 2} r={cs * 0.155} fill="rgba(0,0,0,0.3)" />
                )}

                {/* Piece — outline layer then face layer */}
                {cell && pk && (
                  <>
                    <text
                      x={x + cs / 2} y={y + cs / 2}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={cs * 0.73}
                      fill={cell.color === 'w' ? '#3b2000' : '#e8d5b7'}
                      stroke={cell.color === 'w' ? '#3b2000' : '#c8b090'}
                      strokeWidth={cell.color === 'w' ? 3 : 2.5}
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{PIECE_UNICODE[pk]}</text>
                    <text
                      x={x + cs / 2} y={y + cs / 2}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={cs * 0.73}
                      fill={cell.color === 'w' ? '#ffffff' : '#1a1a35'}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{PIECE_UNICODE[pk]}</text>
                  </>
                )}
              </g>
            );
          }))}

          {/* Board inner border */}
          <rect x={FRAME} y={FRAME} width={boardSize} height={boardSize}
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1}
            style={{ pointerEvents: 'none' }} />

          {/* File labels a–h (below board) */}
          {files.map((f, i) => (
            <text key={`f${f}`}
              x={FRAME + i * cs + cs / 2} y={FRAME + boardSize + FRAME / 2}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fontWeight="bold" fontFamily="system-ui"
              fill="#9ca3af" style={{ pointerEvents: 'none' }}
            >{f}</text>
          ))}

          {/* Rank labels 8–1 (left of board) */}
          {ranks.map((rank, i) => (
            <text key={`r${rank}`}
              x={FRAME / 2} y={FRAME + i * cs + cs / 2}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fontWeight="bold" fontFamily="system-ui"
              fill="#9ca3af" style={{ pointerEvents: 'none' }}
            >{rank}</text>
          ))}
        </svg>

        <div className="mt-1 w-full flex items-center justify-between gap-2 px-1">
          {/* You row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-accent font-semibold bg-accent/10 px-2 py-0.5 rounded-md ring-1 ring-accent/30">You ♙</span>
            <span className="text-xs tracking-tight text-text-muted">
              {captured.w.map(p => PIECE_UNICODE['b' + p] || p).join('') || '—'}
            </span>
          </div>
          {/* Material advantage */}
          {matAdv !== 0 && (
            <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${matAdv > 0 ? 'text-green-400 bg-green-900/30 ring-1 ring-green-500/30' : 'text-red-400 bg-red-900/30 ring-1 ring-red-500/30'}`}>
              {matAdv > 0 ? `+${matAdv}` : matAdv}
            </span>
          )}
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

