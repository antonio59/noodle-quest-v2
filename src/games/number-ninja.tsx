import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'showing' | 'input' | 'result' | 'done';

const CONFIG: Record<number, { minLen: number; maxLen: number; showTime: number; maxRounds: number }> = {
  1: { minLen: 2, maxLen: 3, showTime: 2500, maxRounds: 4 },
  2: { minLen: 3, maxLen: 4, showTime: 2300, maxRounds: 4 },
  3: { minLen: 3, maxLen: 4, showTime: 2100, maxRounds: 5 },
  4: { minLen: 4, maxLen: 5, showTime: 2000, maxRounds: 5 },
  5: { minLen: 4, maxLen: 6, showTime: 2500, maxRounds: 5 },
  6: { minLen: 5, maxLen: 6, showTime: 2500, maxRounds: 5 },
  7: { minLen: 5, maxLen: 7, showTime: 3000, maxRounds: 5 },
  8: { minLen: 6, maxLen: 8, showTime: 3500, maxRounds: 5 },
  9: { minLen: 7, maxLen: 9, showTime: 4000, maxRounds: 5 },
  10: { minLen: 8, maxLen: 10, showTime: 4500, maxRounds: 5 },
  11: { minLen: 9, maxLen: 11, showTime: 5000, maxRounds: 5 },
  12: { minLen: 9, maxLen: 12, showTime: 5500, maxRounds: 6 },
  13: { minLen: 10, maxLen: 13, showTime: 6000, maxRounds: 6 },
  14: { minLen: 10, maxLen: 14, showTime: 6500, maxRounds: 6 },
  15: { minLen: 11, maxLen: 15, showTime: 7000, maxRounds: 7 },
  16: { minLen: 12, maxLen: 16, showTime: 7500, maxRounds: 7 },
  17: { minLen: 12, maxLen: 17, showTime: 8000, maxRounds: 7 },
  18: { minLen: 13, maxLen: 18, showTime: 8500, maxRounds: 8 },
  19: { minLen: 14, maxLen: 19, showTime: 9000, maxRounds: 8 },
  20: { minLen: 15, maxLen: 20, showTime: 10000, maxRounds: 8 },
};

const TIPS = [
  "💡 Tip: Group numbers in pairs: '42-87-31' is easier than '428731'!",
  "💡 Tip: Say the numbers OUT LOUD while memorizing — hearing helps!",
  "💡 Tip: Create a rhythm: 'four-two, eight-seven, three-one'.",
  "💡 Tip: Visualize the numbers on a phone keypad position.",
  "💡 Tip: Each round adds more digits. Focus on the NEW ones!",
];

function generateSequence(minLen: number, maxLen: number): string {
  const baseLen = minLen;
  const len = Math.min(maxLen, baseLen + Math.floor(Math.random() * 2));
  let seq = '';
  for (let i = 0; i < len; i++) {
    seq += Math.floor(Math.random() * 10);
  }
  return seq;
}

function NumberNinjaGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [currentSequence, setCurrentSequence] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [displayColor, setDisplayColor] = useState('#ff6e6c');
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');
  const [messageColor, setMessageColor] = useState('#67e8f9');
  const [feedback, setFeedback] = useState('');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runRound = useCallback(
    (r: number) => {
      if (!gameActiveRef.current) return;

      const seq = generateSequence(config.minLen, config.maxLen);
      setCurrentSequence(seq);
      const formatted = seq.split('').join(' ');
      setDisplayText(formatted);
      setDisplayColor('#ff6e6c');
      setInputValue('');
      setPhase('showing');
      setMessage('🧠 Memorize!');
      setMessageColor('#67e8f9');
      setFeedback(`${seq.length} digits — group them in pairs!`);

      const showDuration = config.showTime + (r * 150);
      showTimerRef.current = setTimeout(() => {
        if (!gameActiveRef.current) return;
        setDisplayText('? '.repeat(seq.length).trim());
        setDisplayColor('#6b7280');
        setPhase('input');
        setMessage('⌨️ Type the numbers!');
        setMessageColor('#4ade80');
        setFeedback('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }, showDuration);
    },
    [config]
  );

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setRound(1);
    setPhase('showing');
    runRound(1);
  }, [runRound]);

  const checkAnswer = useCallback(() => {
    if (phase !== 'input') return;

    // Clear any pending show timer so it doesn't overwrite result display
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    const answer = inputValue.trim();
    setDisplayColor('#ff6e6c');

    if (answer === currentSequence) {
      const points = 20 + currentSequence.length * 5;
      scoreRef.current += points;
      setScore(scoreRef.current);
      onScore(points);
      setDisplayText(currentSequence.split('').join(' '));
      setDisplayColor('#4ade80');
      setMessage('✅ Correct!');
      setMessageColor('#4ade80');
      setFeedback(`+${points} points!`);

      if (roundRef.current >= config.maxRounds) {
        setTimeout(() => {
          gameActiveRef.current = false;
          const stars = scoreRef.current > 200 ? 3 : scoreRef.current > 100 ? 2 : 1;
          onEnd({
            score: scoreRef.current + 50,
            stars,
            summary: `Number Ninja Master! You completed all ${config.maxRounds} rounds! Your number memory is incredible! 🏆`,
          });
        }, 1200);
      } else {
        roundRef.current++;
        setRound(roundRef.current);
        onProgress((roundRef.current - 1) / config.maxRounds);
        setTimeout(() => runRound(roundRef.current), 1500);
      }
    } else {
      setDisplayText(currentSequence.split('').join(' '));
      setMessage('❌ Not quite!');
      setMessageColor('#ff6e6c');

      let wrongIdx = -1;
      for (let i = 0; i < Math.max(answer.length, currentSequence.length); i++) {
        if (answer[i] !== currentSequence[i]) {
          wrongIdx = i;
          break;
        }
      }

      if (wrongIdx >= 0) {
        setFeedback(
          `Mistake at position ${wrongIdx + 1}. You typed "${answer[wrongIdx] || '?'}" instead of "${currentSequence[wrongIdx]}"`
        );
      } else {
        setFeedback(`The sequence was: ${currentSequence}`);
      }

      setTimeout(() => {
        gameActiveRef.current = false;
        const stars =
          roundRef.current > Math.floor(config.maxRounds * 0.7)
            ? 3
            : roundRef.current > Math.floor(config.maxRounds * 0.4)
              ? 2
              : 1;
        let summary = `You made it to round ${roundRef.current}! `;
        if (stars === 3) {
          summary += 'So close to perfect! Your number memory is great!';
        } else if (stars === 2) {
          summary += 'Good effort! Try grouping numbers in pairs to remember better.';
        } else {
          summary += 'Keep practicing! Say the numbers out loud as you memorize.';
        }
        onEnd({ score: scoreRef.current, stars, summary });
      }, 2500);
    }
  }, [phase, inputValue, currentSequence, config, onScore, onProgress, onEnd]);

  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔢</div>
        <h2 className="text-2xl font-bold text-red-400 mb-2">Number Ninja</h2>
        <p className="text-red-300 mb-4 max-w-xs">Memorize numbers, then type them back!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl text-red-400 font-mono mb-2">4 2 8 7 ?</div>
          <div className="text-cyan-300">Starting with {config.minLen}-{config.maxLen} digits</div>
          <div className="text-yellow-400 mt-1">{config.maxRounds} rounds to beat!</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-green-400 text-sm">👀 See → 🧠 Remember → ⌨️ Type!</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🥷
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-4">
        <span className="text-yellow-400 font-bold">Round: {round}/{config.maxRounds}</span>
        <span className="text-purple-400">Score: {score}</span>
      </div>

      <div
        className="text-5xl font-bold tracking-widest min-h-[4.5rem] flex items-center justify-center font-mono"
        style={{ color: displayColor }}
      >
        {displayText}
      </div>

      {phase === 'input' && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mt-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') checkAnswer();
            }}
            className="w-full py-3.5 text-3xl text-center bg-[#232146] border-[3px] border-purple-400 rounded-xl text-white font-mono tracking-widest outline-none"
            placeholder="Type numbers..."
          />
          <button
            onClick={checkAnswer}
            className="bg-green-400 hover:bg-green-300 text-black font-bold px-8 py-3 rounded-xl active:scale-95 transition-transform"
          >
            Submit! ✓
          </button>
        </div>
      )}

      <div className="text-cyan-300 text-lg min-h-[28px] mt-3 text-center" style={{ color: messageColor }}>
        {message}
      </div>
      <div className="text-purple-300 text-sm min-h-[22px] mt-1">{feedback}</div>
    </div>
  );
}

registerGame('number-ninja', {
  name: 'Number Ninja',
  emoji: '🔢',
  description: 'Memorize the numbers, then type them back!',
  category: 'memory',
  stages: 20,
  component: NumberNinjaGame,
});

export default NumberNinjaGame;
