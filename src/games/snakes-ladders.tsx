import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/types';

// Define AI difficulty levels
const DIFFICULTY_LEVELS = {
  easy: { enterChance: 0.4, ladderChance: 0.6, snakeAvoidChance: 0.5 },
  medium: { enterChance: 0.8, ladderChance: 0.9, snakeAvoidChance: 0.8 },
  hard: { enterChance: 1.0, ladderChance: 1.0, snakeAvoidChance: 1.0 },
};

const BOARD_SIZE = 100;
const MAX_LOSSES = 3; // lose the match after this many AI wins

// Snakes: head -> tail (go back)
const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};
// Ladders: bottom -> top (go forward)
const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91,
};

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function getCellPos(cell: number): { row: number; col: number } {
  const zeroBased = cell - 1;
  const row = 9 - Math.floor(zeroBased / 10);
  const col = row % 2 === 1 ? zeroBased % 10 : 9 - (zeroBased % 10);
  return { row, col };
}

// Simple AI: prefer ladders > avoid snakes > exact finish > random
function aiMove(aiPos: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const { ladderChance, snakeAvoidChance } = DIFFICULTY_LEVELS[difficulty];

  if (aiPos === 0) return rollDie();

  if (Math.random() < ladderChance) {
    for (const [bottom, top] of Object.entries(LADDERS)) {
      const b = parseInt(bottom);
      if (b > aiPos && b - aiPos <= 6) return b - aiPos;
      if (top > aiPos && top - aiPos <= 6) return top - aiPos;
    }
  }

  // Avoid snakes: pick any roll 1..6 that doesn't land on a snake head
  if (Math.random() < snakeAvoidChance) {
    const safeRolls: number[] = [];
    for (let r = 1; r <= 6; r++) {
      const dest = aiPos + r;
      if (dest <= BOARD_SIZE && !SNAKES[dest]) safeRolls.push(r);
    }
    if (safeRolls.length > 0) return safeRolls[Math.floor(Math.random() * safeRolls.length)];
  }

  if (BOARD_SIZE - aiPos <= 6) return BOARD_SIZE - aiPos;
  return rollDie();
}

function SnakesLaddersGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const mySeat = isOnline ? multiplayerState.playerNumber : 1;
  const [playerPos, setPlayerPos] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [die, setDie] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [animating, setAnimating] = useState(false);
  const targetWins = Math.max(1, stage);
  const difficulty = aiDifficulty || 'medium';

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

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
      intervalsRef.current.forEach(clearInterval);
    };
  }, []);

  // Online sync: read positions[0]=seat1, positions[1]=seat2 and whose turn.
  useEffect(() => {
    if (!isOnline) return;
    const bs = multiplayerState.boardState as { positions?: [number, number]; lastRoll?: number } | null | undefined;
    if (bs && Array.isArray(bs.positions)) {
      setPlayerPos(bs.positions[mySeat - 1] ?? 0);
      setAiPos(bs.positions[mySeat === 1 ? 1 : 0] ?? 0);
      setTurn(multiplayerState.currentPlayer === mySeat ? 'player' : 'ai');
      if (typeof bs.lastRoll === 'number') setDie(bs.lastRoll);
      const myPos = bs.positions[mySeat - 1] ?? 0;
      const oppPos = bs.positions[mySeat === 1 ? 1 : 0] ?? 0;
      if (!endedRef.current && (myPos >= BOARD_SIZE || oppPos >= BOARD_SIZE)) {
        endedRef.current = true;
        const won = myPos >= BOARD_SIZE;
        onEnd({
          score: won ? 80 : 10,
          stars: won ? 3 : 1,
          summary: won ? 'You reached 100 first!' : 'Opponent reached 100 first.',
        });
      }
    }
  }, [isOnline, multiplayerState, mySeat, onEnd]);

  // Resolve snake/ladder chains (a ladder landing on a snake or vice versa)
  const resolveSquare = (pos: number): number => {
    const visited = new Set<number>();
    let cur = pos;
    while (!visited.has(cur)) {
      visited.add(cur);
      if (SNAKES[cur]) cur = SNAKES[cur];
      else if (LADDERS[cur]) cur = LADDERS[cur];
      else break;
    }
    return cur;
  };

  const moveToken = (
    currentPos: number,
    steps: number,
    setter: (p: number) => void,
    name: string,
    onComplete: (finalPos: number) => void,
  ) => {
    const target = currentPos + steps;
    if (target > BOARD_SIZE) {
      onComplete(currentPos);
      return;
    }

    setAnimating(true);
    let pos = currentPos;
    const interval = setInterval(() => {
      if (endedRef.current) {
        clearInterval(interval);
        intervalsRef.current = intervalsRef.current.filter(x => x !== interval);
        return;
      }
      pos++;
      if (pos > target) {
        clearInterval(interval);
        intervalsRef.current = intervalsRef.current.filter(x => x !== interval);
        const landed = target;
        const resolved = resolveSquare(landed);
        if (resolved !== landed) {
          if (SNAKES[landed]) onMessage(`${name} hit a snake! Going down...`);
          else if (LADDERS[landed]) onMessage(`${name} found a ladder! Going up!`);
          schedule(() => {
            setter(resolved);
            setAnimating(false);
            onComplete(resolved);
          }, 500);
        } else {
          setAnimating(false);
          onComplete(resolved);
        }
        return;
      }
      setter(pos);
    }, 100);
    intervalsRef.current.push(interval);
  };

  const resetGame = useCallback(() => {
    setPlayerPos(0);
    setAiPos(0);
    setTurn('player');
    setDie(null);
    setGameOver(false);
    setAnimating(false);
    onMessage('New round! Your turn.');
  }, [onMessage]);

  const finishMatch = (finalWins: number, finalLosses: number, outcome: 'win' | 'lose') => {
    if (endedRef.current) return;
    endedRef.current = true;
    const totalRounds = finalWins + finalLosses;
    const winRate = totalRounds > 0 ? finalWins / totalRounds : 0;
    const stars = outcome === 'win'
      ? (finalLosses === 0 ? 3 : finalLosses === 1 ? 2 : 1)
      : (winRate >= 0.5 ? 2 : 1);
    const summary = outcome === 'win'
      ? `Won ${finalWins} of ${totalRounds} rounds!`
      : `Lost the match — ${finalWins} wins vs ${finalLosses} losses.`;
    onEnd({ score: finalWins * 80, stars, summary });
  };

  const handlePlayerWin = () => {
    const newWins = wins + 1;
    setWins(newWins);
    setGameOver(true);
    onScore(80);
    onProgress(newWins / targetWins);
    if (newWins >= targetWins) {
      finishMatch(newWins, losses, 'win');
    } else {
      onMessage(`Won round ${newWins}/${targetWins}!`);
      schedule(resetGame, 2000);
    }
  };

  const handleAiWin = () => {
    const newLosses = losses + 1;
    setLosses(newLosses);
    setGameOver(true);
    if (newLosses >= MAX_LOSSES) {
      onMessage('AI won the match — good try!');
      finishMatch(wins, newLosses, 'lose');
    } else {
      onMessage(`AI won round — ${newLosses}/${MAX_LOSSES} losses.`);
      schedule(resetGame, 2000);
    }
  };

  const aiTurn = () => {
    if (endedRef.current || gameOver) return;
    const d = aiMove(aiPos, difficulty);
    setDie(d);

    if (aiPos + d > BOARD_SIZE) {
      onMessage(`AI rolled ${d} — overshoots!`);
      setTurn('player');
      return;
    }

    moveToken(aiPos, d, setAiPos, 'AI', (finalPos) => {
      if (finalPos >= BOARD_SIZE) {
        handleAiWin();
      } else {
        setTurn('player');
      }
    });
  };

  const handleRoll = () => {
    if (endedRef.current || gameOver || turn !== 'player' || animating) return;
    const d = rollDie();
    setDie(d);

    if (isOnline) {
      const overshoot = playerPos + d > BOARD_SIZE;
      const finalPos = overshoot ? playerPos : resolveSquare(playerPos + d);
      const dispatch = (animatedPos: number) => {
        const positions: [number, number] = mySeat === 1
          ? [animatedPos, aiPos]
          : [aiPos, animatedPos];
        const iWon = animatedPos >= BOARD_SIZE;
        onMultiplayerMove?.({
          boardState: { positions, lastRoll: d },
          winner: iWon ? mySeat : undefined,
        });
      };
      if (overshoot) {
        onMessage(`Rolled ${d} — need exact roll to finish!`);
        dispatch(playerPos);
        return;
      }
      moveToken(playerPos, d, setPlayerPos, 'You', () => dispatch(finalPos));
      return;
    }

    if (playerPos + d > BOARD_SIZE) {
      onMessage(`Rolled ${d} — need exact roll to finish!`);
      setTurn('ai');
      schedule(aiTurn, 800);
      return;
    }

    moveToken(playerPos, d, setPlayerPos, 'You', (finalPos) => {
      if (finalPos >= BOARD_SIZE) {
        handlePlayerWin();
      } else {
        setTurn('ai');
        schedule(aiTurn, 800);
      }
    });
  };

  return (
    <div className="h-full flex flex-col items-center p-3">
      {isOnline ? (
        <div className="flex gap-2 mb-2 text-xs items-center flex-wrap justify-center">
          <span className={`bg-card rounded-lg px-3 py-1.5 font-bold ${turn === 'player' ? 'text-accent' : 'text-text-muted'}`}>
            🔴 You: {playerPos}
          </span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">
            🔵 {multiplayerState?.opponentAvatar} {multiplayerState?.opponentName}: {aiPos}
          </span>
          <span className={`font-bold ${turn === 'player' ? 'text-success animate-pulse' : 'text-text-dim'}`}>
            {turn === 'player' ? 'Your roll' : 'Waiting...'}
          </span>
        </div>
      ) : (
        <div className="flex gap-3 mb-2 text-sm">
          <span className="bg-card rounded-lg px-3 py-1.5 text-danger font-bold">You: {playerPos}</span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted">AI: {aiPos}</span>
          <span className="bg-card rounded-lg px-3 py-1.5 text-accent text-xs">{wins}/{targetWins}</span>
          {losses > 0 && (
            <span className="bg-card rounded-lg px-3 py-1.5 text-danger text-xs">L: {losses}/{MAX_LOSSES}</span>
          )}
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-10 gap-[2px] bg-card-hover p-1 rounded-lg mb-3">
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const cell = i + 1;
          const isPlayer = playerPos === cell;
          const isAI = aiPos === cell;
          const isSnake = SNAKES[cell];
          const isLadder = LADDERS[cell];
          const pos = getCellPos(cell);
          const isDark = (pos.row + pos.col) % 2 === 0;

          return (
            <div
              key={cell}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[9px] sm:text-[10px] font-medium rounded-sm relative ${
                isDark ? 'bg-[#2d2a50]' : 'bg-[#3d3a60]'
              } ${cell === BOARD_SIZE ? 'ring-1 ring-accent' : ''}`}
            >
              <span className="text-text-muted/50 absolute top-0 left-0.5">{cell}</span>
              {isSnake && <span className="text-xs">🐍</span>}
              {isLadder && <span className="text-xs">🪜</span>}
              {isPlayer && !isAI && <span className="text-sm absolute">🔴</span>}
              {isAI && !isPlayer && <span className="text-sm absolute">🔵</span>}
              {isPlayer && isAI && <span className="text-sm absolute">🟣</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-card rounded-xl flex items-center justify-center text-3xl font-bold">
          {die ?? '🎲'}
        </div>
        <button
          onClick={handleRoll}
          disabled={gameOver || turn !== 'player' || animating}
          className="bg-accent text-bg font-bold px-6 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          {turn === 'player' ? 'Roll!' : 'AI...'}
        </button>
      </div>

      <div className="mt-2 text-xs text-text-muted text-center">
        Roll to move. 🪜 ladders up, 🐍 snakes down. Exact roll to finish!
      </div>
    </div>
  );
}

export default SnakesLaddersGame;
