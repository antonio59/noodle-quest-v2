import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

interface Puzzle {
  emojis: string;
  answer: string;
  options: string[];
  category: string;
}

const TIPS = [
  "💡 Tip: Read each emoji as a word or concept — then combine them!",
  "💡 Tip: Think about popular movies, shows, or phrases the emojis could represent.",
  "💡 Tip: The category hint tells you what type of answer to expect!",
  "💡 Tip: Don't overthink it — the answer is usually the most obvious one!",
  "💡 Tip: Timer gets shorter each stage — answer quickly for bonus points!",
];

const PUZZLE_BANK: Puzzle[] = [
  { emojis: '🌊🏄', answer: 'Surfing', options: ['Surfing', 'Swimming', 'Fishing', 'Diving'], category: 'Sport' },
  { emojis: '🍕🇮🇹', answer: 'Pizza', options: ['Pizza', 'Pasta', 'Gelato', 'Bread'], category: 'Food' },
  { emojis: '🦸‍♂️🕷️', answer: 'Spider-Man', options: ['Spider-Man', 'Batman', 'Superman', 'Iron Man'], category: 'Movie' },
  { emojis: '❄️👸', answer: 'Frozen', options: ['Frozen', 'Ice Age', 'Snow White', 'Cinderella'], category: 'Movie' },
  { emojis: '🦁👑', answer: 'Lion King', options: ['Lion King', 'Tarzan', 'Jungle Book', 'Madagascar'], category: 'Movie' },
  { emojis: '🧙‍♂️⚡', answer: 'Harry Potter', options: ['Harry Potter', 'Lord of the Rings', 'Merlin', 'Doctor Strange'], category: 'Movie' },
  { emojis: '🎃👻', answer: 'Halloween', options: ['Halloween', 'Christmas', 'Easter', 'Birthday'], category: 'Holiday' },
  { emojis: '🎄🎅', answer: 'Christmas', options: ['Christmas', 'New Year', 'Easter', 'Thanksgiving'], category: 'Holiday' },
  { emojis: '🌈☁️', answer: 'Rainbow', options: ['Rainbow', 'Sunset', 'Storm', 'Cloud'], category: 'Nature' },
  { emojis: '🎂🎈', answer: 'Birthday', options: ['Birthday', 'Wedding', 'Party', 'Carnival'], category: 'Event' },
  { emojis: '🏠🔑', answer: 'Home', options: ['Home', 'School', 'Hotel', 'Shop'], category: 'Place' },
  { emojis: '📚🎓', answer: 'School', options: ['School', 'Library', 'Office', 'Museum'], category: 'Place' },
  { emojis: '🎵🎤', answer: 'Singing', options: ['Singing', 'Dancing', 'Playing', 'Listening'], category: 'Activity' },
  { emojis: '🌙⭐', answer: 'Night Sky', options: ['Night Sky', 'Space', 'Universe', 'Twilight'], category: 'Nature' },
  { emojis: '🏖️☀️', answer: 'Beach', options: ['Beach', 'Desert', 'Park', 'Garden'], category: 'Place' },
  { emojis: '🚀🌙', answer: 'Moon Landing', options: ['Moon Landing', 'Star Trek', 'Space Walk', 'Rocket Launch'], category: 'Event' },
  { emojis: '🐠🌊', answer: 'Finding Nemo', options: ['Finding Nemo', 'Shark Tale', 'Moana', 'Aquaman'], category: 'Movie' },
  { emojis: '🤖👦', answer: 'Wall-E', options: ['Wall-E', 'Transformers', 'Big Hero 6', 'Iron Giant'], category: 'Movie' },
  { emojis: '🧸🍯', answer: 'Winnie the Pooh', options: ['Winnie the Pooh', 'Paddington', 'Teddy Bear', 'Goldilocks'], category: 'Character' },
  { emojis: '🎹🎶', answer: 'Piano', options: ['Piano', 'Guitar', 'Orchestra', 'Concert'], category: 'Music' },
  { emojis: '⚽🏟️', answer: 'Football', options: ['Football', 'Rugby', 'Baseball', 'Cricket'], category: 'Sport' },
  { emojis: '🧊⛸️', answer: 'Ice Skating', options: ['Ice Skating', 'Hockey', 'Skiing', 'Snowboarding'], category: 'Sport' },
  { emojis: '🦇🌃', answer: 'Batman', options: ['Batman', 'Dracula', 'Spider-Man', 'Night Owl'], category: 'Character' },
  { emojis: '🐉🔥', answer: 'Dragon', options: ['Dragon', 'Phoenix', 'Dinosaur', 'Volcano'], category: 'Fantasy' },
  { emojis: '👩‍🍳🍳', answer: 'Cooking', options: ['Cooking', 'Baking', 'Eating', 'Shopping'], category: 'Activity' },
  { emojis: '🎨🖌️', answer: 'Painting', options: ['Painting', 'Drawing', 'Sculpting', 'Colouring'], category: 'Activity' },
  { emojis: '🧹✨', answer: 'Cleaning', options: ['Cleaning', 'Magic', 'Cinderella', 'Sweeping'], category: 'Activity' },
  { emojis: '🐒🍌', answer: 'Monkey', options: ['Monkey', 'Gorilla', 'Jungle', 'Zoo'], category: 'Animal' },
  { emojis: '🏰👸', answer: 'Princess', options: ['Princess', 'Queen', 'Castle', 'Knight'], category: 'Fantasy' },
  { emojis: '🌋💥', answer: 'Volcano', options: ['Volcano', 'Earthquake', 'Explosion', 'Meteor'], category: 'Nature' },
  { emojis: '📱💬', answer: 'Texting', options: ['Texting', 'Calling', 'Email', 'Social Media'], category: 'Activity' },
  { emojis: '🐧❄️', answer: 'Penguin', options: ['Penguin', 'Polar Bear', 'Seal', 'Snowman'], category: 'Animal' },
  { emojis: '🎪🤡', answer: 'Circus', options: ['Circus', 'Carnival', 'Theatre', 'Magic Show'], category: 'Place' },
  { emojis: '🧪🔬', answer: 'Science', options: ['Science', 'Chemistry', 'Experiment', 'Lab'], category: 'Subject' },
  { emojis: '🗺️🧭', answer: 'Adventure', options: ['Adventure', 'Travel', 'Hiking', 'Treasure Hunt'], category: 'Activity' },
  { emojis: '🦷🧚', answer: 'Tooth Fairy', options: ['Tooth Fairy', 'Dentist', 'Tinker Bell', 'Angel'], category: 'Fantasy' },
];

const CONFIG: Record<number, { timeLimit: number; rounds: number }> = {
  1: { timeLimit: 60, rounds: 6 },
  2: { timeLimit: 55, rounds: 6 },
  3: { timeLimit: 50, rounds: 8 },
  4: { timeLimit: 48, rounds: 8 },
  5: { timeLimit: 45, rounds: 8 },
  6: { timeLimit: 43, rounds: 10 },
  7: { timeLimit: 40, rounds: 10 },
  8: { timeLimit: 38, rounds: 10 },
  9: { timeLimit: 35, rounds: 12 },
  10: { timeLimit: 33, rounds: 12 },
  11: { timeLimit: 30, rounds: 12 },
  12: { timeLimit: 28, rounds: 14 },
  13: { timeLimit: 26, rounds: 14 },
  14: { timeLimit: 25, rounds: 14 },
  15: { timeLimit: 23, rounds: 16 },
  16: { timeLimit: 22, rounds: 16 },
  17: { timeLimit: 20, rounds: 18 },
  18: { timeLimit: 18, rounds: 18 },
  19: { timeLimit: 16, rounds: 20 },
  20: { timeLimit: 15, rounds: 20 },
};

function EmojiPictionaryGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);
  const usedRef = useRef<Set<number>>(new Set());

  const loadPuzzle = useCallback(() => {
    if (usedRef.current.size >= PUZZLE_BANK.length) {
      usedRef.current = new Set();
    }
    let idx: number;
    do {
      idx = Math.floor(Math.random() * PUZZLE_BANK.length);
    } while (usedRef.current.has(idx) && usedRef.current.size < PUZZLE_BANK.length);
    usedRef.current.add(idx);

    const p = PUZZLE_BANK[idx];
    const shuffled = [...p.options].sort(() => Math.random() - 0.5);
    setPuzzle({ ...p, options: shuffled });
    setPhase('playing');
    setFeedback('');
  }, []);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 1;
    usedRef.current = new Set();
    setScore(0);
    setCorrectCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    loadPuzzle();
  }, [config, loadPuzzle]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          onEnd({ score: scoreRef.current, stars, summary: `Time's up! ${correctRef.current}/${roundRef.current - 1} guessed. Think about what each emoji represents!` });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onEnd]);

  const handleAnswer = useCallback((answer: string) => {
    if (phase !== 'playing' || !gameActiveRef.current || !puzzle) return;

    if (answer === puzzle.answer) {
      const points = 25 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ ${puzzle.answer}! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ It was "${puzzle.answer}"!`);
      setFeedbackColor('#ff6e6c');
    }

    setPhase('feedback');
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
          ? `Emoji genius! ${correctRef.current}/${config.rounds} correct! You read emojis like a pro! 🎬`
          : `You guessed ${correctRef.current}/${config.rounds}. Think about what each emoji means together!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        loadPuzzle();
      }
    }, 1200);
  }, [phase, puzzle, timeLeft, config, onScore, onProgress, onEnd, loadPuzzle]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Emoji Pictionary</h2>
        <p className="text-text-dim mb-4 max-w-xs">Guess the movie, place, or thing from the emojis!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-4xl mb-2">❄️👸 = ?</div>
          <div className="text-success">Answer: Frozen!</div>
          <div className="text-warning mt-1">{config.rounds} rounds - ⏱️ {config.timeLimit}s</div>
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Game! 🎬
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-card rounded-xl mb-6 w-full justify-center">
        <span className="text-accent font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-success">✅ {correctCount}</span>
        <span className="text-primary">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-warning'}`}>⏱️ {timeLeft}</span>
      </div>

      {puzzle && (
        <>
          <div className="text-6xl mb-2 tracking-wider">{puzzle.emojis}</div>
          <div className="text-text-muted text-xs mb-6">{puzzle.category}</div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {puzzle.options.map((opt, idx) => (
              <button
                key={idx}
                onPointerDown={(e) => { e.stopPropagation(); handleAnswer(opt); }}
                className="bg-card hover:bg-card-hover border-2 border-white/10 text-text font-bold py-3.5 px-4 rounded-xl active:scale-95 transition-all text-sm"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-lg font-bold min-h-[28px] mt-6 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('emoji-pictionary', {
  name: 'Emoji Pictionary',
  emoji: '🎬',
  description: 'Guess the movie, place, or thing from emoji clues!',
  category: 'social',
  stages: 20,
  component: EmojiPictionaryGame,
});

export default EmojiPictionaryGame;
