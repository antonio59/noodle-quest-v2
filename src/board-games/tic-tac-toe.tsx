import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';
type CellState = 'empty' | 'x' | 'o';
type Board = CellState[];

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): CellState | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== 'empty' && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== 'empty')) return 'draw';
  return null;
}

function getWinningLine(board: Board): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== 'empty' && board[a] === board[b] && board[b] === board[c]) {
      return line;
    }
  }
  return null;
}

function minimaxTTT(board: Board, isMaximizing: boolean, depth: number): number {
  const winner = checkWinner(board);
  if (winner === 'o') return 10 - depth;
  if (winner === 'x') return depth - 10;
  if (winner === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === 'empty') {
        board[i] = 'o';
        best = Math.max(best, minimaxTTT(board, false, depth + 1));
        board[i] = 'empty';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === 'empty') {
        board[i] = 'x';
        best = Math.min(best, minimaxTTT(board, true, depth + 1));
        board[i] = 'empty';
      }
    }
    return best;
  }
}

function getAIMove(board: Board, stage: number): number {
  const emptyCells = board.map((cell, i) => cell === 'empty' ? i : -1).filter(i => i >= 0);
  if (emptyCells.length === 0) return -1;

  if (stage <= 2) {
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  if (stage <= 4) {
    if (Math.random() < 0.4) {
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
  }

  if (stage <= 6) {
    for (const cell of emptyCells) {
      const testBoard = [...board];
      testBoard[cell] = 'o';
      if (checkWinner(testBoard) === 'o') return cell;
    }
    for (const cell of emptyCells) {
      const testBoard = [...board];
      testBoard[cell] = 'x';
      if (checkWinner(testBoard) === 'x') return cell;
    }
    if (Math.random() < 0.3) {
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
  }

  let bestScore = -Infinity;
  let bestMove = emptyCells[0];

  for (const cell of emptyCells) {
    const testBoard = [...board];
    testBoard[cell] = 'o';
    const score = minimaxTTT(testBoard, false, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMove = cell;
    }
  }

  return bestMove;
}

function TicTacToeGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [board, setBoard] = useState<Board>(Array(9).fill('empty'));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [message, setMessage] = useState('');
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [playerWins, setPlayerWins] = useState(0);
  const [aiWins, setAiWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [animatingCell, setAnimatingCell] = useState<number | null>(null);
  const boardRef = useRef<Board>(Array(9).fill('empty'));
  const isPlayerTurnRef = useRef(true);
  const gameActiveRef = useRef(false);

  const maxRounds = 3;

  const startGame = useCallback(() => {
    const newBoard = Array(9).fill('empty');
    setBoard(newBoard);
    boardRef.current = newBoard;
    setIsPlayerTurn(true);
    isPlayerTurnRef.current = true;
    setMessage('Your turn! Place an X.');
    setWinningLine(null);
    setAnimatingCell(null);
    setRounds(0);
    setPlayerWins(0);
    setAiWins(0);
    setDraws(0);
    setScore(0);
    gameActiveRef.current = true;
    setPhase('playing');
  }, []);

  const handleCellClick = useCallback((index: number) => {
    if (!gameActiveRef.current || !isPlayerTurnRef.current) return;
    if (boardRef.current[index] !== 'empty') return;

    const newBoard = [...boardRef.current];
    newBoard[index] = 'x';
    boardRef.current = newBoard;
    setBoard(newBoard);
    setAnimatingCell(index);
    setTimeout(() => setAnimatingCell(null), 300);

    const winner = checkWinner(newBoard);
    if (winner) {
      const line = getWinningLine(newBoard);
      setWinningLine(line);

      if (winner === 'x') {
        const points = 30 + stage * 5;
        setScore(prev => prev + points);
        onScore(points);
        setPlayerWins(prev => prev + 1);
        setMessage('You win this round! 🎉');
      } else if (winner === 'o') {
        setAiWins(prev => prev + 1);
        setMessage('AI wins this round! 😢');
      } else {
        setDraws(prev => prev + 1);
        setMessage("It's a draw!");
      }

      const newRounds = rounds + 1;
      setRounds(newRounds);
      onProgress(newRounds / maxRounds);

      if (newRounds >= maxRounds) {
        gameActiveRef.current = false;
        setTimeout(() => {
          setPhase('done');
          const finalScore = score + (winner === 'x' ? 30 + stage * 5 : 0);
          onEnd({
            score: finalScore,
            stars: playerWins + (winner === 'x' ? 1 : 0) >= 2 ? (stage >= 7 ? 3 : stage >= 4 ? 2 : 1) : 0,
            summary: `Best of ${maxRounds}: You ${playerWins + (winner === 'x' ? 1 : 0)} - AI ${aiWins + (winner === 'o' ? 1 : 0)} - Draws ${draws + (winner === 'draw' ? 1 : 0)}`,
          });
        }, 1500);
        return;
      }

      setTimeout(() => {
        const resetBoard = Array(9).fill('empty');
        boardRef.current = resetBoard;
        setBoard(resetBoard);
        setWinningLine(null);
        setMessage('Your turn! Place an X.');
        isPlayerTurnRef.current = true;
        setIsPlayerTurn(true);
      }, 1500);
      return;
    }

    isPlayerTurnRef.current = false;
    setIsPlayerTurn(false);
    setMessage("AI is thinking...");
  }, [stage, rounds, score, playerWins, aiWins, draws, onScore, onProgress, onEnd]);

  useEffect(() => {
    if (phase !== 'playing' || isPlayerTurn) return;

    const timer = setTimeout(() => {
      if (!gameActiveRef.current) return;

      const move = getAIMove(boardRef.current, stage);
      if (move === -1) return;

      const newBoard = [...boardRef.current];
      newBoard[move] = 'o';
      boardRef.current = newBoard;
      setBoard(newBoard);
      setAnimatingCell(move);
      setTimeout(() => setAnimatingCell(null), 300);

      const winner = checkWinner(newBoard);
      if (winner) {
        const line = getWinningLine(newBoard);
        setWinningLine(line);

        if (winner === 'x') {
          const points = 30 + stage * 5;
          setScore(prev => prev + points);
          onScore(points);
          setPlayerWins(prev => prev + 1);
          setMessage('You win this round! 🎉');
        } else if (winner === 'o') {
          setAiWins(prev => prev + 1);
          setMessage('AI wins this round! 😢');
        } else {
          setDraws(prev => prev + 1);
          setMessage("It's a draw!");
        }

        const newRounds = rounds + 1;
        setRounds(newRounds);
        onProgress(newRounds / maxRounds);

        if (newRounds >= maxRounds) {
          gameActiveRef.current = false;
          setTimeout(() => {
            setPhase('done');
            const finalScore = score + (winner === 'x' ? 30 + stage * 5 : 0);
            onEnd({
              score: finalScore,
              stars: playerWins + (winner === 'x' ? 1 : 0) >= 2 ? (stage >= 7 ? 3 : stage >= 4 ? 2 : 1) : 0,
              summary: `Best of ${maxRounds}: You ${playerWins + (winner === 'x' ? 1 : 0)} - AI ${aiWins + (winner === 'o' ? 1 : 0)} - Draws ${draws + (winner === 'draw' ? 1 : 0)}`,
            });
          }, 1500);
          return;
        }

        setTimeout(() => {
          const resetBoard = Array(9).fill('empty');
          boardRef.current = resetBoard;
          setBoard(resetBoard);
          setWinningLine(null);
          setMessage('Your turn! Place an X.');
          isPlayerTurnRef.current = true;
          setIsPlayerTurn(true);
        }, 1500);
        return;
      }

      isPlayerTurnRef.current = true;
      setIsPlayerTurn(true);
      setMessage('Your turn! Place an X.');
    }, 600 + stage * 50);

    return () => clearTimeout(timer);
  }, [phase, isPlayerTurn, stage, rounds, score, playerWins, aiWins, draws, onScore, onProgress, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4 animate-bounce">❌</div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Tic Tac Toe</h2>
        <p className="text-cyan-300 mb-4 max-w-xs">Get 3 in a row! Best of 3 rounds.</p>
        <div className="bg-[#1a2530] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-cyan-300 text-sm">❌ X = You</div>
          <div className="text-pink-300 text-sm mt-1">⭕ O = AI</div>
          <div className="text-yellow-400 text-sm mt-2">Stage {stage}: AI {stage <= 2 ? 'plays random' : stage <= 6 ? 'plays okay' : 'is unbeatable!'}</div>
        </div>
        <button
          onClick={startGame}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! ❌
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const won = playerWins > aiWins;
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className={`text-6xl mb-4 ${won ? 'animate-bounce' : ''}`}>{won ? '🏆' : '😢'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${won ? 'text-cyan-400' : 'text-pink-400'}`}>
          {won ? 'You Won!' : 'AI Won!'}
        </h2>
        <p className="text-cyan-300 mb-2">
          You: {playerWins} | AI: {aiWins} | Draws: {draws}
        </p>
        <button
          onClick={startGame}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Play Again! ❌
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-3 py-2 bg-[#1a2530] rounded-xl mb-2">
        <span className="text-cyan-400 font-bold">❌ You: {playerWins}</span>
        <span className="text-cyan-300 text-sm">{message}</span>
        <span className="text-pink-400 font-bold">AI: {aiWins}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-2">
        <div className="grid grid-cols-3 gap-2 p-3 bg-[#1a2530] rounded-xl">
          {board.map((cell, i) => {
            const isWin = winningLine?.includes(i);
            const isAnimating = animatingCell === i;

            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={cell !== 'empty' || !isPlayerTurn}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-4xl sm:text-5xl font-bold transition-all duration-300
                  ${cell === 'empty'
                    ? isPlayerTurn
                      ? 'bg-[#2a3a4a] hover:bg-[#3a4a5a] cursor-pointer active:scale-95'
                      : 'bg-[#2a3a4a]'
                    : cell === 'x'
                      ? isWin
                        ? 'bg-cyan-500/30 ring-2 ring-cyan-400'
                        : 'bg-[#2a3a4a]'
                      : isWin
                        ? 'bg-pink-500/30 ring-2 ring-pink-400'
                        : 'bg-[#2a3a4a]'}
                  ${isAnimating ? 'scale-110' : ''}
                `}
              >
                {cell === 'x' && (
                  <span className="text-cyan-400 drop-shadow-lg">✕</span>
                )}
                {cell === 'o' && (
                  <span className="text-pink-400 drop-shadow-lg">◯</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs text-cyan-300/60 py-1">
        Round {Math.min(rounds + 1, maxRounds)} / {maxRounds}
      </div>
    </div>
  );
}

registerGame('tic-tac-toe', {
  name: 'Tic Tac Toe',
  emoji: '❌',
  description: 'Get 3 in a row! Best of 3 rounds.',
  category: 'board',
  stages: 10,
  component: TicTacToeGame,
});

export default TicTacToeGame;
