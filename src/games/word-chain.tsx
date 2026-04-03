import { useState, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';

const TIPS = [
  "💡 Tip: Think of common words that start with each letter before you get stuck!",
  "💡 Tip: Short words work too — 'at', 'it', 'on' are all valid!",
  "💡 Tip: Hints are available in early stages — use them to learn patterns!",
  "💡 Tip: Higher stages need longer chains — build your vocabulary!",
  "💡 Tip: If stuck on a letter, think of animals, foods, or places that start with it!",
];

const WORD_LIST = [
  'apple', 'eagle', 'elephant', 'tiger', 'rabbit', 'tomato', 'orange', 'enjoy',
  'yellow', 'water', 'river', 'rain', 'nest', 'tree', 'engine', 'earth',
  'happy', 'yawn', 'night', 'table', 'energy', 'yard', 'dance', 'eleven',
  'north', 'heart', 'train', 'nine', 'eagle', 'echo', 'ocean', 'novel',
  'light', 'teeth', 'hello', 'oval', 'leaf', 'finger', 'robot', 'tower',
  'rope', 'exit', 'taxi', 'ice', 'eat', 'tall', 'lake', 'elf',
  'flag', 'gift', 'tent', 'top', 'pan', 'net', 'tea', 'ant',
  'time', 'ear', 'red', 'dog', 'gem', 'map', 'pin', 'new',
  'wish', 'hat', 'tin', 'net', 'ten', 'now', 'wet', 'win',
  'arm', 'milk', 'kite', 'east', 'town', 'note', 'even', 'nest',
  'star', 'ring', 'game', 'egg', 'gate', 'eye', 'end', 'drum',
  'moon', 'nose', 'ear', 'rock', 'knee', 'extra', 'art', 'tune',
];

const STARTER_WORDS = ['apple', 'elephant', 'orange', 'tiger', 'happy', 'robot', 'ocean', 'earth', 'dance', 'light'];

const CONFIG: Record<number, { maxChain: number; hintEnabled: boolean }> = {
  1: { maxChain: 5, hintEnabled: true },
  2: { maxChain: 5, hintEnabled: true },
  3: { maxChain: 6, hintEnabled: true },
  4: { maxChain: 6, hintEnabled: true },
  5: { maxChain: 7, hintEnabled: true },
  6: { maxChain: 7, hintEnabled: true },
  7: { maxChain: 8, hintEnabled: false },
  8: { maxChain: 8, hintEnabled: false },
  9: { maxChain: 9, hintEnabled: false },
  10: { maxChain: 10, hintEnabled: false },
  11: { maxChain: 10, hintEnabled: false },
  12: { maxChain: 11, hintEnabled: false },
  13: { maxChain: 12, hintEnabled: false },
  14: { maxChain: 12, hintEnabled: false },
  15: { maxChain: 13, hintEnabled: false },
  16: { maxChain: 14, hintEnabled: false },
  17: { maxChain: 15, hintEnabled: false },
  18: { maxChain: 16, hintEnabled: false },
  19: { maxChain: 18, hintEnabled: false },
  20: { maxChain: 20, hintEnabled: false },
};

function findHint(lastLetter: string, usedWords: Set<string>): string | null {
  const matches = WORD_LIST.filter(w => w[0] === lastLetter && !usedWords.has(w));
  return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : null;
}

function WordChainGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [chain, setChain] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [hint, setHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreRef = useRef(0);
  const usedWordsRef = useRef<Set<string>>(new Set());

  const startGame = useCallback(() => {
    const starter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
    usedWordsRef.current = new Set([starter]);
    setChain([starter]);
    setScore(0);
    scoreRef.current = 0;
    setInputValue('');
    setFeedback('');
    setHint('');
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const submitWord = useCallback(() => {
    const word = inputValue.trim().toLowerCase();
    if (!word) return;

    const lastWord = chain[chain.length - 1];
    const requiredLetter = lastWord[lastWord.length - 1];

    if (word.length < 2) {
      setFeedback('Word must be at least 2 letters!');
      setFeedbackColor('#ff6e6c');
      return;
    }

    if (word[0] !== requiredLetter) {
      setFeedback(`Word must start with "${requiredLetter.toUpperCase()}"!`);
      setFeedbackColor('#ff6e6c');
      return;
    }

    if (usedWordsRef.current.has(word)) {
      setFeedback('Word already used! Try another.');
      setFeedbackColor('#ff6e6c');
      return;
    }

    // Accept the word
    usedWordsRef.current.add(word);
    const newChain = [...chain, word];
    setChain(newChain);
    setInputValue('');
    setHint('');

    const points = 10 + word.length * 3;
    scoreRef.current += points;
    setScore(scoreRef.current);
    onScore(points);
    onProgress(newChain.length / config.maxChain);

    setFeedback(`✅ +${points}! Words: ${newChain.length}`);
    setFeedbackColor('#4ade80');

    if (newChain.length >= config.maxChain) {
      const stars = 3;
      const summary = `Word chain champion! You linked ${newChain.length} words together! Amazing vocabulary! 📝`;
      setTimeout(() => onEnd({ score: scoreRef.current + 50, stars, summary }), 800);
      setPhase('done');
      return;
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputValue, chain, config, onScore, onProgress, onEnd]);

  const giveUp = useCallback(() => {
    const chainLen = chain.length;
    const stars = chainLen >= config.maxChain * 0.7 ? 3 : chainLen >= config.maxChain * 0.4 ? 2 : 1;
    const summary = chainLen > 3
      ? `Nice chain of ${chainLen} words! Try to think of more words starting with each letter.`
      : `You chained ${chainLen} words. Practice thinking of words that start with different letters!`;
    onEnd({ score: scoreRef.current, stars, summary });
    setPhase('done');
  }, [chain, config, onEnd]);

  const showHint = useCallback(() => {
    const lastWord = chain[chain.length - 1];
    const lastLetter = lastWord[lastWord.length - 1];
    const hintWord = findHint(lastLetter, usedWordsRef.current);
    if (hintWord) {
      setHint(`💡 Try: "${hintWord[0].toUpperCase()}${hintWord.slice(1, 3)}..."`);
    } else {
      setHint('💡 No hints available — try any word!');
    }
  }, [chain]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Word Chain</h2>
        <p className="text-text-dim mb-4 max-w-xs">Each word must start with the last letter of the previous word!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-text-muted text-sm mb-2">apple → elephant → tiger → ...</div>
          <div className="text-warning">Chain {config.maxChain} words to win!</div>
          {config.hintEnabled && <div className="text-success text-xs mt-1">Hints available!</div>}
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Chain! 🔗
        </button>
      </div>
    );
  }

  const lastWord = chain[chain.length - 1];
  const requiredLetter = lastWord[lastWord.length - 1].toUpperCase();

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-card rounded-xl mb-4 w-full justify-center">
        <span className="text-accent font-bold">Chain: {chain.length}/{config.maxChain}</span>
        <span className="text-primary">Score: {score}</span>
      </div>

      {/* Chain display */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-4 max-w-sm max-h-32 overflow-y-auto">
        {chain.map((word, idx) => (
          <span
            key={idx}
            className="bg-card px-2.5 py-1 rounded-lg text-sm font-medium"
            style={{ color: idx === chain.length - 1 ? '#4ade80' : '#9ca3af' }}
          >
            {word}
            {idx < chain.length - 1 && <span className="text-text-muted ml-1">→</span>}
          </span>
        ))}
      </div>

      {phase === 'playing' && (
        <>
          <div className="text-text-dim text-sm mb-2">
            Next word must start with: <span className="text-accent font-bold text-lg">{requiredLetter}</span>
          </div>

          <div className="flex gap-2 w-full max-w-xs mb-3">
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitWord(); }}
              className="flex-1 py-3 px-4 text-lg bg-card border-2 border-white/20 rounded-xl text-text outline-none focus:border-accent"
              placeholder={`Type a word starting with ${requiredLetter}...`}
            />
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={submitWord}
              className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl active:scale-95"
            >
              Submit ✓
            </button>
            {config.hintEnabled && (
              <button
                onClick={showHint}
                className="bg-card text-warning font-bold px-4 py-2.5 rounded-xl active:scale-95 border border-warning/30"
              >
                Hint 💡
              </button>
            )}
            <button
              onClick={giveUp}
              className="bg-card text-text-muted font-bold px-4 py-2.5 rounded-xl active:scale-95 border border-white/10"
            >
              End
            </button>
          </div>

          {hint && <div className="text-warning text-sm mb-2">{hint}</div>}
        </>
      )}

      <div className="text-lg font-bold min-h-[28px] text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('word-chain', {
  name: 'Word Chain',
  emoji: '🔗',
  description: 'Link words together — each starts with the last letter!',
  category: 'sequence',
  stages: 20,
  component: WordChainGame,
});

export default WordChainGame;
