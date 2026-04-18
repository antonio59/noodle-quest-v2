import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

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
};

type Phase = 'memorize' | 'input' | 'result' | 'done';

function NumberNinjaGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];

  const [phase, setPhase] = useState<Phase>('memorize');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#a78bfa');
  const [message, setMessage] = useState('🧠 Memorize!');
  const [messageColor, setMessageColor] = useState('#67e8f9');
  const [displayColor, setDisplayColor] = useState('#ff6e6c');
  const [timeLeft, setTimeLeft] = useState(0);
  const [memorizeDuration, setMemorizeDuration] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

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

  const generateSequence = useCallback((roundNum: number) => {
    const baseLen = config.minLen + Math.floor(roundNum / 2);
    const len = Math.min(config.maxLen, baseLen + Math.floor(Math.random() * 2));
    return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
  }, [config]);

  const showNextSequence = useCallback(() => {
    const seq = generateSequence(round);
    setSequence(seq);
    setInputValue('');
    setDisplayColor('#ff6e6c');
    setMessage('🧠 Memorize!');
    setMessageColor('#67e8f9');
    setFeedback(`${seq.length} digits — group them in pairs!`);
    setFeedbackColor('#a78bfa');
    setPhase('memorize');

    const showDuration = config.showTime + (round * 150);
    setMemorizeDuration(showDuration);
    setTimeLeft(showDuration);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 50;
        if (next <= 0) {
          clearInterval(timer);
          intervalsRef.current = intervalsRef.current.filter(x => x !== timer);
          return 0;
        }
        return next;
      });
    }, 50);
    intervalsRef.current.push(timer);

    schedule(() => {
      clearInterval(timer);
      intervalsRef.current = intervalsRef.current.filter(x => x !== timer);
      setPhase('input');
      setDisplayColor('#6b7280');
      setMessage('⌨️ Type the numbers!');
      setMessageColor('#4ade80');
      setFeedback('');
      schedule(() => inputRef.current?.focus(), 50);
    }, showDuration);
  }, [round, generateSequence, config.showTime, schedule]);

  const startGame = useCallback(() => {
    setScore(0);
    setRound(1);
    setPhase('memorize');
    schedule(showNextSequence, 600);
  }, [showNextSequence, schedule]);

  const didStartRef = useRef(false);
  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    startGame();
  }, [startGame]);

  // Reset sequence when round changes during gameplay
  useEffect(() => {
    if (phase !== 'done' && round > 1) {
      showNextSequence();
    }
  }, [round]);

  const checkAnswer = useCallback(() => {
    if (phase === 'done') return;
    const answer = inputValue.trim();
    setDisplayColor('#ff6e6c');

    if (answer === sequence) {
      const points = 20 + (sequence.length * 5);
      const newScore = score + points;
      setScore(newScore);
      onScore(points);
      setDisplayColor('#4ade80');
      setMessage('✅ Correct!');
      setMessageColor('#4ade80');
      setFeedback(`+${points} points!`);
      setFeedbackColor('#4ade80');

      if (round >= config.maxRounds) {
        schedule(() => {
          setPhase('done');
          const ratio = round / config.maxRounds;
          const stars = ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
          if (endedRef.current) return;
          endedRef.current = true;
          onEnd({
            score: newScore + 50,
            stars,
            summary: `Number Ninja Master! You completed all ${config.maxRounds} rounds! Your number memory is incredible! 🏆`,
          });
        }, 1200);
      } else {
        onProgress(round / config.maxRounds);
        schedule(() => setRound(r => r + 1), 1500);
      }
    } else {
      setDisplayColor('#ff6e6c');
      setMessage('❌ Not quite!');
      setMessageColor('#ff6e6c');

      let wrongIdx = -1;
      for (let i = 0; i < Math.max(answer.length, sequence.length); i++) {
        if (answer[i] !== sequence[i]) {
          wrongIdx = i;
          break;
        }
      }

      if (wrongIdx >= 0) {
        setFeedback(`Mistake at position ${wrongIdx + 1}. You typed "${answer[wrongIdx] || '?'}" instead of "${sequence[wrongIdx]}"`);
      } else {
        setFeedback(`The sequence was: ${sequence}`);
      }
      setFeedbackColor('#ff6e6c');

      schedule(() => {
        setPhase('done');
        const ratio = round / config.maxRounds;
        const stars = ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
        let summary = `You made it to round ${round}! `;
        if (stars === 3) summary += 'So close to perfect! Your number memory is great!';
        else if (stars === 2) summary += 'Good effort! Try grouping numbers in pairs to remember better.';
        else summary += 'Keep practicing! Say the numbers out loud as you memorize.';
        if (endedRef.current) return;
        endedRef.current = true;
        onEnd({ score, stars, summary });
      }, 2500);
    }
  }, [phase, inputValue, sequence, score, round, config, onScore, onProgress, onEnd, schedule]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') checkAnswer();
  }, [checkAnswer]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="flex gap-4 mb-4 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round: {round}/{config.maxRounds}</span>
        <span className="text-accent">Score: {score}</span>
      </div>

      <div
        className="text-4xl font-bold font-mono mb-4 tracking-widest min-h-[4.5rem] flex items-center justify-center"
        style={{ color: displayColor }}
      >
        {phase === 'memorize' && sequence.split('').join(' ')}
        {(phase === 'input' || phase === 'result') && '? '.repeat(sequence.length).trim()}
      </div>

      {phase === 'memorize' && memorizeDuration > 0 && (
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="w-32 h-1.5 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / memorizeDuration) * 100))}%` }}
            />
          </div>
          <span className="text-text-muted text-xs">Memorize quickly!</span>
        </div>
      )}

      {phase === 'input' && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type numbers..."
            className="w-full px-4 py-3 text-2xl text-center bg-card border-2 border-accent rounded-xl text-white font-mono tracking-wider"
          />
          <button
            onClick={checkAnswer}
            className="bg-success text-bg font-bold px-8 py-3 rounded-xl hover:opacity-90 active:scale-95"
          >
            Submit! ✓
          </button>
        </div>
      )}

      <div
        className="text-lg mt-3 min-h-[28px] text-center"
        style={{ color: messageColor }}
      >
        {message}
      </div>
      {feedback && (
        <div
          className="text-sm mt-1 min-h-[22px]"
          style={{ color: feedbackColor }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

export default NumberNinjaGame;
