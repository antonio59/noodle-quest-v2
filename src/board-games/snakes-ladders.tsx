import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';
type Turn = 'player' | 'ai';

const SNAKES: Record<number, [number, number][]> = {
  1: [[25, 5], [50, 30], [75, 55]],
  2: [[25, 5], [50, 30], [75, 55], [90, 70]],
  3: [[20, 3], [35, 15], [50, 30], [65, 45], [80, 60]],
  4: [[20, 3], [35, 15], [50, 30], [65, 45], [80, 60], [95, 75]],
  5: [[18, 2], [30, 10], [45, 25], [60, 40], [72, 52], [88, 68]],
  6: [[18, 2], [30, 10], [45, 25], [60, 40], [72, 52], [88, 68], [96, 76]],
  7: [[16, 1], [28, 8], [40, 20], [55, 35], [68, 48], [82, 62], [94, 74]],
  8: [[16, 1], [28, 8], [40, 20], [55, 35], [68, 48], [82, 62], [94, 74], [98, 78]],
  9: [[15, 1], [25, 5], [38, 18], [50, 30], [62, 42], [75, 55], [85, 65], [92, 72]],
  10: [[15, 1], [25, 5], [38, 18], [50, 30], [62, 42], [75, 55], [85, 65], [92, 72], [99, 79]],
};

const LADDERS: [number, number][] = [
  [3, 22], [10, 35], [20, 45], [40, 60], [55, 75], [70, 90],
];

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function SnakesLaddersGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [playerPos, setPlayerPos] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [turn, setTurn] = useState<Turn>('player');
  const [dice, setDice] = useState(0);
  const [message, setMessage] = useState('');
  const [rolling, setRolling] = useState(false);
  const gameActiveRef = useRef(false);
  const turnRef = useRef<Turn>('player');

  const snakes = SNAKES[Math.min(stage, 10)] || SNAKES[10];
  const snakeMap = new Map(snakes);
  const ladderMap = new Map(LADDERS);

  const startGame = useCallback(() => {
    setPlayerPos(0);
    setAiPos(0);
    setTurn('player');
    setDice(0);
    setMessage('Your turn! Roll the dice!');
    setRolling(false);
    gameActiveRef.current = true;
    turnRef.current = 'player';
    setPhase('playing');
  }, []);

  const applySnakeOrLadder = (pos: number): { pos: number; msg: string } => {
    if (snakeMap.has(pos)) {
      return { pos: snakeMap.get(pos)!, msg: '🐍 Snake! Slid down!' };
    }
    if (ladderMap.has(pos)) {
      return { pos: ladderMap.get(pos)!, msg: '🪜 Ladder! Climbed up!' };
    }
    return { pos, msg: '' };
  };

  const handleRoll = useCallback(() => {
    if (rolling || turnRef.current !== 'player' || !gameActiveRef.current) return;
    setRolling(true);

    const roll = Math.floor(Math.random() * 6) + 1;
    setDice(roll);

    setTimeout(() => {
      let newPos = playerPos + roll;
      if (newPos > 100) {
        setMessage(`Need exactly ${100 - playerPos} to win! Stay at ${playerPos}.`);
        setRolling(false);
        turnRef.current = 'ai';
        setTurn('ai');
        return;
      }

      const result = applySnakeOrLadder(newPos);
      newPos = result.pos;
      setPlayerPos(newPos);
      onProgress(newPos / 100);

      let msg = `You rolled ${roll} → moved to ${newPos}`;
      if (result.msg) msg += ` ${result.msg}`;
      setMessage(msg);

      if (newPos >= 100) {
        gameActiveRef.current = false;
        const score = 100 + stage * 10;
        onScore(score);
        setTimeout(() => {
          setPhase('done');
          onEnd({ score, stars: stage >= 7 ? 3 : stage >= 4 ? 2 : 1, summary: `You won Snakes & Ladders! Reached 100 on stage ${stage}!` });
        }, 1000);
        return;
      }

      setRolling(false);
      turnRef.current = 'ai';
      setTurn('ai');
      setMessage("AI's turn...");
    }, 600);
  }, [rolling, playerPos, stage, onProgress, onScore, onEnd]);

  // AI turn
  useEffect(() => {
    if (phase !== 'playing' || turn !== 'ai' || !gameActiveRef.current) return;
    const timer = setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDice(roll);

      setTimeout(() => {
        let newPos = aiPos + roll;
        if (newPos > 100) {
          setMessage(`AI rolled ${roll} — overshoot! AI stays at ${aiPos}. Your turn!`);
          turnRef.current = 'player';
          setTurn('player');
          return;
        }

        const result = applySnakeOrLadder(newPos);
        newPos = result.pos;
        setAiPos(newPos);

        let msg = `AI rolled ${roll} → moved to ${newPos}`;
        if (result.msg) msg += ` ${result.msg}`;

        if (newPos >= 100) {
          gameActiveRef.current = false;
          msg += ' — AI won!';
          setMessage(msg);
          setTimeout(() => {
            setPhase('done');
            onEnd({ score: 0, stars: 1, summary: `AI reached 100 first. Try again! Stage ${stage}.` });
          }, 1500);
          return;
        }

        msg += '. Your turn!';
        setMessage(msg);
        turnRef.current = 'player';
        setTurn('player');
      }, 600);
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, turn, aiPos, stage, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🐍</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">Snakes & Ladders</h2>
        <p className="text-green-300 mb-4 max-w-xs">Race to 100! Climb ladders, avoid snakes!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-green-300">🐍 {snakes.length} snakes, 🪜 {LADDERS.length} ladders</div>
          <div className="text-yellow-400 mt-1">Stage {stage} — {stage <= 3 ? 'Easy' : stage <= 6 ? 'Medium' : stage <= 8 ? 'Hard' : 'Expert'}</div>
        </div>
        <button onClick={startGame} className="bg-green-600 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Game! 🎲
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const won = playerPos >= 100;
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className={`text-6xl mb-4 ${won ? 'animate-[celebrate_0.5s_ease]' : ''}`}>{won ? '🏆' : '😢'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${won ? 'text-green-400' : 'text-red-400'}`}>{won ? 'You Won!' : 'AI Won!'}</h2>
        <p className="text-green-300 mb-4">You: {playerPos} | AI: {aiPos}</p>
        <div className="flex gap-3">
          <button onClick={startGame} className="bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl active:scale-95">Play Again 🎲</button>
          <button onClick={() => onEnd({ score: 0, stars: 0, summary: '' })} className="bg-card text-text px-6 py-2.5 rounded-xl active:scale-95">Exit</button>
        </div>
      </div>
    );
  }

  // Build 10x10 board (bottom to top, zigzag)
  const boardCells: number[] = [];
  for (let row = 9; row >= 0; row--) {
    for (let col = 0; col < 10; col++) {
      const num = row % 2 === 0 ? row * 10 + col + 1 : row * 10 + (9 - col) + 1;
      boardCells.push(num);
    }
  }

  const cellSize = 'min(8vw, 36px)';

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-card rounded-xl mb-2 mx-2">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-bold text-sm">👤 You: {playerPos}</span>
          <span className="text-red-400 font-bold text-sm">🤖 AI: {aiPos}</span>
        </div>
        <div className="text-2xl">{dice > 0 ? DICE_FACES[dice] : '🎲'}</div>
      </div>

      {/* Message */}
      <div className="text-center text-sm text-green-300 py-1 min-h-[20px]">{message}</div>

      {/* Board */}
      <div className="flex-1 overflow-auto px-2">
        <div className="grid gap-px bg-[#0d1a10] p-1 rounded-xl mx-auto" style={{ gridTemplateColumns: `repeat(10, ${cellSize})`, maxWidth: 360 }}>
          {boardCells.map((num) => {
            const isPlayerHere = playerPos === num;
            const isAIHere = aiPos === num;
            const isSnake = snakeMap.has(num);
            const isLadder = ladderMap.has(num);

            return (
              <div
                key={num}
                className={`aspect-square flex items-center justify-center text-[7px] font-bold rounded-sm relative
                  ${num % 2 === 0 ? 'bg-[#2d4a30]' : 'bg-[#1a3320]'}
                  ${isSnake ? 'ring-1 ring-red-500/60' : ''}
                  ${isLadder ? 'ring-1 ring-yellow-500/60' : ''}
                `}
              >
                <span className="text-green-300/50">{num}</span>
                {isSnake && <span className="absolute top-0 right-0 text-[8px] leading-none">🐍</span>}
                {isLadder && <span className="absolute top-0 right-0 text-[8px] leading-none">🪜</span>}
                {isPlayerHere && (
                  <span className="absolute inset-0 flex items-center justify-center text-blue-400 text-sm font-bold drop-shadow-lg z-10">👤</span>
                )}
                {isAIHere && !isPlayerHere && (
                  <span className="absolute inset-0 flex items-center justify-center text-red-400 text-sm font-bold drop-shadow-lg z-10">🤖</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Roll button */}
      <div className="flex justify-center py-2">
        <button
          onClick={handleRoll}
          disabled={turn !== 'player' || rolling}
          className={`font-bold px-6 py-2.5 rounded-xl text-lg active:scale-95 transition-all
            ${turn === 'player' && !rolling
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
        >
          {rolling ? '🎲 Rolling...' : turn === 'player' ? '🎲 Roll!' : "⏳ AI's turn..."}
        </button>
      </div>
    </div>
  );
}

registerGame('snakes-ladders', {
  name: 'Snakes & Ladders',
  emoji: '🐍',
  description: 'Race to 100! Climb ladders, avoid snakes!',
  category: 'board',
  stages: 10,
  component: SnakesLaddersGame,
});

export default SnakesLaddersGame;
