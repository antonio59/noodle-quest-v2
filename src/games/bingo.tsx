import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const COL_LABELS = ['B', 'I', 'N', 'G', 'O'];
const COL_RANGES: [number, number][] = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genCard(): (number | 'FREE')[][] {
  const card: (number | 'FREE')[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let c = 0; c < 5; c++) {
    const [lo, hi] = COL_RANGES[c];
    const nums = shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, 5);
    for (let r = 0; r < 5; r++) card[r][c] = nums[r];
  }
  card[2][2] = 'FREE';
  return card;
}

function genPool(): number[] {
  return shuffle(Array.from({ length: 75 }, (_, i) => i + 1));
}

function emptyMarks(): boolean[][] {
  const m = Array.from({ length: 5 }, () => Array<boolean>(5).fill(false));
  m[2][2] = true;
  return m;
}

function countLines(m: boolean[][]): number {
  let n = 0;
  for (let r = 0; r < 5; r++) if (m[r].every(Boolean)) n++;
  for (let c = 0; c < 5; c++) if (m.every(row => row[c])) n++;
  if (m.every((row, i) => row[i])) n++;
  if (m.every((row, i) => row[4 - i])) n++;
  return n;
}

function isFull(m: boolean[][]): boolean {
  return m.every(row => row.every(Boolean));
}

function checkWin(m: boolean[][], stage: number): boolean {
  if (stage <= 5) return countLines(m) >= 1;
  if (stage <= 8) return countLines(m) >= 2;
  return isFull(m);
}

function winLabel(stage: number): string {
  if (stage <= 5) return 'Complete 1 line!';
  if (stage <= 8) return 'Complete 2 lines!';
  return 'Complete full card!';
}

const MAX_LOSSES = 3;

function BingoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty, multiplayerState, onMultiplayerMove }: GameProps) {
  const difficulty = aiDifficulty || 'medium';
  const isOnline = !!multiplayerState;
  const isHost = isOnline && multiplayerState.playerNumber === 1;
  const targetWins = Math.max(1, stage + 1);
  const callSpeed = stage <= 3 ? 2500 : stage <= 6 ? 2000 : 1500;

  const [playerCard, setPlayerCard] = useState<(number | 'FREE')[][]>(genCard);
  const [aiCard, setAiCard] = useState<(number | 'FREE')[][]>(genCard);
  const [playerMarked, setPlayerMarked] = useState<boolean[][]>(emptyMarks);
  const [aiMarked, setAiMarked] = useState<boolean[][]>(emptyMarks);
  const [called, setCalled] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [calling, setCalling] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundWins, setRoundWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [, setTotalCalled] = useState(0);

  const poolRef = useRef<number[]>(genPool());
  const gameOverRef = useRef(false);
  const aiMarkedRef = useRef<boolean[][]>(emptyMarks());
  const aiCardRef = useRef<(number | 'FREE')[][]>(genCard());
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

  const finishMatch = useCallback((outcome: 'win' | 'lose') => {
    if (endedRef.current) return;
    endedRef.current = true;
    const finalWins = winsRef.current;
    const finalLosses = lossesRef.current;
    const stars = outcome === 'win'
      ? (finalLosses === 0 ? 3 : finalLosses === 1 ? 2 : 1)
      : (finalWins > 0 ? 2 : 1);
    const summary = outcome === 'win'
      ? `Won ${finalWins} Bingo round${finalWins > 1 ? 's' : ''}!`
      : `AI won the match — ${finalWins} wins vs ${finalLosses} losses.`;
    onEnd({ score: finalWins * 150, stars, summary });
  }, [onEnd]);

  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { aiMarkedRef.current = aiMarked; }, [aiMarked]);
  useEffect(() => { aiCardRef.current = aiCard; }, [aiCard]);

  const startRound = useCallback(() => {
    poolRef.current = genPool();
    setPlayerCard(genCard());
    setAiCard(genCard());
    setPlayerMarked(emptyMarks());
    setAiMarked(emptyMarks());
    setCalled([]);
    setCurrentCall(null);
    setCalling(true);
    setGameOver(false);
    onMessage(winLabel(stage));
  }, [onMessage, stage]);

  useEffect(() => {
    startRound();
  }, []);

  // Online: reconcile called[] from server; stop local AI calling loop
  useEffect(() => {
    if (!isOnline || !multiplayerState) return;
    const bs = multiplayerState.boardState as { called?: number[] } | null | undefined;
    if (bs && Array.isArray(bs.called)) {
      setCalled(prev => {
        if (bs.called!.length === prev.length) return prev;
        return bs.called!;
      });
      if (bs.called.length > 0) {
        setCurrentCall(bs.called[bs.called.length - 1]);
      }
    }
    // Opponent won — end immediately
    if (multiplayerState.winner && multiplayerState.winner !== multiplayerState.playerNumber && !endedRef.current) {
      endedRef.current = true;
      onEnd({ score: 0, stars: 1, summary: 'Opponent got BINGO first.' });
    }
  }, [isOnline, multiplayerState, onEnd]);

  useEffect(() => {
    if (!calling || gameOverRef.current) return;
    if (isOnline && !isHost) return; // Non-host observes server call stream

    const timer = setTimeout(() => {
      const idx = called.length;
      const pool = poolRef.current;

      if (idx >= pool.length) {
        setCalling(false);
        onMessage('All numbers called! New round...');
        if (!isOnline) schedule(() => startRound(), 2000);
        return;
      }

      const num = pool[idx];
      setCurrentCall(num);
      const nextCalled = [...called, num];
      setCalled(nextCalled);
      setTotalCalled(prev => prev + 1);

      if (isOnline && onMultiplayerMove) {
        onMultiplayerMove({ boardState: { called: nextCalled } });
        return;
      }

      const chance = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.85 : 0.95;
      const nextAi = aiMarkedRef.current.map(r => [...r]);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (aiCardRef.current[r][c] === num && Math.random() < chance) {
            nextAi[r][c] = true;
          }
        }
      }
      setAiMarked(nextAi);

      if (checkWin(nextAi, stage)) {
        setGameOver(true);
        setCalling(false);
        const newLosses = lossesRef.current + 1;
        lossesRef.current = newLosses;
        setLosses(newLosses);
        if (newLosses >= MAX_LOSSES) {
          onMessage('AI won the match!');
          schedule(() => finishMatch('lose'), 1500);
        } else {
          onMessage(`AI got Bingo! (${newLosses}/${MAX_LOSSES}) New round...`);
          schedule(() => startRound(), 2500);
        }
      }
    }, callSpeed);

    return () => clearTimeout(timer);
  }, [calling, called, difficulty, callSpeed, stage, onMessage, startRound, isOnline, isHost, onMultiplayerMove]);

  const handleCellClick = (row: number, col: number) => {
    if (gameOver) return;
    const val = playerCard[row][col];
    if (val === 'FREE' || playerMarked[row][col]) return;
    if (!called.includes(val as number)) return;

    const next = playerMarked.map(r => [...r]);
    next[row][col] = true;
    setPlayerMarked(next);
    onScore(10);

    if (checkWin(next, stage)) {
      const newWins = winsRef.current + 1;
      winsRef.current = newWins;
      setRoundWins(newWins);
      setGameOver(true);
      setCalling(false);
      onScore(50);
      onProgress(newWins / targetWins);

      if (isOnline && onMultiplayerMove && multiplayerState) {
        onMultiplayerMove({ boardState: { called }, winner: multiplayerState.playerNumber });
        if (!endedRef.current) {
          endedRef.current = true;
          onEnd({ score: 150, stars: 3, summary: 'You got BINGO!' });
        }
        return;
      }

      if (newWins >= targetWins) {
        onMessage('BINGO! You won the match!');
        schedule(() => finishMatch('win'), 1000);
      } else {
        onMessage(`BINGO! Round ${newWins}/${targetWins} won!`);
        schedule(() => startRound(), 1500);
      }
    }
  };

  const lastCalled = called.slice(-8).reverse();
  const cs = 50;
  const hdrH = 34;
  const cardW = cs * 5;
  const cardH = hdrH + cs * 5;
  const aiScale = 0.72;
  const aiCs = cs * aiScale;
  const aiHdrH = hdrH * aiScale;

  return (
    <div className="h-full flex flex-col items-center gap-2 p-2 overflow-auto">
      <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
        <span className="bg-card rounded-lg px-3 py-1.5 text-accent font-bold">
          Round {roundWins + 1}/{targetWins}
        </span>
        <span className="bg-card rounded-lg px-3 py-1.5 text-text-muted text-xs">
          {winLabel(stage)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1 min-h-[32px] max-w-full">
        {called.length === 0 && (
          <span className="text-text-muted text-sm">Numbers starting soon...</span>
        )}
        {lastCalled.map((num, i) => {
          const ci = COL_RANGES.findIndex(([lo, hi]) => num >= lo && num <= hi);
          return (
            <span
              key={num}
              className={`rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                i === 0 ? 'bg-accent text-bg scale-110' : 'bg-card text-text-muted'
              }`}
            >
              {COL_LABELS[ci]}{num}
            </span>
          );
        })}
      </div>

      <div className="flex gap-4 items-start justify-center flex-wrap">
        <div className="flex flex-col items-center">
          <span className="text-xs text-text-muted mb-1 font-medium">Your Card</span>
          <svg width={cardW} height={cardH} className="rounded-xl overflow-hidden">
            {COL_LABELS.map((letter, c) => (
              <g key={`ph-${c}`}>
                <rect x={c * cs} y={0} width={cs} height={hdrH} fill="#6366f1" rx={c === 0 ? 8 : 0} />
                <text
                  x={c * cs + cs / 2}
                  y={hdrH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={16}
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  {letter}
                </text>
              </g>
            ))}
            {playerCard.map((row, r) =>
              row.map((cell, c) => {
                const x = c * cs;
                const y = hdrH + r * cs;
                const marked = playerMarked[r][c];
                const isFree = cell === 'FREE';
                const isCurrent = !isFree && cell === currentCall && !marked;
                const canClick = !gameOver && !isFree && !marked && called.includes(cell as number);

                return (
                  <g
                    key={`p-${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    style={{ cursor: canClick ? 'pointer' : 'default' }}
                  >
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={cs - 2}
                      height={cs - 2}
                      rx={4}
                      fill={marked ? (isFree ? '#6366f1' : '#818cf8') : isCurrent ? '#fbbf24' : canClick ? '#2d2566' : '#1e1b4b'}
                      stroke={isCurrent ? '#fbbf24' : canClick ? '#a5b4fc' : '#312e81'}
                      strokeWidth={canClick || isCurrent ? 2.5 : 1}
                    >
                      {isCurrent && <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite" />}
                    </rect>
                    {isFree ? (
                      <text
                        x={x + cs / 2}
                        y={y + cs / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={8}
                        fontWeight="bold"
                        fontFamily="system-ui"
                      >
                        FREE
                      </text>
                    ) : (
                      <text
                        x={x + cs / 2}
                        y={y + cs / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={marked ? 'white' : isCurrent ? '#1e1b4b' : '#c7d2fe'}
                        fontSize={16}
                        fontWeight="bold"
                        fontFamily="system-ui"
                      >
                        {cell}
                      </text>
                    )}
                    {marked && !isFree && (
                      <>
                        <circle
                          cx={x + cs / 2}
                          cy={y + cs / 2}
                          r={cs / 2 - 6}
                          fill="none"
                          stroke="#e0e7ff"
                          strokeWidth={2.5}
                          opacity={0.7}
                        />
                        <circle
                          cx={x + cs / 2}
                          cy={y + cs / 2}
                          r={3}
                          fill="#e0e7ff"
                          opacity={0.7}
                        />
                      </>
                    )}
                  </g>
                );
              })
            )}
          </svg>
        </div>

        {!isOnline && <div className="flex flex-col items-center">
          <span className="text-xs text-text-muted mb-1 font-medium">AI Opponent</span>
          <svg
            width={aiCs * 5}
            height={aiHdrH + aiCs * 5}
            className="rounded-xl overflow-hidden opacity-75"
          >
            {COL_LABELS.map((letter, c) => (
              <g key={`ah-${c}`}>
                <rect x={c * aiCs} y={0} width={aiCs} height={aiHdrH} fill="#4b5563" />
                <text
                  x={c * aiCs + aiCs / 2}
                  y={aiHdrH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={11}
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  {letter}
                </text>
              </g>
            ))}
            {aiCard.map((row, r) =>
              row.map((cell, c) => {
                const x = c * aiCs;
                const y = aiHdrH + r * aiCs;
                const marked = aiMarked[r][c];
                const isFree = cell === 'FREE';

                return (
                  <g key={`a-${r}-${c}`}>
                    <rect
                      x={x + 0.5}
                      y={y + 0.5}
                      width={aiCs - 1}
                      height={aiCs - 1}
                      rx={2}
                      fill={marked ? (isFree ? '#6366f1' : '#818cf8') : '#1f2937'}
                      stroke="#374151"
                      strokeWidth={1}
                    />
                    {marked && !isFree && (
                      <text
                        x={x + aiCs / 2}
                        y={y + aiCs / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={12}
                        fontWeight="bold"
                        fontFamily="system-ui"
                      >
                        {cell}
                      </text>
                    )}
                    {marked && isFree && (
                      <text
                        x={x + aiCs / 2}
                        y={y + aiCs / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={6}
                        fontWeight="bold"
                        fontFamily="system-ui"
                      >
                        FREE
                      </text>
                    )}
                    {!marked && !isFree && (
                      <text
                        x={x + aiCs / 2}
                        y={y + aiCs / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#6b7280"
                        fontSize={12}
                        fontFamily="system-ui"
                      >
                        ?
                      </text>
                    )}
                  </g>
                );
              })
            )}
          </svg>
          <span className="text-[10px] text-text-muted mt-1 opacity-60">
            {countLines(aiMarked)} line{countLines(aiMarked) !== 1 ? 's' : ''}
          </span>
        </div>}
        {isOnline && (
          <div className="flex flex-col items-center justify-center text-xs text-text-muted opacity-70 px-4">
            <span className="font-medium">{multiplayerState?.opponentName || 'Opponent'}</span>
            <span className="mt-1">Playing...</span>
          </div>
        )}
      </div>

      {called.length > 0 && (
        <span className="text-xs text-text-muted opacity-60">
          {called.length} number{called.length !== 1 ? 's' : ''} called
        </span>
      )}
    </div>
  );
}

export default BingoGame;
