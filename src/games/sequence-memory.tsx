import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'showing' | 'input' | 'feedback' | 'done';

const CONFIG: Record<number, { seqLen: number; showTime: number; rounds: number; numRange: [number, number] }> = {
  1: { seqLen: 2, showTime: 2000, rounds: 5, numRange: [1, 5] },
  2: { seqLen: 3, showTime: 2000, rounds: 5, numRange: [1, 5] },
  3: { seqLen: 3, showTime: 1800, rounds: 6, numRange: [1, 6] },
  4: { seqLen: 4, showTime: 2000, rounds: 6, numRange: [1, 6] },
  5: { seqLen: 4, showTime: 1800, rounds: 6, numRange: [1, 7] },
  6: { seqLen: 5, showTime: 2000, rounds: 7, numRange: [1, 7] },
  7: { seqLen: 5, showTime: 1800, rounds: 7, numRange: [1, 8] },
  8: { seqLen: 6, showTime: 2200, rounds: 7, numRange: [1, 8] },
  9: { seqLen: 6, showTime: 2000, rounds: 8, numRange: [1, 9] },
  10: { seqLen: 7, showTime: 2200, rounds: 8, numRange: [1, 9] },
  11: { seqLen: 7, showTime: 2000, rounds: 8, numRange: [1, 9] },
  12: { seqLen: 8, showTime: 2400, rounds: 8, numRange: [1, 9] },
  13: { seqLen: 8, showTime: 2200, rounds: 9, numRange: [1, 9] },
  14: { seqLen: 9, showTime: 2500, rounds: 9, numRange: [1, 9] },
  15: { seqLen: 9, showTime: 2200, rounds: 9, numRange: [0, 9] },
  16: { seqLen: 10, showTime: 2500, rounds: 10, numRange: [0, 9] },
  17: { seqLen: 10, showTime: 2200, rounds: 10, numRange: [0, 9] },
  18: { seqLen: 11, showTime: 2500, rounds: 10, numRange: [0, 9] },
  19: { seqLen: 12, showTime: 2800, rounds: 10, numRange: [0, 9] },
  20: { seqLen: 12, showTime: 2500, rounds: 12, numRange: [0, 9] },
};

const TIPS = [
  "💡 Tip: Tap along with the sequence as it's shown — muscle memory helps!",
  "💡 Tip: Break long sequences into chunks of 3-4 numbers.",
  "💡 Tip: Say the numbers out loud as you repeat them!",
  "💡 Tip: Focus on the rhythm of the sequence, not just the numbers.",
  "💡 Tip: Visualize the numbers on a phone keypad as you memorize.",
];

const NUMBER_COLORS = ['#ff6e6c', '#f59e0b', '#4ade80', '#67e8f9', '#c084fc', '#f472b6', '#fb923c', '#a3e635', '#38bdf8', '#e879f9'];

function generateSequence(len: number, range: [number, number]): number[] {
  const seq: number[] = [];
  for (let i = 0; i < len; i++) {
    seq.push(Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
  }
  return seq;
}

function SequenceMemoryGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [showIdx, setShowIdx] = useState(-1);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const sequenceRef = useRef<number[]>([]);

  const runRound = useCallback((r: number) => {
    if (!gameActiveRef.current) return;
    const seq = generateSequence(config.seqLen, config.numRange);
    sequenceRef.current = seq;
    setSequence(seq);
    setPlayerInput([]);
    setPhase('showing');
    setFeedback(`Watch ${config.seqLen} numbers...`);
    setFeedbackColor('#67e8f9');

    let idx = 0;
    setShowIdx(-1);
    const showInterval = setInterval(() => {
      if (idx >= seq.length) {
        clearInterval(showInterval);
        setShowIdx(-1);
        setPhase('input');
        setFeedback('Your turn! Repeat the sequence');
        setFeedbackColor('#4ade80');
        return;
      }
      setShowIdx(idx);
      idx++;
    }, config.showTime / seq.length);
  }, [config]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setRound(1);
    setFeedback('');
    runRound(1);
  }, [runRound]);

  const handleNumberTap = useCallback((num: number) => {
    if (phase !== 'input' || !gameActiveRef.current) return;

    const newInput = [...playerInput, num];
    setPlayerInput(newInput);

    const idx = newInput.length - 1;
    if (newInput[idx] !== sequenceRef.current[idx]) {
      setPhase('feedback');
      setFeedback(`❌ Wrong! The sequence was: ${sequenceRef.current.join(', ')}`);
      setFeedbackColor('#ff6e6c');
      gameActiveRef.current = false;

      const accuracy = idx / sequenceRef.current.length;
      const stars = accuracy > 0.6 ? 2 : 1;
      const summary = `You got ${idx}/${sequenceRef.current.length} in round ${roundRef.current}. Try tapping along as numbers are shown!`;
      setTimeout(() => onEnd({ score: scoreRef.current, stars, summary }), 2000);
      return;
    }

    if (newInput.length === sequenceRef.current.length) {
      const points = 20 + config.seqLen * 5;
      scoreRef.current += points;
      setScore(scoreRef.current);
      onScore(points);
      setPhase('feedback');
      setFeedback(`✅ Perfect! +${points} points!`);
      setFeedbackColor('#4ade80');

      setTimeout(() => {
        if (!gameActiveRef.current) return;
        roundRef.current++;
        setRound(roundRef.current);
        onProgress(roundRef.current / config.rounds);

        if (roundRef.current > config.rounds) {
          gameActiveRef.current = false;
          const stars = scoreRef.current > 300 ? 3 : scoreRef.current > 150 ? 2 : 1;
          const summary = `All ${config.rounds} rounds complete! Your sequence memory is incredible! 🏆 Score: ${scoreRef.current}`;
          onEnd({ score: scoreRef.current, stars, summary });
        } else {
          runRound(roundRef.current);
        }
      }, 1000);
    }
  }, [phase, playerInput, config, onScore, onProgress, onEnd, runRound]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔁</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">Sequence Memory</h2>
        <p className="text-green-300 mb-4 max-w-xs">Watch the numbers, then repeat them back!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl text-green-400 mb-2">{config.seqLen} numbers to remember</div>
          <div className="text-cyan-300">{config.rounds} rounds</div>
          <div className="text-yellow-400 mt-1">Numbers {config.numRange[0]}-{config.numRange[1]}</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🔁
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-4 w-full justify-center">
        <span className="text-green-400 font-bold">Round: {round}/{config.rounds}</span>
        <span className="text-purple-400">Score: {score}</span>
      </div>

      <div className="flex gap-2 mb-6 min-h-[3rem] items-center justify-center flex-wrap">
        {phase === 'showing' ? (
          sequence.map((num, idx) => (
            <div
              key={idx}
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all"
              style={{
                background: idx === showIdx ? NUMBER_COLORS[num] : '#232146',
                color: idx === showIdx ? '#fff' : '#6b7280',
                transform: idx === showIdx ? 'scale(1.2)' : 'scale(1)',
                boxShadow: idx === showIdx ? `0 0 20px ${NUMBER_COLORS[num]}` : 'none',
              }}
            >
              {idx < showIdx ? num : idx === showIdx ? num : '?'}
            </div>
          ))
        ) : phase === 'input' ? (
          <>
            {playerInput.map((num, idx) => (
              <div
                key={idx}
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{ background: NUMBER_COLORS[num], color: '#fff' }}
              >
                {num}
              </div>
            ))}
            {Array.from({ length: config.seqLen - playerInput.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-2xl font-bold bg-[#232146] text-gray-600"
              >
                ?
              </div>
            ))}
          </>
        ) : (
          <div className="text-2xl font-bold" style={{ color: feedbackColor }}>{feedback}</div>
        )}
      </div>

      {phase === 'input' && (
        <div className="grid grid-cols-5 gap-2 w-full max-w-xs">
          {Array.from({ length: config.numRange[1] - config.numRange[0] + 1 }).map((_, idx) => {
            const num = idx + config.numRange[0];
            return (
              <button
                key={num}
                onPointerDown={(e) => { e.stopPropagation(); handleNumberTap(num); }}
                className="w-full aspect-square rounded-xl font-bold text-xl active:scale-90 transition-transform min-h-[50px]"
                style={{ background: NUMBER_COLORS[num], color: '#fff' }}
              >
                {num}
              </button>
            );
          })}
        </div>
      )}

      <div className="text-lg min-h-[28px] mt-4 text-center" style={{ color: feedbackColor }}>
        {phase !== 'feedback' ? feedback : ''}
      </div>
    </div>
  );
}

registerGame('sequence-memory', {
  name: 'Sequence Memory',
  emoji: '🔁',
  description: 'Watch the number sequence and repeat it back!',
  category: 'memory',
  stages: 20,
  component: SequenceMemoryGame,
});

export default SequenceMemoryGame;
