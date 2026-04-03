import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

interface Question {
  question: string;
  answer: string;
  options: string[];
  category: string;
}

const TIPS = [
  "💡 Tip: Read all 4 options before answering — sometimes the wrong ones give clues!",
  "💡 Tip: If unsure, eliminate the obviously wrong answers first.",
  "💡 Tip: Questions cover science, geography, nature, maths, and more — stay curious!",
  "💡 Tip: Every wrong answer teaches you something new for next time!",
  "💡 Tip: Timer shrinks at higher stages — answer fast for bonus points!",
];

const QUESTION_BANK: Question[] = [
  { question: 'What is the largest planet in our solar system?', answer: 'Jupiter', options: ['Jupiter', 'Saturn', 'Mars', 'Neptune'], category: 'Space' },
  { question: 'How many continents are there?', answer: '7', options: ['5', '6', '7', '8'], category: 'Geography' },
  { question: 'What gas do plants breathe in?', answer: 'Carbon dioxide', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], category: 'Science' },
  { question: 'What is the hardest natural substance?', answer: 'Diamond', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], category: 'Science' },
  { question: 'Which ocean is the largest?', answer: 'Pacific', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], category: 'Geography' },
  { question: 'How many legs does a spider have?', answer: '8', options: ['6', '8', '10', '12'], category: 'Nature' },
  { question: 'What colour do you get mixing red and blue?', answer: 'Purple', options: ['Green', 'Orange', 'Purple', 'Brown'], category: 'Art' },
  { question: 'Which planet is known as the Red Planet?', answer: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], category: 'Space' },
  { question: 'What is the tallest animal in the world?', answer: 'Giraffe', options: ['Elephant', 'Giraffe', 'Horse', 'Camel'], category: 'Nature' },
  { question: 'How many sides does a hexagon have?', answer: '6', options: ['5', '6', '7', '8'], category: 'Maths' },
  { question: 'What is the fastest land animal?', answer: 'Cheetah', options: ['Lion', 'Cheetah', 'Horse', 'Falcon'], category: 'Nature' },
  { question: 'Which country is home to kangaroos?', answer: 'Australia', options: ['India', 'Brazil', 'Australia', 'Canada'], category: 'Geography' },
  { question: 'What do bees make?', answer: 'Honey', options: ['Milk', 'Honey', 'Sugar', 'Wax'], category: 'Nature' },
  { question: 'How many bones does an adult human have?', answer: '206', options: ['106', '206', '306', '180'], category: 'Science' },
  { question: 'What is the smallest planet in our solar system?', answer: 'Mercury', options: ['Mars', 'Mercury', 'Pluto', 'Venus'], category: 'Space' },
  { question: 'What language has the most native speakers?', answer: 'Mandarin Chinese', options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], category: 'Culture' },
  { question: 'What is the boiling point of water in Celsius?', answer: '100°C', options: ['50°C', '100°C', '150°C', '200°C'], category: 'Science' },
  { question: 'Which instrument has 88 keys?', answer: 'Piano', options: ['Guitar', 'Piano', 'Violin', 'Harp'], category: 'Music' },
  { question: 'What is a group of lions called?', answer: 'A pride', options: ['A pack', 'A pride', 'A flock', 'A herd'], category: 'Nature' },
  { question: 'How many colours are in a rainbow?', answer: '7', options: ['5', '6', '7', '8'], category: 'Science' },
  { question: 'What is the largest organ in the human body?', answer: 'Skin', options: ['Heart', 'Liver', 'Skin', 'Brain'], category: 'Science' },
  { question: 'Which planet has the most moons?', answer: 'Saturn', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], category: 'Space' },
  { question: 'What is the capital of Japan?', answer: 'Tokyo', options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], category: 'Geography' },
  { question: 'How many teeth does an adult human normally have?', answer: '32', options: ['28', '30', '32', '36'], category: 'Science' },
  { question: 'What shape is a stop sign?', answer: 'Octagon', options: ['Square', 'Circle', 'Hexagon', 'Octagon'], category: 'General' },
  { question: 'Which animal is known for changing colour?', answer: 'Chameleon', options: ['Frog', 'Chameleon', 'Snake', 'Gecko'], category: 'Nature' },
  { question: 'What is the longest river in the world?', answer: 'Nile', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], category: 'Geography' },
  { question: 'How many strings does a standard guitar have?', answer: '6', options: ['4', '5', '6', '8'], category: 'Music' },
  { question: 'What is frozen water called?', answer: 'Ice', options: ['Snow', 'Ice', 'Frost', 'Sleet'], category: 'Science' },
  { question: 'Which fruit is known as the "king of fruits"?', answer: 'Durian', options: ['Mango', 'Durian', 'Pineapple', 'Jackfruit'], category: 'Food' },
  { question: 'What does NASA stand for?', answer: 'National Aeronautics and Space Administration', options: ['National Aeronautics and Space Administration', 'North American Space Agency', 'National Air and Space Association', 'New Aeronautics and Space Authority'], category: 'Space' },
  { question: 'Which animal can sleep for up to 3 years?', answer: 'Snail', options: ['Bear', 'Sloth', 'Snail', 'Cat'], category: 'Nature' },
  { question: 'What is the currency of the United Kingdom?', answer: 'Pound', options: ['Euro', 'Dollar', 'Pound', 'Franc'], category: 'Geography' },
  { question: 'How many planets are in our solar system?', answer: '8', options: ['7', '8', '9', '10'], category: 'Space' },
  { question: 'What is the chemical symbol for gold?', answer: 'Au', options: ['Go', 'Gd', 'Au', 'Ag'], category: 'Science' },
  { question: 'Which bird can fly backwards?', answer: 'Hummingbird', options: ['Eagle', 'Hummingbird', 'Parrot', 'Owl'], category: 'Nature' },
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

function TriviaQuestGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);
  const usedRef = useRef<Set<number>>(new Set());

  const loadQuestion = useCallback(() => {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * QUESTION_BANK.length);
    } while (usedRef.current.has(idx) && usedRef.current.size < QUESTION_BANK.length);
    usedRef.current.add(idx);

    const q = QUESTION_BANK[idx];
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    setQuestion({ ...q, options: shuffled });
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
    loadQuestion();
  }, [config, loadQuestion]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          onEnd({ score: scoreRef.current, stars, summary: `Time's up! ${correctRef.current}/${roundRef.current - 1} correct. Keep learning new facts!` });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onEnd]);

  const handleAnswer = useCallback((answer: string) => {
    if (phase !== 'playing' || !gameActiveRef.current || !question) return;

    if (answer === question.answer) {
      const points = 25 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ It was "${question.answer}"`);
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
          ? `Trivia champion! ${correctRef.current}/${config.rounds} correct! You know so much! 🏆`
          : `You got ${correctRef.current}/${config.rounds}. Every question teaches you something new!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        loadQuestion();
      }
    }, 1200);
  }, [phase, question, timeLeft, config, onScore, onProgress, onEnd, loadQuestion]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🧠</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Trivia Quest</h2>
        <p className="text-text-dim mb-4 max-w-xs">Test your knowledge across science, nature, geography and more!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-text-muted text-sm mb-2">Answer questions from many categories</div>
          <div className="text-warning">{config.rounds} questions - ⏱️ {config.timeLimit}s</div>
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Quest! 🧠
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

      {question && (
        <>
          <div className="text-xs text-text-muted mb-1">{question.category}</div>
          <div className="text-lg font-semibold text-text mb-5 text-center max-w-sm">{question.question}</div>

          <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onPointerDown={(e) => { e.stopPropagation(); handleAnswer(opt); }}
                className="bg-card hover:bg-card-hover border-2 border-white/10 text-text font-bold py-3 px-4 rounded-xl active:scale-95 transition-all text-sm text-left"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-lg font-bold min-h-[28px] mt-5 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('trivia-quest', {
  name: 'Trivia Quest',
  emoji: '🧠',
  description: 'Test your knowledge across science, nature, and more!',
  category: 'memory',
  stages: 20,
  component: TriviaQuestGame,
});

export default TriviaQuestGame;
