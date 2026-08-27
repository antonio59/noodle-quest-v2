import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';

interface Word { word: string; category: string; hint: string }

const WORDS_BY_LENGTH: Record<number, Word[]> = {
  4: [
    { word: 'BEAR', category: 'Animals', hint: 'Honey lover' },
    { word: 'DUCK', category: 'Animals', hint: 'Quacks a lot' },
    { word: 'FROG', category: 'Animals', hint: 'Lily pad jumper' },
    { word: 'WOLF', category: 'Animals', hint: 'Howls at the moon' },
    { word: 'HAWK', category: 'Animals', hint: 'Sharp-eyed flyer' },
    { word: 'CRAB', category: 'Animals', hint: 'Walks sideways' },
    { word: 'RICE', category: 'Food', hint: 'Asian staple grain' },
    { word: 'CAKE', category: 'Food', hint: 'Birthday treat' },
    { word: 'MILK', category: 'Food', hint: 'From a cow' },
    { word: 'CORN', category: 'Food', hint: 'Yellow on a cob' },
    { word: 'SWIM', category: 'Actions', hint: 'Move through water' },
    { word: 'JUMP', category: 'Actions', hint: 'Leap into the air' },
    { word: 'SING', category: 'Actions', hint: 'Make music with your voice' },
    { word: 'SKIP', category: 'Actions', hint: 'A bouncy walk' },
    { word: 'GLOW', category: 'Nature', hint: 'Soft light' },
    { word: 'RAIN', category: 'Nature', hint: 'Falls from clouds' },
    { word: 'SNOW', category: 'Nature', hint: 'Cold white flakes' },
    { word: 'WIND', category: 'Nature', hint: 'Invisible force' },
  ],
  5: [
    { word: 'TIGER', category: 'Animals', hint: 'Striped big cat' },
    { word: 'EAGLE', category: 'Animals', hint: 'National bird of the USA' },
    { word: 'SNAKE', category: 'Animals', hint: 'No legs, slithers' },
    { word: 'HORSE', category: 'Animals', hint: 'Mane and gallops' },
    { word: 'WHALE', category: 'Animals', hint: 'Ocean giant' },
    { word: 'PANDA', category: 'Animals', hint: 'Black and white bear' },
    { word: 'SHARK', category: 'Animals', hint: 'Ocean predator' },
    { word: 'PIZZA', category: 'Food', hint: 'Italian round flatbread' },
    { word: 'BREAD', category: 'Food', hint: 'Slice me up' },
    { word: 'PASTA', category: 'Food', hint: 'Spaghetti or penne' },
    { word: 'GRAPE', category: 'Food', hint: 'Grows in a vineyard' },
    { word: 'LEMON', category: 'Food', hint: 'Sour yellow citrus' },
    { word: 'DANCE', category: 'Actions', hint: 'Move to music' },
    { word: 'SMILE', category: 'Emotions', hint: 'Happy expression' },
    { word: 'DREAM', category: 'Mindfulness', hint: 'While you sleep' },
    { word: 'BRAVE', category: 'Emotions', hint: 'Courageous feeling' },
    { word: 'OCEAN', category: 'Nature', hint: 'Vast body of water' },
    { word: 'CLOUD', category: 'Nature', hint: 'Floats in the sky' },
    { word: 'STORM', category: 'Nature', hint: 'Thunder and lightning' },
    { word: 'FLAME', category: 'Nature', hint: 'Fire\'s dancing tip' },
  ],
  6: [
    { word: 'MONKEY', category: 'Animals', hint: 'Swings from trees' },
    { word: 'RABBIT', category: 'Animals', hint: 'Long ears, hops' },
    { word: 'PARROT', category: 'Animals', hint: 'Talks back' },
    { word: 'TURTLE', category: 'Animals', hint: 'Slow and shelled' },
    { word: 'DONKEY', category: 'Animals', hint: 'Hee-haw!' },
    { word: 'BUTTER', category: 'Food', hint: 'Spread on toast' },
    { word: 'COFFEE', category: 'Food', hint: 'Morning wake-up drink' },
    { word: 'CHEESE', category: 'Food', hint: 'Made from milk' },
    { word: 'CARROT', category: 'Food', hint: 'Rabbit\'s favourite' },
    { word: 'BANANA', category: 'Food', hint: 'Yellow and curved' },
    { word: 'LISTEN', category: 'Actions', hint: 'Use your ears' },
    { word: 'KINDLY', category: 'Emotions', hint: 'In a generous way' },
    { word: 'WONDER', category: 'Mindfulness', hint: 'Curious amazement' },
    { word: 'FOREST', category: 'Nature', hint: 'Dense with trees' },
    { word: 'RIVER', category: 'Nature', hint: 'Flows to the sea' },
    { word: 'PLANET', category: 'Nature', hint: 'Earth is one' },
  ],
  7: [
    { word: 'DOLPHIN', category: 'Animals', hint: 'Smart ocean mammal' },
    { word: 'PENGUIN', category: 'Animals', hint: 'Tuxedo-wearing bird' },
    { word: 'GORILLA', category: 'Animals', hint: 'Largest primate' },
    { word: 'BUFFALO', category: 'Animals', hint: 'American bison cousin' },
    { word: 'CHICKEN', category: 'Food', hint: 'Clucks and lays eggs' },
    { word: 'SPINACH', category: 'Food', hint: 'Popeye\'s power food' },
    { word: 'AVOCADO', category: 'Food', hint: 'Guacamole base' },
    { word: 'HARMONY', category: 'Mindfulness', hint: 'Everything in balance' },
    { word: 'COURAGE', category: 'Emotions', hint: 'Bravery in the face of fear' },
    { word: 'RAINBOW', category: 'Nature', hint: 'After the rain' },
    { word: 'SUNRISE', category: 'Nature', hint: 'Morning sky display' },
    { word: 'THUNDER', category: 'Nature', hint: 'Lightning\'s loud partner' },
  ],
  8: [
    { word: 'ELEPHANT', category: 'Animals', hint: 'Largest land animal' },
    { word: 'KANGAROO', category: 'Animals', hint: 'Pouched Australian hopper' },
    { word: 'PATIENCE', category: 'Mindfulness', hint: 'Waiting calmly' },
    { word: 'PEACEFUL', category: 'Mindfulness', hint: 'Calm and serene' },
    { word: 'KINDNESS', category: 'Emotions', hint: 'Being warm to others' },
    { word: 'MOUNTAIN', category: 'Nature', hint: 'Tallest landform' },
    { word: 'RAINFALL', category: 'Nature', hint: 'Water from the sky' },
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scramble(word: string): string[] {
  const letters = word.split('');
  let result: string[];
  do { result = shuffle(letters); } while (result.join('') === word);
  return result;
}

function getWordLength(stage: number): number {
  if (stage <= 2) return 4;
  if (stage <= 4) return 5;
  if (stage <= 6) return 6;
  if (stage <= 8) return 7;
  return 8;
}

export default function AnagramGame({ stage, onScore, onProgress, onEnd, onMessage }: GameProps) {
  const ROUNDS = 10;
  const wordLength = getWordLength(stage);

  const wordList = useMemo(() => {
    const pool = WORDS_BY_LENGTH[wordLength] ?? WORDS_BY_LENGTH[5];
    return shuffle(pool).slice(0, ROUNDS);
  }, [wordLength]);

  const [round, setRound]         = useState(0);
  const [score, setScore]         = useState(0);
  const [tiles, setTiles]         = useState<string[]>([]);
  const [picked, setPicked]       = useState<number[]>([]);
  const [feedback, setFeedback]   = useState<'correct' | 'wrong' | null>(null);
  const [hintUsed, setHintUsed]   = useState(false);
  const [hintIdx, setHintIdx]     = useState(0);
  const [shake, setShake]         = useState(false);

  const endedRef    = useRef(false);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onEndRef    = useRef(onEnd);
  const onScoreRef  = useRef(onScore);
  const onProgressRef = useRef(onProgress);
  const onMessageRef  = useRef(onMessage);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    return () => {
      endedRef.current = true;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (round >= ROUNDS) return;
    const w = wordList[round];
    if (!w) return;
    setTiles(scramble(w.word));
    setPicked([]);
    setFeedback(null);
    setHintUsed(false);
    setHintIdx(0);
    onMessageRef.current(`Round ${round + 1}: Unscramble the ${w.category.toLowerCase()} word!`);
  }, [round, wordList]);

  const currentWord = round < ROUNDS ? wordList[round] : null;
  const builtWord = picked.map(i => tiles[i]).join('');

  const handleTile = useCallback((idx: number) => {
    if (feedback || picked.includes(idx)) return;
    setPicked(p => [...p, idx]);
  }, [feedback, picked]);

  const handleRemove = useCallback((posIdx: number) => {
    if (feedback) return;
    setPicked(p => p.filter((_, i) => i !== posIdx));
  }, [feedback]);

  useEffect(() => {
    if (!currentWord || feedback) return;
    if (builtWord.length !== currentWord.word.length) return;

    if (builtWord === currentWord.word) {
      const pts = hintUsed ? 5 : 10;
      const newScore = score + pts;
      setScore(newScore);
      onScoreRef.current(pts);
      setFeedback('correct');
      onProgressRef.current((round + 1) / ROUNDS);
      onMessageRef.current(hintUsed ? `✓ Correct! (+${pts})` : `🎉 Correct! (+${pts})`);
      schedule(() => {
        if (round + 1 >= ROUNDS) {
          if (endedRef.current) return;
          endedRef.current = true;
          const stars = newScore >= 80 ? 3 : newScore >= 50 ? 2 : 1;
          onEndRef.current({ score: newScore, stars, summary: `Unscrambled ${ROUNDS} words! Score: ${newScore}` });
        } else {
          setRound(r => r + 1);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      onMessageRef.current('Not quite — try rearranging!');
      schedule(() => {
        setFeedback(null);
        setPicked([]);
      }, 800);
    }
  }, [builtWord, currentWord, feedback, hintUsed, round, score, schedule]);

  const useHint = useCallback(() => {
    if (!currentWord || hintUsed || feedback) return;
    setHintUsed(true);
    const correctLetter = currentWord.word[hintIdx];
    const correctTileIdx = tiles.findIndex((t, i) => t === correctLetter && !picked.includes(i));
    if (correctTileIdx !== -1) {
      setPicked(p => [...p, correctTileIdx]);
      setHintIdx(h => h + 1);
    }
  }, [currentWord, hintUsed, feedback, hintIdx, tiles, picked]);

  if (!currentWord) return null;

  const categoryColors: Record<string, string> = {
    Animals: '#4ade80', Food: '#fb923c', Actions: '#60a5fa',
    Emotions: '#f472b6', Mindfulness: '#f0a83a', Nature: '#34d399',
  };
  const catColor = categoryColors[currentWord.category] ?? '#f0a83a';

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-text-muted">Round {round + 1}/{ROUNDS}</span>
        <span className="bg-accent/20 text-accent rounded-lg px-2.5 py-1 text-sm font-bold">{score} pts</span>
      </div>

      <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(round / ROUNDS) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent), #67e8f9)' }} />
      </div>

      <div className="flex-shrink-0 text-center">
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: catColor + '22', color: catColor }}>
          {currentWord.category}
        </span>
        <p className="text-text-muted text-sm mt-1.5">💡 {currentWord.hint}</p>
      </div>

      {/* Answer area */}
      <div className={`flex justify-center gap-2 flex-wrap min-h-[56px] items-center ${shake ? 'animate-pulse' : ''}`}>
        {Array.from({ length: currentWord.word.length }).map((_, i) => {
          const letter = picked[i] !== undefined ? tiles[picked[i]] : null;
          return (
            <button
              key={i}
              onClick={() => letter && handleRemove(i)}
              className="w-11 h-11 rounded-xl text-lg font-bold border-2 transition-all"
              style={{
                background: feedback === 'correct' ? 'rgba(74,222,128,0.25)' : feedback === 'wrong' ? 'rgba(239,68,68,0.2)' : letter ? 'rgba(167,139,250,0.2)' : 'var(--color-surface)',
                border: `2px solid ${feedback === 'correct' ? '#4ade80' : feedback === 'wrong' ? '#ef4444' : letter ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`,
                color: letter ? 'white' : 'transparent',
              }}
            >
              {letter ?? ''}
            </button>
          );
        })}
      </div>

      {/* Scrambled tiles */}
      <div className="flex justify-center gap-2 flex-wrap">
        {tiles.map((letter, i) => {
          const used = picked.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleTile(i)}
              disabled={used || !!feedback}
              className="w-11 h-11 rounded-xl text-lg font-bold transition-all active:scale-90"
              style={{
                background: used ? 'var(--color-surface)' : 'var(--color-card)',
                border: '2px solid rgba(255,255,255,0.08)',
                opacity: used ? 0.3 : 1,
                color: used ? 'transparent' : 'white',
              }}
            >
              {used ? '' : letter}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 justify-center">
        <button onClick={() => setPicked([])} disabled={!!feedback || picked.length === 0}
          className="px-4 py-2 rounded-xl text-sm bg-surface text-text-muted disabled:opacity-40 active:scale-95 transition-all">
          Clear
        </button>
        <button onClick={useHint} disabled={hintUsed || !!feedback}
          className="px-4 py-2 rounded-xl text-sm bg-warning/15 text-warning disabled:opacity-40 active:scale-95 transition-all">
          {hintUsed ? 'Hint used' : 'Hint (-5pts)'}
        </button>
      </div>

      {feedback && (
        <div className={`text-center font-bold text-lg ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
          {feedback === 'correct' ? '✓ Correct!' : '✗ Try again'}
        </div>
      )}
    </div>
  );
}
