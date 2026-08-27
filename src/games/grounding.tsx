import { useState, useRef, useEffect, useCallback } from 'react';
import type { GameProps } from '@/types';

interface Sense {
  emoji: string;
  title: string;
  prompt: string;
  count: number;
  color: string;
}

const SENSES: Sense[] = [
  { emoji: '👀', title: 'See',   prompt: 'Look around. Name 5 things you can see right now.',   count: 5, color: '#60a5fa' },
  { emoji: '👂', title: 'Hear',  prompt: 'Listen carefully. Name 4 sounds you can hear.',        count: 4, color: '#f0a83a' },
  { emoji: '🤲', title: 'Feel',  prompt: 'What can you physically feel or touch? Name 3 things.', count: 3, color: '#4ade80' },
  { emoji: '👃', title: 'Smell', prompt: 'Notice any smells around you — name 2.',               count: 2, color: '#fb923c' },
  { emoji: '👅', title: 'Taste', prompt: 'What taste is in your mouth right now? Name 1.',       count: 1, color: '#f472b6' },
];

export default function GroundingGame({ onScore, onProgress, onEnd, onMessage }: GameProps) {
  const [senseIdx, setSenseIdx]   = useState(0);
  const [items, setItems]         = useState<string[][]>(SENSES.map(() => []));
  const [inputVal, setInputVal]   = useState('');
  const [done, setDone]           = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');

  const endedRef     = useRef(false);
  const timersRef    = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onEndRef     = useRef(onEnd);
  const onScoreRef   = useRef(onScore);
  const onProgressRef = useRef(onProgress);
  const onMessageRef  = useRef(onMessage);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    endedRef.current = false;
    return () => { endedRef.current = true; timersRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const sense = SENSES[senseIdx];
    onMessageRef.current(`${sense.emoji} ${sense.prompt}`);
  }, [senseIdx]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  const addItem = useCallback(() => {
    const val = inputVal.trim();
    if (!val) return;
    const sense = SENSES[senseIdx];
    if (items[senseIdx].length >= sense.count) return;

    const newItems = items.map((arr, i) => i === senseIdx ? [...arr, val] : arr);
    setItems(newItems);
    setInputVal('');
    onScoreRef.current(20);

    const filled = newItems[senseIdx].length;
    const progress = (senseIdx + filled / sense.count) / SENSES.length;
    onProgressRef.current(Math.min(progress, 1));

    if (filled >= sense.count) {
      if (senseIdx < SENSES.length - 1) {
        schedule(() => {
          setSenseIdx(s => s + 1);
          setInputVal('');
        }, 600);
      } else {
        // All done!
        schedule(() => {
          setDone(true);
          setBreathing(true);
          const totalItems = newItems.reduce((sum, arr) => sum + arr.length, 0);
          const pts = totalItems * 20;
          onProgressRef.current(1);
          const stars = totalItems >= 14 ? 3 : totalItems >= 10 ? 2 : 1;
          onMessageRef.current('🌸 Beautifully grounded. Take a slow breath.');
          schedule(() => {
            if (endedRef.current) return;
            endedRef.current = true;
            onEndRef.current({ score: pts, stars, summary: `Named ${totalItems} things across 5 senses. You are grounded. 🌸` });
          }, 8000);
        }, 800);
      }
    }
  }, [inputVal, items, senseIdx, schedule]);

  // Breathing animation after completion
  useEffect(() => {
    if (!breathing) return;
    const cycle = () => {
      setBreathPhase('in');
      const t1 = setTimeout(() => {
        setBreathPhase('hold');
        const t2 = setTimeout(() => {
          setBreathPhase('out');
          const t3 = setTimeout(cycle, 4000);
          timersRef.current.push(t3);
        }, 1500);
        timersRef.current.push(t2);
      }, 4000);
      timersRef.current.push(t1);
    };
    cycle();
  }, [breathing]);

  const sense = SENSES[senseIdx];
  const filled = items[senseIdx];

  if (done && breathing) {
    const circleScale = breathPhase === 'in' ? 1.4 : breathPhase === 'hold' ? 1.4 : 0.85;
    const circleColor = breathPhase === 'in' ? '#60a5fa' : breathPhase === 'hold' ? '#f0a83a' : '#4ade80';
    const label = breathPhase === 'in' ? 'Breathe in...' : breathPhase === 'hold' ? 'Hold...' : 'Breathe out...';
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-accent font-bold text-lg">🌸 You are grounded</p>
        <div
          className="w-36 h-36 rounded-full flex items-center justify-center font-semibold text-sm"
          style={{
            background: `radial-gradient(circle, ${circleColor}44, ${circleColor}11)`,
            border: `3px solid ${circleColor}`,
            transform: `scale(${circleScale})`,
            transition: breathPhase === 'in' ? 'all 4s ease-in' : breathPhase === 'hold' ? 'none' : 'all 4s ease-out',
            color: circleColor,
            boxShadow: `0 0 30px ${circleColor}44`,
          }}
        >
          {label}
        </div>
        <p className="text-text-muted text-sm max-w-xs">
          Well done. You connected with the present moment through all 5 senses.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* Sense progress dots */}
      <div className="flex justify-center gap-2">
        {SENSES.map((s, i) => (
          <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
            style={{
              background: i < senseIdx ? '#4ade8022' : i === senseIdx ? s.color + '33' : 'var(--color-surface)',
              border: `2px solid ${i <= senseIdx ? s.color : 'rgba(255,255,255,0.1)'}`,
              transform: i === senseIdx ? 'scale(1.15)' : 'scale(1)',
            }}>
            {i < senseIdx ? '✓' : s.emoji}
          </div>
        ))}
      </div>

      <div className="text-center">
        <div className="text-4xl mb-1">{sense.emoji}</div>
        <h3 className="font-bold text-lg" style={{ color: sense.color }}>
          {sense.count - filled.length} more to go
        </h3>
        <p className="text-text-muted text-sm mt-1">{sense.prompt}</p>
      </div>

      {/* Items so far */}
      <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
        {filled.map((item, i) => (
          <span key={i} className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ background: sense.color + '22', border: `1px solid ${sense.color}44`, color: sense.color }}>
            {item}
          </span>
        ))}
        {Array.from({ length: sense.count - filled.length }).map((_, i) => (
          <span key={`empty-${i}`} className="px-6 py-1 rounded-full text-sm border border-dashed border-white/15 text-transparent">
            …
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={`Name something you can ${sense.title.toLowerCase()}...`}
          className="flex-1 bg-card rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-accent/50 text-text placeholder-text-muted"
          autoFocus
          maxLength={40}
        />
        <button onClick={addItem} disabled={!inputVal.trim() || filled.length >= sense.count}
          className="px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
          style={{ background: sense.color + '33', color: sense.color }}>
          Add
        </button>
      </div>

      <p className="text-center text-xs text-text-muted">
        Step {senseIdx + 1} of {SENSES.length} · 5-4-3-2-1 Grounding
      </p>
    </div>
  );
}
