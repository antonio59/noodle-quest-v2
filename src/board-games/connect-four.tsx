import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';
type CellState = 'empty' | 'player' | 'ai';
type Board = CellState[][];

const ROWS = 6;
const COLS = 7;

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
}

function dropPiece(board: Board, col: number, player: CellState): { board: Board; row: number } | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 'empty') {
      const newBoard = board.map(row => [...row]);
      newBoard[r][col] = player;
      return { board: newBoard, row: r };
    }
  }
  return null;
}

function checkWin(board: Board, row: number, col: number, player: CellState): boolean {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
      else break;
    }
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

function isBoardFull(board: Board): boolean {
  return board[0].every(cell => cell !== 'empty');
}

function getWinningCells(board: Board, player: CellState): Set<string> {
  const winningCells = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (const [dr, dc] of directions) {
        const cells: string[] = [[r, c].toString()];
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) {
            cells.push([nr, nc].toString());
          } else break;
        }
        if (cells.length >= 4) {
          cells.forEach(cell => winningCells.add(cell));
        }
      }
    }
  }
  return winningCells;
}

function evaluateColumn(board: Board, col: number, player: CellState): number {
  const result = dropPiece(board, col, player);
  if (!result) return -100;
  if (checkWin(result.board, result.row, col, player)) return 1000;

  const opponent = player === 'player' ? 'ai' : 'player';
  const oppResult = dropPiece(board, col, opponent);
  if (oppResult && checkWin(oppResult.board, oppResult.row, col, opponent)) return 500;

  let score = 0;
  if (col === 3) score += 3;
  else if (col === 2 || col === 4) score += 2;
  else if (col === 1 || col === 5) score += 1;

  return score;
}

function getAIMove(board: Board, stage: number): number {
  const validCols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 'empty') validCols.push(c);
  }
  if (validCols.length === 0) return -1;

  if (stage <= 2) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  for (const col of validCols) {
    const result = dropPiece(board, col, 'ai');
    if (result && checkWin(result.board, result.row, col, 'ai')) return col;
  }

  for (const col of validCols) {
    const result = dropPiece(board, col, 'player');
    if (result && checkWin(result.board, result.row, col, 'player')) return col;
  }

  if (stage <= 5) {
    const scored = validCols.map(col => ({ col, score: evaluateColumn(board, col, 'ai') }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(s => s.score === scored[0].score);
    return top[Math.floor(Math.random() * top.length)].col;
  }

  const scored = validCols.map(col => ({ col, score: evaluateColumn(board, col, 'ai') }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].col;
}

function ConnectFourGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [board, setBoard] = useState<Board>(createBoard);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [message, setMessage] = useState('');
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastDrop, setLastDrop] = useState<{ row: number; col: number } | null>(null);
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  const [_score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const boardRef = useRef<Board>(createBoard());
  const isPlayerTurnRef = useRef(true);
  const gameActiveRef = useRef(false);

  const startGame = useCallback(() => {
    const newBoard = createBoard();
    setBoard(newBoard);
    boardRef.current = newBoard;
    setIsPlayerTurn(true);
    isPlayerTurnRef.current = true;
    setMessage('Your turn! Drop a blue disc.');
    setScore(0);
    setMoves(0);
    setLastDrop(null);
    setWinningCells(new Set());
    setHoverCol(null);
    gameActiveRef.current = true;
    setPhase('playing');
  }, []);

  const handleColumnClick = useCallback((col: number) => {
    if (!gameActiveRef.current || !isPlayerTurnRef.current) return;
    if (boardRef.current[0][col] !== 'empty') return;

    const result = dropPiece(boardRef.current, col, 'player');
    if (!result) return;

    boardRef.current = result.board;
    setBoard(result.board);
    setLastDrop({ row: result.row, col });
    setMoves(prev => prev + 1);
    onProgress((moves + 1) / 42);

    if (checkWin(result.board, result.row, col, 'player')) {
      const cells = getWinningCells(result.board, 'player');
      setWinningCells(cells);
      gameActiveRef.current = false;
      const finalScore = 100 + stage * 10;
      setScore(finalScore);
      onScore(finalScore);
      setMessage('You win! 🎉');
      setTimeout(() => {
        setPhase('done');
        onEnd({
          score: finalScore,
          stars: stage >= 7 ? 3 : stage >= 4 ? 2 : 1,
          summary: `Connected 4 in ${moves + 1} moves! Stage ${stage} champion!`,
        });
      }, 1000);
      return;
    }

    if (isBoardFull(result.board)) {
      gameActiveRef.current = false;
      setMessage("It's a draw!");
      setTimeout(() => {
        setPhase('done');
        onEnd({ score: 30, stars: 1, summary: 'Draw! The board is full.' });
      }, 1000);
      return;
    }

    isPlayerTurnRef.current = false;
    setIsPlayerTurn(false);
    setMessage("AI is thinking...");
  }, [stage, moves, onScore, onProgress, onEnd]);

  useEffect(() => {
    if (phase !== 'playing' || isPlayerTurn) return;

    const timer = setTimeout(() => {
      if (!gameActiveRef.current) return;

      const col = getAIMove(boardRef.current, stage);
      if (col === -1) return;

      const result = dropPiece(boardRef.current, col, 'ai');
      if (!result) return;

      boardRef.current = result.board;
      setBoard(result.board);
      setLastDrop({ row: result.row, col });
      setMoves(prev => prev + 1);

      if (checkWin(result.board, result.row, col, 'ai')) {
        const cells = getWinningCells(result.board, 'ai');
        setWinningCells(cells);
        gameActiveRef.current = false;
        setMessage('AI wins! 😢');
        setTimeout(() => {
          setPhase('done');
          onEnd({
            score: Math.max(10, 50 - stage * 5),
            stars: 0,
            summary: `AI connected 4! Better luck next time.`,
          });
        }, 1000);
        return;
      }

      if (isBoardFull(result.board)) {
        gameActiveRef.current = false;
        setMessage("It's a draw!");
        setTimeout(() => {
          setPhase('done');
          onEnd({ score: 30, stars: 1, summary: 'Draw! The board is full.' });
        }, 1000);
        return;
      }

      isPlayerTurnRef.current = true;
      setIsPlayerTurn(true);
      setMessage('Your turn! Drop a blue disc.');
    }, 800 + stage * 50);

    return () => clearTimeout(timer);
  }, [phase, isPlayerTurn, stage, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4 animate-bounce">🔵</div>
        <h2 className="text-2xl font-bold text-blue-400 mb-2">Connect 4</h2>
        <p className="text-blue-300 mb-4 max-w-xs">Connect 4 discs in a row to win!</p>
        <div className="bg-[#1a2540] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-blue-300 text-sm">🔵 Blue discs = You</div>
          <div className="text-red-300 text-sm mt-1">🔴 Red discs = AI</div>
          <div className="text-yellow-400 text-sm mt-2">Stage {stage}: AI {stage <= 2 ? 'plays random' : stage <= 5 ? 'blocks sometimes' : 'plays smart!'}</div>
        </div>
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🔵
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const won = winningCells.size > 0 && board[winningCells.values().next().value?.split(',').map(Number)[0] || 0]?.[0] === 'player';
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className={`text-6xl mb-4 ${won ? 'animate-bounce' : ''}`}>{won ? '🏆' : '😢'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${won ? 'text-blue-400' : 'text-red-400'}`}>
          {won ? 'You Won!' : 'AI Won!'}
        </h2>
        <p className="text-blue-300 mb-4">{message}</p>
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Play Again! 🔵
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-3 py-2 bg-[#1a2540] rounded-xl mb-2">
        <span className="text-blue-400 font-bold">🔵 You</span>
        <span className="text-blue-300 text-sm">{message}</span>
        <span className="text-red-400 font-bold">AI 🔴</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-2">
        <div className="bg-blue-900 p-2 rounded-xl">
          <div className="grid grid-cols-7 gap-1">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isWinning = winningCells.has(`${r},${c}`);
                const isLastDrop = lastDrop?.row === r && lastDrop?.col === c;
                const isHovered = hoverCol === c && cell === 'empty' && isPlayerTurn && board[0][c] === 'empty';

                  return (
                    <div
                      key={`${r}-${c}`}
                      onPointerDown={() => handleColumnClick(c)}
                      onMouseEnter={() => setHoverCol(c)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${cell === 'empty'
                        ? isHovered
                          ? 'bg-blue-400/30 scale-95'
                          : 'bg-blue-950/50'
                        : cell === 'player'
                          ? isWinning
                            ? 'bg-gradient-to-br from-blue-300 to-blue-500 animate-pulse shadow-lg shadow-blue-400'
                            : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-md'
                          : isWinning
                            ? 'bg-gradient-to-br from-red-300 to-red-500 animate-pulse shadow-lg shadow-red-400'
                            : 'bg-gradient-to-br from-red-400 to-red-600 shadow-md'}
                      ${isLastDrop && cell !== 'empty' ? 'scale-110' : ''}
                      ${isPlayerTurn && cell === 'empty' && board[0][c] === 'empty' ? 'cursor-pointer hover:bg-blue-400/20' : ''}
                    `}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-blue-300/60 py-1">
        Moves: {moves} / 42
      </div>
    </div>
  );
}

registerGame('connect-four', {
  name: 'Connect 4',
  emoji: '🔵',
  description: 'Connect 4 discs in a row to win!',
  category: 'board',
  stages: 10,
  component: ConnectFourGame,
});

export default ConnectFourGame;
