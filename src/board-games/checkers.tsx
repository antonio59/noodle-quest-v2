import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';
type CellState = 'empty' | 'red' | 'black';
interface Piece { color: CellState; isKing: boolean }
type Board = (Piece | null)[][];

const BOARD_SIZE = 8;

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = { color: 'black', isKing: false };
        else if (r > 4) board[r][c] = { color: 'red', isKing: false };
      }
    }
  }
  return board;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function getValidMoves(board: Board, row: number, col: number): { row: number; col: number; captures: { row: number; col: number }[] }[] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: { row: number; col: number; captures: { row: number; col: number }[] }[] = [];
  const directions = piece.isKing ? [-1, 1] : piece.color === 'red' ? [-1] : [1];

  for (const dr of directions) {
    for (const dc of [-1, 1]) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (!board[nr][nc]) {
          moves.push({ row: nr, col: nc, captures: [] });
        } else if (board[nr][nc]!.color !== piece.color) {
          const jr = nr + dr;
          const jc = nc + dc;
          if (jr >= 0 && jr < BOARD_SIZE && jc >= 0 && jc < BOARD_SIZE && !board[jr][jc]) {
            moves.push({ row: jr, col: jc, captures: [{ row: nr, col: nc }] });
          }
        }
      }
    }
  }
  return moves;
}

function getAllMoves(board: Board, color: CellState): { row: number; col: number; moves: { row: number; col: number; captures: { row: number; col: number }[] }[] }[] {
  const allMoves: { row: number; col: number; moves: { row: number; col: number; captures: { row: number; col: number }[] }[] }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]?.color === color) {
        const moves = getValidMoves(board, r, c);
        if (moves.length > 0) allMoves.push({ row: r, col: c, moves });
      }
    }
  }
  return allMoves;
}

function countPieces(board: Board, color: CellState): number {
  let count = 0;
  for (const row of board) for (const cell of row) if (cell?.color === color) count++;
  return count;
}

function evaluateBoard(board: Board, aiColor: CellState): number {
  let score = 0;
  const _playerColor = aiColor === 'red' ? 'black' : 'red';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = piece.isKing ? 5 : 1;
      const advancement = piece.color === 'red' ? (7 - r) : r;
      if (piece.color === aiColor) {
        score += val + advancement * 0.1;
        if (piece.isKing) score += 2;
      } else {
        score -= val + advancement * 0.1;
        if (piece.isKing) score -= 2;
      }
    }
  }
  return score;
}

function minimax(board: Board, depth: number, isMaximizing: boolean, aiColor: CellState, alpha: number, beta: number): number {
  const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');
  const allMoves = getAllMoves(board, currentColor);

  if (depth === 0 || allMoves.length === 0) {
    return evaluateBoard(board, aiColor);
  }

  const mustCapture = allMoves.some(pm => pm.moves.some(m => m.captures.length > 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const pm of allMoves) {
      for (const move of pm.moves) {
        if (mustCapture && move.captures.length === 0) continue;
        const newBoard = cloneBoard(board);
        newBoard[move.row][move.col] = newBoard[pm.row][pm.col];
        newBoard[pm.row][pm.col] = null;
        for (const cap of move.captures) newBoard[cap.row][cap.col] = null;
        if (!newBoard[move.row][move.col]!.isKing) {
          if ((currentColor === 'red' && move.row === 0) || (currentColor === 'black' && move.row === 7)) {
            newBoard[move.row][move.col]!.isKing = true;
          }
        }
        const evalScore = minimax(newBoard, depth - 1, false, aiColor, alpha, beta);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const pm of allMoves) {
      for (const move of pm.moves) {
        if (mustCapture && move.captures.length === 0) continue;
        const newBoard = cloneBoard(board);
        newBoard[move.row][move.col] = newBoard[pm.row][pm.col];
        newBoard[pm.row][pm.col] = null;
        for (const cap of move.captures) newBoard[cap.row][cap.col] = null;
        if (!newBoard[move.row][move.col]!.isKing) {
          if ((currentColor === 'red' && move.row === 0) || (currentColor === 'black' && move.row === 7)) {
            newBoard[move.row][move.col]!.isKing = true;
          }
        }
        const evalScore = minimax(newBoard, depth - 1, true, aiColor, alpha, beta);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
}

function getAIMove(board: Board, stage: number): { fromRow: number; fromCol: number; toRow: number; toCol: number } | null {
  const allMoves = getAllMoves(board, 'black');
  if (allMoves.length === 0) return null;

  const mustCapture = allMoves.some(pm => pm.moves.some(m => m.captures.length > 0));

  if (stage <= 3) {
    const flat: { fromRow: number; fromCol: number; toRow: number; toCol: number }[] = [];
    for (const pm of allMoves) {
      for (const m of pm.moves) {
        if (!mustCapture || m.captures.length > 0 || stage <= 2) {
          flat.push({ fromRow: pm.row, fromCol: pm.col, toRow: m.row, toCol: m.col });
        }
      }
    }
    if (flat.length === 0) {
      for (const pm of allMoves) {
        for (const m of pm.moves) {
          flat.push({ fromRow: pm.row, fromCol: pm.col, toRow: m.row, toCol: m.col });
        }
      }
    }
    return flat[Math.floor(Math.random() * flat.length)];
  }

  const depth = stage <= 5 ? 1 : stage <= 7 ? 2 : 3;
  let bestMove: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null = null;
  let bestScore = -Infinity;

  for (const pm of allMoves) {
    for (const move of pm.moves) {
      if (mustCapture && move.captures.length === 0) continue;
      const newBoard = cloneBoard(board);
      newBoard[move.row][move.col] = newBoard[pm.row][pm.col];
      newBoard[pm.row][pm.col] = null;
      for (const cap of move.captures) newBoard[cap.row][cap.col] = null;
      if (!newBoard[move.row][move.col]!.isKing) {
        if (move.row === 7) newBoard[move.row][move.col]!.isKing = true;
      }
      const score = minimax(newBoard, depth - 1, false, 'black', -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { fromRow: pm.row, fromCol: pm.col, toRow: move.row, toCol: move.col };
      }
    }
  }

  if (!bestMove) {
    const pm = allMoves[0];
    const m = pm.moves[0];
    bestMove = { fromRow: pm.row, fromCol: pm.col, toRow: m.row, toCol: m.col };
  }

  return bestMove;
}

function CheckersGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number; captures: { row: number; col: number }[] }[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [lastMove, setLastMove] = useState<string>('');
  const boardRef = useRef<Board>(createInitialBoard());
  const isPlayerTurnRef = useRef(true);
  const gameActiveRef = useRef(false);

  const startGame = useCallback(() => {
    const newBoard = createInitialBoard();
    setBoard(newBoard);
    boardRef.current = newBoard;
    setSelectedCell(null);
    setValidMoves([]);
    setIsPlayerTurn(true);
    isPlayerTurnRef.current = true;
    setMessage('Your turn! Select a red piece.');
    setScore(0);
    setLastMove('');
    gameActiveRef.current = true;
    setPhase('playing');
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameActiveRef.current || !isPlayerTurnRef.current) return;

    const piece = boardRef.current[row][col];

    if (selectedCell) {
      const move = validMoves.find(m => m.row === row && m.col === col);
      if (move) {
        const newBoard = cloneBoard(boardRef.current);
        const movingPiece = { ...newBoard[selectedCell.row][selectedCell.col]! };
        newBoard[row][col] = movingPiece;
        newBoard[selectedCell.row][selectedCell.col] = null;

        for (const cap of move.captures) {
          newBoard[cap.row][cap.col] = null;
        }

        if (!movingPiece.isKing && row === 0) {
          movingPiece.isKing = true;
        }

        boardRef.current = newBoard;
        setBoard(newBoard);
        setSelectedCell(null);
        setValidMoves([]);

        const captured = move.captures.length;
        if (captured > 0) {
          const points = captured * 20;
          setScore(prev => prev + points);
          onScore(points);
          setMessage(`Captured ${captured} piece${captured > 1 ? 's' : ''}! +${points}`);
        } else {
          setMessage(`Moved to ${row},${col}`);
        }
        setLastMove(`You: (${selectedCell.row},${selectedCell.col}) → (${row},${col})${captured > 0 ? ' x' + captured : ''}`);

        const aiCount = countPieces(newBoard, 'black');
        onProgress(1 - aiCount / 12);

        if (aiCount === 0 || getAllMoves(newBoard, 'black').length === 0) {
          gameActiveRef.current = false;
          const finalScore = score + 100 + stage * 10;
          onScore(100 + stage * 10);
          setTimeout(() => {
            setPhase('done');
            onEnd({
              score: finalScore,
              stars: stage >= 7 ? 3 : stage >= 4 ? 2 : 1,
              summary: `You captured all AI pieces! Stage ${stage} checkers champion!`,
            });
          }, 500);
          return;
        }

        isPlayerTurnRef.current = false;
        setIsPlayerTurn(false);
        setMessage("AI is thinking...");
        return;
      }

      if (piece?.color === 'red') {
        setSelectedCell({ row, col });
        const moves = getValidMoves(boardRef.current, row, col);
        setValidMoves(moves);
        return;
      }

      setSelectedCell(null);
      setValidMoves([]);
      return;
    }

    if (piece?.color === 'red') {
      setSelectedCell({ row, col });
      const moves = getValidMoves(boardRef.current, row, col);
      setValidMoves(moves);
    }
  }, [selectedCell, validMoves, score, stage, onScore, onProgress, onEnd]);

  useEffect(() => {
    if (phase !== 'playing' || isPlayerTurn) return;

    const timer = setTimeout(() => {
      if (!gameActiveRef.current) return;

      const move = getAIMove(boardRef.current, stage);
      if (!move) {
        gameActiveRef.current = false;
        const finalScore = score + 100 + stage * 10;
        onScore(100 + stage * 10);
        setPhase('done');
        onEnd({
          score: finalScore,
          stars: stage >= 7 ? 3 : stage >= 4 ? 2 : 1,
          summary: `AI has no moves! You win stage ${stage}!`,
        });
        return;
      }

      const newBoard = cloneBoard(boardRef.current);
      const movingPiece = { ...newBoard[move.fromRow][move.fromCol]! };
      newBoard[move.toRow][move.toCol] = movingPiece;
      newBoard[move.fromRow][move.fromCol] = null;

      const allMovesForPiece = getValidMoves(boardRef.current, move.fromRow, move.fromCol);
      const chosenMove = allMovesForPiece.find(m => m.row === move.toRow && m.col === move.toCol);
      if (chosenMove) {
        for (const cap of chosenMove.captures) {
          newBoard[cap.row][cap.col] = null;
        }
      }

      if (!movingPiece.isKing && move.toRow === 7) {
        movingPiece.isKing = true;
      }

      boardRef.current = newBoard;
      setBoard(newBoard);

      const captured = chosenMove?.captures.length || 0;
      setLastMove(`AI: (${move.fromRow},${move.fromCol}) → (${move.toRow},${move.toCol})${captured > 0 ? ' x' + captured : ''}`);

      const playerCount = countPieces(newBoard, 'red');
      onProgress(1 - playerCount / 12);

      if (playerCount === 0 || getAllMoves(newBoard, 'red').length === 0) {
        gameActiveRef.current = false;
        setTimeout(() => {
          setPhase('done');
          onEnd({
            score: Math.max(10, 50 - stage * 5),
            stars: 0,
            summary: `AI won! You had ${countPieces(newBoard, 'red')} pieces left.`,
          });
        }, 500);
        return;
      }

      isPlayerTurnRef.current = true;
      setIsPlayerTurn(true);
      setMessage('Your turn! Select a red piece.');
    }, 1000 + stage * 100);

    return () => clearTimeout(timer);
  }, [phase, isPlayerTurn, stage, score, onScore, onProgress, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4 animate-bounce">⚫</div>
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Checkers</h2>
        <p className="text-amber-300 mb-4 max-w-xs">Capture all AI pieces! Red is yours.</p>
        <div className="bg-[#2d2518] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-amber-300 text-sm">🔴 Red pieces = You</div>
          <div className="text-gray-400 text-sm mt-1">⚫ Black pieces = AI</div>
          <div className="text-yellow-400 text-sm mt-2">Stage {stage}: AI depth {stage <= 3 ? 'random' : stage <= 5 ? '1' : stage <= 7 ? '2' : '3'}</div>
        </div>
        <button
          onClick={startGame}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! ⚫
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const won = countPieces(board, 'black') === 0 || getAllMoves(board, 'black').length === 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className={`text-6xl mb-4 ${won ? 'animate-bounce' : ''}`}>{won ? '🏆' : '😢'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${won ? 'text-amber-400' : 'text-red-400'}`}>
          {won ? 'You Won!' : 'AI Won!'}
        </h2>
        <p className="text-amber-300 mb-2">
          Your pieces: {countPieces(board, 'red')} | AI pieces: {countPieces(board, 'black')}
        </p>
        <button
          onClick={startGame}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Play Again! ⚫
        </button>
      </div>
    );
  }

  const isValidMove = (row: number, col: number) => validMoves.some(m => m.row === row && m.col === col);

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-3 py-2 bg-[#2d2518] rounded-xl mb-2">
        <span className="text-red-400 font-bold">🔴 You: {countPieces(board, 'red')}</span>
        <span className="text-gray-400 font-bold">⚫ AI: {countPieces(board, 'black')}</span>
        <span className="text-amber-400 text-sm">{message}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-2">
        <div className="grid grid-cols-8 gap-0 border-2 border-amber-800 rounded-lg overflow-hidden" style={{ maxWidth: 320 }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const isValidTarget = isValidMove(r, c);

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`aspect-square flex items-center justify-center relative cursor-pointer
                    ${isDark ? 'bg-amber-900' : 'bg-amber-100'}
                    ${isSelected ? 'ring-2 ring-yellow-400 z-10' : ''}
                  `}
                >
                  {cell && (
                    <div
                      className={`w-4/5 h-4/5 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all
                        ${cell.color === 'red'
                          ? 'bg-gradient-to-br from-red-500 to-red-700 text-white'
                          : 'bg-gradient-to-br from-gray-700 to-gray-900 text-gray-300'}
                        ${cell.isKing ? 'ring-2 ring-yellow-400' : ''}
                      `}
                    >
                      {cell.isKing ? '👑' : ''}
                    </div>
                  )}
                  {isValidTarget && !cell && (
                    <div className="w-3 h-3 rounded-full bg-green-400/60 animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {lastMove && (
        <div className="text-center text-xs text-amber-300/60 py-1">{lastMove}</div>
      )}
    </div>
  );
}

registerGame('checkers', {
  name: 'Checkers',
  emoji: '⚫',
  description: 'Jump and capture all opponent pieces!',
  category: 'board',
  stages: 10,
  component: CheckersGame,
});

export default CheckersGame;
