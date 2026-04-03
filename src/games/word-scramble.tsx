import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

const WORD_LISTS: Record<string, { words: string[]; hints: string[] }> = {
  easy: {
    words: ['CAT', 'DOG', 'SUN', 'HAT', 'CUP', 'RUN', 'BIG', 'RED', 'BOX', 'PEN',
            'MAP', 'KEY', 'BUS', 'CAR', 'JAM', 'JUG', 'NET', 'OWL', 'PIE', 'RUG'],
    hints: ['A furry pet that purrs', 'A loyal pet that barks', 'Shines in the sky',
            'You wear this on your head', 'You drink from this', 'Move faster than walk',
            'Opposite of small', 'Color of a fire truck', 'A container with sides', 'You write with this',
            'Shows you where to go', 'Opens a lock', 'Takes you to school', 'Has four wheels',
            'Sweet fruit spread', 'Holds liquids', 'Catches fish or bugs', 'A wise night bird',
            'Sweet baked dessert', 'Goes on the floor'],
  },
  medium: {
    words: ['APPLE', 'BREAD', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HEART', 'IMAGE', 'JUICE',
            'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PIANO', 'QUEEN', 'RIVER', 'SNAKE', 'TIGER',
            'UNCLE', 'VOICE', 'WATER', 'YOUNG', 'ZEBRA', 'BEACH', 'CLOUD', 'DREAM', 'EARTH', 'FROST'],
    hints: ['A crunchy red fruit', 'Baked from flour', 'You sit on this',
            'Moving to rhythm', 'A majestic bird of prey', 'What fire produces',
            'Purple fruit on a vine', 'Pumps blood in your body', 'A picture or photo',
            'Squeezed from oranges', 'Cuts food at dinner', 'Yellow citrus fruit',
            'Sounds that make you feel', 'When the sun goes down', 'Vast body of salt water',
            'Musical instrument with keys', 'Rules a kingdom', 'Flows to the sea',
            'Slithers without legs', 'Big striped wild cat',
            'Your father\'s brother', 'Sound from your throat', 'Clear liquid we drink',
            'Opposite of old', 'Striped African animal', 'Sand and waves',
            'Floats in the sky', 'What you have at night', 'The planet we live on', 'Ice crystals on grass'],
  },
  hard: {
    words: ['PLANET', 'BRIDGE', 'CASTLE', 'DOLLAR', 'FATHER', 'GARDEN', 'HUNTER', 'ISLAND', 'JUNGLE', 'KITTEN',
            'LADDER', 'MUSEUM', 'NATURE', 'ORANGE', 'PENCIL', 'QUARTZ', 'ROCKET', 'SILVER', 'TUNNEL', 'UNIVERSE',
            'VIOLET', 'WINTER', 'YELLOW', 'BUTTER', 'CIRCLE', 'DOCTOR', 'FROZEN', 'GUITAR', 'HONEST', 'JACKET'],
    hints: ['Earth is one of these', 'Crosses over a river', 'Where a king or queen lives',
            'A unit of money', 'Male parent', 'Where flowers grow',
            'Tracks and catches animals', 'Land surrounded by water', 'Dense tropical forest', 'A baby cat',
            'You climb this to reach high places', 'Place to see old artifacts', 'The natural world around us',
            'A fruit and a color', 'Used for writing and drawing', 'A shiny mineral crystal',
            'Flies to outer space', 'A precious grey metal', 'Goes underground for trains', 'Everything that exists',
            'A shade of purple', 'Coldest season of the year', 'Color of bananas and sunshine',
            'Made from milk churning', 'Round shape with no corners', 'Helps sick people get better',
            'Turned to ice', 'String instrument you strum', 'Always tells the truth', 'You wear this when cold'],
  },
  expert: {
    words: ['ADVENTURE', 'BLANKET', 'CHAMPION', 'DIAMOND', 'ELEPHANT', 'FESTIVAL', 'GLACIER', 'HARMONY', 'INVENTOR', 'JOURNEY',
            'KITCHEN', 'LIBRARY', 'MOUNTAIN', 'NOTEBOOK', 'OCTOPUS', 'PENGUIN', 'RAINBOW', 'SCULPTOR', 'TEACHER', 'UMBRELLA',
            'VACATION', 'WATERFALL', 'XYLOPHONE', 'BALLOON', 'CAMPFIRE', 'DOLPHIN', 'EXPLORE', 'FEATHER', 'GIRAFFE', 'HURRICANE'],
    hints: ['An exciting new experience', 'Keeps you warm in bed', 'A winner of a competition',
            'Hardest natural gemstone', 'Largest land animal with a trunk', 'A big celebration event',
            'A slow-moving river of ice', 'Pleasant combination of sounds', 'Person who creates new things', 'A long trip somewhere',
            'Where meals are cooked', 'Place full of books to borrow', 'Very tall natural landform',
            'Book for writing notes in', 'Eight-armed sea creature', 'Black and white flightless bird',
            'Colors arching after rain', 'Artist who shapes stone or clay', 'Helps students learn at school',
            'Keeps you dry in the rain', 'Time off from work or school', 'Water dropping from a great height',
            'Musical instrument with wooden bars', 'Floats when filled with helium',
            'Outdoor fire for warmth and cooking', 'Smart friendly sea mammal', 'Travel to discover new places',
            'Light covering on a bird', 'Tallest animal with a long neck', 'Powerful tropical storm'],
  },
};

const CONFIG: Record<number, { wordList: string; timeLimit: number; rounds: number; scrambleStyle: number; hintAvailable: boolean }> = {
  1: { wordList: 'easy', timeLimit: 60, rounds: 8, scrambleStyle: 1, hintAvailable: true },
  2: { wordList: 'easy', timeLimit: 55, rounds: 8, scrambleStyle: 1, hintAvailable: true },
  3: { wordList: 'easy', timeLimit: 50, rounds: 10, scrambleStyle: 1, hintAvailable: true },
  4: { wordList: 'easy', timeLimit: 45, rounds: 10, scrambleStyle: 2, hintAvailable: true },
  5: { wordList: 'medium', timeLimit: 45, rounds: 10, scrambleStyle: 2, hintAvailable: true },
  6: { wordList: 'medium', timeLimit: 40, rounds: 12, scrambleStyle: 2, hintAvailable: true },
  7: { wordList: 'medium', timeLimit: 38, rounds: 12, scrambleStyle: 2, hintAvailable: false },
  8: { wordList: 'medium', timeLimit: 35, rounds: 12, scrambleStyle: 3, hintAvailable: false },
  9: { wordList: 'hard', timeLimit: 35, rounds: 14, scrambleStyle: 3, hintAvailable: true },
  10: { wordList: 'hard', timeLimit: 32, rounds: 14, scrambleStyle: 3, hintAvailable: false },
  11: { wordList: 'hard', timeLimit: 30, rounds: 14, scrambleStyle: 3, hintAvailable: false },
  12: { wordList: 'hard', timeLimit: 28, rounds: 15, scrambleStyle: 3, hintAvailable: false },
  13: { wordList: 'expert', timeLimit: 28, rounds: 15, scrambleStyle: 3, hintAvailable: true },
  14: { wordList: 'expert', timeLimit: 25, rounds: 15, scrambleStyle: 3, hintAvailable: false },
  15: { wordList: 'expert', timeLimit: 23, rounds: 16, scrambleStyle: 3, hintAvailable: false },
  16: { wordList: 'expert', timeLimit: 22, rounds: 16, scrambleStyle: 3, hintAvailable: false },
  17: { wordList: 'expert', timeLimit: 20, rounds: 18, scrambleStyle: 3, hintAvailable: false },
  18: { wordList: 'expert', timeLimit: 18, rounds: 18, scrambleStyle: 3, hintAvailable: false },
  19: { wordList: 'expert', timeLimit: 16, rounds: 20, scrambleStyle: 3, hintAvailable: false },
  20: { wordList: 'expert', timeLimit: 15, rounds: 20, scrambleStyle: 3, hintAvailable: false },
};

const TIPS = [
  "💡 Tip: Look for common letter pairs like TH, ER, IN, or ING!",
  "💡 Tip: Try saying the scrambled letters out loud — sometimes it clicks!",
  "💡 Tip: Start with the first letter you're sure about and build from there.",
  "💡 Tip: Use the hint if you're stuck — it costs points but keeps you going!",
  "💡 Tip: Longer words often have common endings like -TION, -ING, -ER.",
];

function scrambleWord(word: string, style: number): string {
  const attempts = style * 50;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const chars = word.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const result = chars.join('');
    if (result !== word) return result;
  }

  // Fallback: if palindrome, swap first two chars; otherwise reverse
  const reversed = word.split('').reverse().join('');
  if (reversed === word && word.length >= 2) {
    const chars = word.split('');
    [chars[0], chars[1]] = [chars[1], chars[0]];
    return chars.join('');
  }
  return reversed;
}

function WordScrambleGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [scrambled, setScrambled] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const usedWordsRef = useRef<Set<number>>(new Set());

  const loadWord = useCallback(() => {
    const wordList = WORD_LISTS[config.wordList];
    let wordIdx: number;
    do {
      wordIdx = Math.floor(Math.random() * wordList.words.length);
    } while (usedWordsRef.current.has(wordIdx) && usedWordsRef.current.size < wordList.words.length);

    usedWordsRef.current.add(wordIdx);
    const word = wordList.words[wordIdx];
    const hint = wordList.hints[wordIdx];

    setCurrentWord(word);
    setCurrentHint(hint);
    setScrambled(scrambleWord(word, config.scrambleStyle));
    setInputValue('');
    setHintUsed(false);
    setShowHint(false);
  }, [config]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 1;
    usedWordsRef.current = new Set();
    setScore(0);
    setCorrectCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    setFeedback('');
    loadWord();
    setPhase('playing');
  }, [config, loadWord]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          const summary = `Time's up! ${correctRef.current}/${roundRef.current - 1} words unscrambled. Look for common letter patterns!`;
          onEnd({ score: scoreRef.current, stars, summary });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, config, onEnd]);

  useEffect(() => {
    if (phase === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase, round]);

  const handleSubmit = useCallback(() => {
    if (phase !== 'playing' || !gameActiveRef.current) return;

    const guess = inputValue.trim().toUpperCase();
    if (!guess) return;

    if (guess === currentWord) {
      let points = currentWord.length * 10 + Math.floor(timeLeft / 2);
      if (hintUsed) points = Math.floor(points * 0.6);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ "${currentWord}" correct! +${points}${hintUsed ? ' (hint used)' : ''}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback(`❌ Not quite! Try again...`);
      setFeedbackColor('#ff6e6c');
      setInputValue('');
      setTimeout(() => setFeedback(''), 1000);
      return;
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
        const timeBonus = Math.floor(timeLeft * 3);
        scoreRef.current += timeBonus;
        const summary = accuracy > 0.8
          ? `Word wizard! ${correctRef.current}/${config.rounds} unscrambled! Your vocabulary is amazing! 📚`
          : accuracy > 0.5
            ? `Good job! ${correctRef.current}/${config.rounds} correct. Look for common letter pairs!`
            : `You unscrambled ${correctRef.current}/${config.rounds} words. Practice makes perfect!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        setInputValue('');
        loadWord();
        setPhase('playing');
        setFeedback('');
      }
    }, 1000);
  }, [phase, inputValue, currentWord, timeLeft, hintUsed, config, onScore, onProgress, onEnd, loadWord]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  const useHint = useCallback(() => {
    setShowHint(true);
    setHintUsed(true);
    setFeedback(`💡 Hint: ${currentHint}`);
    setFeedbackColor('#f59e0b');
  }, [currentHint]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔤</div>
        <h2 className="text-2xl font-bold text-indigo-400 mb-2">Word Scramble</h2>
        <p className="text-indigo-300 mb-4 max-w-xs">Unscramble the letters to form words!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-3xl text-indigo-400 mb-2 font-mono">T A C → CAT 🐱</div>
          <div className="text-cyan-300">Words get longer each stage</div>
          <div className="text-yellow-400 mt-1">{config.rounds} words • ⏱️ {config.timeLimit}s</div>
        </div>

        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-purple-300 text-sm">Type the unscrambled word and press Enter!</div>
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🔤
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-[#232146] rounded-xl mb-4 w-full justify-center">
        <span className="text-indigo-400 font-bold">Word: {round}/{config.rounds}</span>
        <span className="text-green-400">✅ {correctCount}</span>
        <span className="text-purple-400">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
          ⏱️ {timeLeft}
        </span>
      </div>

      <div className="flex gap-2 mb-2">
        {scrambled.split('').map((letter, idx) => (
          <div
            key={idx}
            className="w-10 h-12 md:w-12 md:h-14 rounded-lg flex items-center justify-center text-2xl md:text-3xl font-bold bg-indigo-500/30 text-indigo-300 font-mono border border-indigo-400/30"
          >
            {letter}
          </div>
        ))}
      </div>

      <div className="text-cyan-300 text-sm mb-4">({currentWord.length} letters)</div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          className="w-full py-3.5 text-2xl text-center bg-[#232146] border-2 border-indigo-400/50 rounded-xl text-white font-mono tracking-widest outline-none focus:border-indigo-400"
          placeholder="Type the word..."
          autoComplete="off"
          autoCapitalize="characters"
        />
        <div className="flex gap-2 w-full">
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleSubmit(); }}
            className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
          >
            Submit ✓
          </button>
          {config.hintAvailable && !showHint && (
            <button
              onPointerDown={(e) => { e.stopPropagation(); useHint(); }}
              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold px-4 py-3 rounded-xl active:scale-95 transition-transform border border-yellow-500/30"
            >
              💡 Hint
            </button>
          )}
        </div>
      </div>

      {showHint && (
        <div className="text-yellow-400 text-sm mt-2 text-center bg-yellow-500/10 px-3 py-1.5 rounded-lg">
          💡 {currentHint}
        </div>
      )}

      <div className="text-lg font-bold min-h-[28px] mt-3 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('word-scramble', {
  name: 'Word Scramble',
  emoji: '🔤',
  description: 'Unscramble the letters to form the correct word!',
  category: 'sequence',
  stages: 20,
  component: WordScrambleGame,
});

export default WordScrambleGame;
