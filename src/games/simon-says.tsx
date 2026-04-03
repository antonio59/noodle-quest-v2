import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'showing' | 'playing' | 'feedback' | 'done';

const TIPS = [
  "💡 Tip: Read the WHOLE sentence — does it start with 'Simon says'?",
  "💡 Tip: If it says just 'Jump!' without 'Simon says' — DON'T do it!",
  "💡 Tip: The trick commands get more frequent at higher stages!",
  "💡 Tip: Show time gets shorter — read fast but carefully!",
  "💡 Tip: When in doubt, wait a second to check if Simon said it!",
];

const COMMANDS = [
  { text: 'Touch your nose! 👃', action: 'nose', icon: '👃' },
  { text: 'Jump up! 🦘', action: 'jump', icon: '🦘' },
  { text: 'Clap your hands! 👏', action: 'clap', icon: '👏' },
  { text: 'Wave hello! 👋', action: 'wave', icon: '👋' },
  { text: 'Spin around! 🌀', action: 'spin', icon: '🌀' },
  { text: 'Stand on one leg! 🦩', action: 'leg', icon: '🦩' },
  { text: 'Touch your toes! 🦶', action: 'toes', icon: '🦶' },
  { text: 'Stretch up high! 🙆', action: 'stretch', icon: '🙆' },
  { text: 'Wiggle your fingers! 🖐️', action: 'wiggle', icon: '🖐️' },
  { text: 'Pat your head! 🤚', action: 'pat', icon: '🤚' },
  { text: 'Do a thumbs up! 👍', action: 'thumbs', icon: '👍' },
  { text: 'Make a silly face! 🤪', action: 'face', icon: '🤪' },
];

const CONFIG: Record<number, { timeLimit: number; rounds: number; trickChance: number; showTime: number }> = {
  1: { timeLimit: 60, rounds: 8, trickChance: 0.15, showTime: 3000 },
  2: { timeLimit: 55, rounds: 8, trickChance: 0.18, showTime: 2800 },
  3: { timeLimit: 52, rounds: 10, trickChance: 0.2, showTime: 2600 },
  4: { timeLimit: 50, rounds: 10, trickChance: 0.22, showTime: 2500 },
  5: { timeLimit: 48, rounds: 10, trickChance: 0.25, showTime: 2400 },
  6: { timeLimit: 45, rounds: 12, trickChance: 0.28, showTime: 2300 },
  7: { timeLimit: 43, rounds: 12, trickChance: 0.3, showTime: 2200 },
  8: { timeLimit: 40, rounds: 12, trickChance: 0.32, showTime: 2100 },
  9: { timeLimit: 38, rounds: 14, trickChance: 0.35, showTime: 2000 },
  10: { timeLimit: 36, rounds: 14, trickChance: 0.35, showTime: 1900 },
  11: { timeLimit: 34, rounds: 14, trickChance: 0.38, showTime: 1800 },
  12: { timeLimit: 32, rounds: 16, trickChance: 0.38, showTime: 1700 },
  13: { timeLimit: 30, rounds: 16, trickChance: 0.4, showTime: 1600 },
  14: { timeLimit: 28, rounds: 16, trickChance: 0.4, showTime: 1500 },
  15: { timeLimit: 26, rounds: 18, trickChance: 0.42, showTime: 1400 },
  16: { timeLimit: 25, rounds: 18, trickChance: 0.42, showTime: 1300 },
  17: { timeLimit: 23, rounds: 20, trickChance: 0.45, showTime: 1200 },
  18: { timeLimit: 22, rounds: 20, trickChance: 0.45, showTime: 1100 },
  19: { timeLimit: 20, rounds: 22, trickChance: 0.48, showTime: 1000 },
  20: { timeLimit: 18, rounds: 22, trickChance: 0.5, showTime: 900 },
};

function SimonSaysGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [currentCommand, setCurrentCommand] = useState('');
  const [currentIcon, setCurrentIcon] = useState('');
  const [isSimonSays, setIsSimonSays] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [headerColor, setHeaderColor] = useState('#4ade80');
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateCommand = useCallback(() => {
    const cmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    const simonSays = Math.random() > config.trickChance;

    setIsSimonSays(simonSays);
    setCurrentCommand(simonSays ? `Simon says: ${cmd.text}` : cmd.text);
    setCurrentIcon(cmd.icon);
    setHeaderColor(simonSays ? '#4ade80' : '#ff6e6c');
    setPhase('showing');
    setFeedback('');

    showTimerRef.current = setTimeout(() => {
      if (!gameActiveRef.current) return;
      setPhase('playing');
    }, config.showTime);
  }, [config]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setCorrectCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    generateCommand();
  }, [config, generateCommand]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'showing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          if (showTimerRef.current) clearTimeout(showTimerRef.current);
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          onEnd({ score: scoreRef.current, stars, summary: `Time's up! ${correctRef.current}/${roundRef.current - 1} correct. Only do it when Simon says!` });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onEnd]);

  const advanceRound = useCallback(() => {
    setTimeout(() => {
      if (!gameActiveRef.current) return;
      roundRef.current++;
      setRound(roundRef.current);
      onProgress(roundRef.current / config.rounds);

      if (roundRef.current > config.rounds) {
        gameActiveRef.current = false;
        const accuracy = correctRef.current / config.rounds;
        const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
        const summary = accuracy > 0.8
          ? `Simon Says master! ${correctRef.current}/${config.rounds} correct! Amazing self-control! 🎯`
          : `You got ${correctRef.current}/${config.rounds}. Remember: only act when "Simon says"!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        generateCommand();
      }
    }, 1000);
  }, [config, onProgress, onEnd, generateCommand]);

  const handleDoIt = useCallback(() => {
    if (phase !== 'playing' || !gameActiveRef.current) return;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);

    if (isSimonSays) {
      const points = 20 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! Simon said it! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback('❌ Simon didn\'t say! Don\'t do it!');
      setFeedbackColor('#ff6e6c');
    }

    setPhase('feedback');
    advanceRound();
  }, [phase, isSimonSays, timeLeft, onScore, advanceRound]);

  const handleSkip = useCallback(() => {
    if (phase !== 'playing' || !gameActiveRef.current) return;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);

    if (!isSimonSays) {
      const points = 15 + Math.floor(timeLeft / 3);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Good catch! Simon didn't say! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback('❌ Simon said it! You should have done it!');
      setFeedbackColor('#ff6e6c');
    }

    setPhase('feedback');
    advanceRound();
  }, [phase, isSimonSays, timeLeft, onScore, advanceRound]);

  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Simon Says</h2>
        <p className="text-text-dim mb-4 max-w-xs">Only do it when Simon says! Can you resist the tricks?</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-success text-sm mb-1">"Simon says jump!" → Do it! ✅</div>
          <div className="text-danger text-sm mb-2">"Jump!" → Don't do it! ❌</div>
          <div className="text-warning">{config.rounds} rounds - ⏱️ {config.timeLimit}s</div>
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Game! 🎯
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-card rounded-xl mb-4 w-full justify-center">
        <span className="text-accent font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-success">✅ {correctCount}</span>
        <span className="text-primary">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-warning'}`}>⏱️ {timeLeft}</span>
      </div>

      <div className="text-7xl mb-4">{currentIcon}</div>

      <div
        className="text-xl font-bold mb-6 text-center max-w-xs transition-colors"
        style={{ color: headerColor }}
      >
        {currentCommand}
      </div>

      {(phase === 'playing') && (
        <div className="flex gap-4">
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleDoIt(); }}
            className="bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-4 rounded-xl text-lg active:scale-90 transition-all"
          >
            Do it! ✅
          </button>
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleSkip(); }}
            className="bg-red-500 hover:bg-red-400 text-white font-bold px-8 py-4 rounded-xl text-lg active:scale-90 transition-all"
          >
            Don't! ❌
          </button>
        </div>
      )}

      {phase === 'showing' && (
        <div className="text-text-muted text-sm animate-pulse">Read carefully...</div>
      )}

      <div className="text-lg font-bold min-h-[28px] mt-5 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('simon-says', {
  name: 'Simon Says',
  emoji: '🎯',
  description: 'Only act when Simon says! Test your self-control!',
  category: 'focus',
  stages: 20,
  component: SimonSaysGame,
});

export default SimonSaysGame;
