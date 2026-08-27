import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameProps } from '@/types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const GRID_SIZE = 3;
const POSITIONS = GRID_SIZE * GRID_SIZE; // 9

function getN(stage: number): number {
  if (stage <= 2) return 1;
  if (stage <= 5) return 2;
  return 3;
}

function rand(max: number) { return Math.floor(Math.random() * max); }

interface Trial { pos: number; letter: string }

function buildSequence(length: number): Trial[] {
  return Array.from({ length }, () => ({
    pos: rand(POSITIONS),
    letter: LETTERS[rand(LETTERS.length)],
  }));
}

type Phase = 'intro' | 'show' | 'respond' | 'feedback' | 'done';

const TOTAL_TRIALS = 20;
const SHOW_MS   = 2000;
const RESPOND_MS = 2000;

export default function DualNBackGame({ stage, onScore, onProgress, onEnd, onMessage }: GameProps) {
  const n = useMemo(() => getN(stage), [stage]);
  const sequence = useMemo(() => buildSequence(TOTAL_TRIALS + n), [n]);

  const [phase, setPhase]           = useState<Phase>('intro');
  const [trialIdx, setTrialIdx]     = useState(n); // first answerable trial
  const [score, setScore]           = useState(0);
  const [posPressed, setPosPressed] = useState(false);
  const [letPressed, setLetPressed] = useState(false);
  const [feedback, setFeedback]     = useState<{ pos: 'hit'|'miss'|'fa'|null; let: 'hit'|'miss'|'fa'|null } | null>(null);

  const endedRef      = useRef(false);
  const timersRef     = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onEndRef      = useRef(onEnd);
  const onScoreRef    = useRef(onScore);
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
    return () => { endedRef.current = true; timersRef.current.forEach(clearTimeout); };
  }, []);

  const current = sequence[trialIdx];
  const nBack   = sequence[trialIdx - n];
  const posMatch = current?.pos    === nBack?.pos;
  const letMatch = current?.letter === nBack?.letter;

  const scoreRound = useCallback((pressedPos: boolean, pressedLet: boolean) => {
    const posResult: 'hit' | 'miss' | 'fa' =
      posMatch && pressedPos ? 'hit' : !posMatch && !pressedPos ? 'hit' :
      posMatch && !pressedPos ? 'miss' : 'fa';
    const letResult: 'hit' | 'miss' | 'fa' =
      letMatch && pressedLet ? 'hit' : !letMatch && !pressedLet ? 'hit' :
      letMatch && !pressedLet ? 'miss' : 'fa';

    setFeedback({ pos: posResult, let: letResult });

    let pts = 0;
    if (posResult === 'hit') pts += 8;
    if (letResult === 'hit') pts += 8;
    if (posResult === 'miss' || posResult === 'fa') pts -= 3;
    if (letResult === 'miss' || letResult === 'fa') pts -= 3;
    pts = Math.max(0, pts);

    const newScore = score + pts;
    setScore(newScore);
    if (pts > 0) onScoreRef.current(pts);

    const answeredTrials = trialIdx - n + 1;
    onProgressRef.current(Math.min(answeredTrials / TOTAL_TRIALS, 1));

    schedule(() => {
      setFeedback(null);
      const nextIdx = trialIdx + 1;
      if (nextIdx >= sequence.length) {
        if (endedRef.current) return;
        endedRef.current = true;
        const pct = newScore / (TOTAL_TRIALS * 16);
        const stars = pct >= 0.75 ? 3 : pct >= 0.5 ? 2 : 1;
        onEndRef.current({ score: newScore, stars, summary: `Completed N-Back (N=${n}). Score: ${newScore}` });
      } else {
        setTrialIdx(nextIdx);
        setPosPressed(false);
        setLetPressed(false);
        setPhase('show');
      }
    }, 800);
  }, [posMatch, letMatch, score, trialIdx, n, sequence, schedule]);

  // Game loop driven by phase
  useEffect(() => {
    if (phase !== 'show') return;

    const answeredTrials = trialIdx - n + 1;
    onMessageRef.current(`N-Back ${n}: Remember ${n} step${n > 1 ? 's' : ''} back`);

    const t = schedule(() => {
      setPhase('respond');
      const t2 = schedule(() => {
        scoreRound(posPressed, letPressed);
        setPhase('feedback');
      }, RESPOND_MS);
      return t2;
    }, SHOW_MS);

    return undefined;
  }, [phase, trialIdx]);

  const startGame = useCallback(() => {
    setTrialIdx(n);
    setPosPressed(false);
    setLetPressed(false);
    setFeedback(null);
    setScore(0);
    setPhase('show');
  }, [n]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-5xl">🧠</div>
        <h2 className="text-2xl font-bold text-accent">Dual N-Back</h2>
        <div className="bg-card rounded-2xl p-4 max-w-xs w-full space-y-2 text-sm text-text-muted">
          <p>A cell will <span className="text-text font-bold">light up</span> and a <span className="text-text font-bold">letter</span> will appear each round.</p>
          <p>Press <span className="text-accent font-bold">Position</span> if the position matches {n} turn{n > 1 ? 's' : ''} ago.</p>
          <p>Press <span className="text-warning font-bold">Letter</span> if the letter matches {n} turn{n > 1 ? 's' : ''} ago.</p>
          <p className="text-xs">You can press both, one, or neither!</p>
        </div>
        <div className="text-text-muted text-sm">N = {n} · {TOTAL_TRIALS} trials · Stage {stage}</div>
        <button onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all">
          Start 🧠
        </button>
      </div>
    );
  }

  const answeredCount = trialIdx - n;
  const timerPct = phase === 'show' ? 1 : phase === 'respond' ? 0.5 : 0;

  return (
    <div className="h-full flex flex-col items-center p-4 gap-3">
      <div className="flex justify-between items-center w-full">
        <span className="text-xs text-text-muted font-bold">Trial {Math.max(1, answeredCount)}/{TOTAL_TRIALS}</span>
        <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">N = {n}</span>
        <span className="bg-accent/20 text-accent rounded-lg px-2 py-0.5 text-sm font-bold">{score} pts</span>
      </div>

      <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(answeredCount / TOTAL_TRIALS) * 100}%`, background: 'linear-gradient(90deg,var(--color-accent),#67e8f9)' }} />
      </div>

      {/* Letter display */}
      <div className="w-20 h-16 rounded-2xl flex items-center justify-center text-4xl font-black bg-card border-2 border-white/10">
        {phase === 'show' ? current?.letter : '?'}
      </div>

      {/* 3x3 grid */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: POSITIONS }).map((_, i) => {
          const isActive = phase === 'show' && current?.pos === i;
          return (
            <div key={i} className="w-16 h-16 rounded-xl transition-all duration-150"
              style={{
                background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                boxShadow: isActive ? '0 0 20px var(--color-accent)' : 'none',
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
              }} />
          );
        })}
      </div>

      {/* Response buttons */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => { if (phase === 'respond') setPosPressed(true); }}
          disabled={phase !== 'respond' || posPressed}
          className="px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-90 disabled:opacity-50"
          style={{
            background: posPressed ? 'rgba(167,139,250,0.4)' : feedback?.pos === 'hit' ? 'rgba(74,222,128,0.3)' : feedback?.pos ? 'rgba(239,68,68,0.3)' : 'rgba(167,139,250,0.2)',
            border: `2px solid ${posPressed || feedback?.pos === 'hit' ? '#f0a83a' : feedback?.pos ? '#ef4444' : '#f0a83a44'}`,
            color: '#f0a83a',
          }}
        >
          📍 Position
          {feedback?.pos && <span className="ml-1 text-xs">{feedback.pos === 'hit' ? '✓' : feedback.pos === 'miss' ? 'miss' : 'wrong'}</span>}
        </button>
        <button
          onClick={() => { if (phase === 'respond') setLetPressed(true); }}
          disabled={phase !== 'respond' || letPressed}
          className="px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-90 disabled:opacity-50"
          style={{
            background: letPressed ? 'rgba(251,191,36,0.4)' : feedback?.let === 'hit' ? 'rgba(74,222,128,0.3)' : feedback?.let ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.2)',
            border: `2px solid ${letPressed || feedback?.let === 'hit' ? '#fbbf24' : feedback?.let ? '#ef4444' : '#fbbf2444'}`,
            color: '#fbbf24',
          }}
        >
          🔤 Letter
          {feedback?.let && <span className="ml-1 text-xs">{feedback.let === 'hit' ? '✓' : feedback.let === 'miss' ? 'miss' : 'wrong'}</span>}
        </button>
      </div>

      <p className="text-xs text-text-muted text-center">
        {phase === 'show' ? 'Watch and remember...' : phase === 'respond' ? 'Does it match ' + n + ' step' + (n > 1 ? 's' : '') + ' ago?' : ''}
      </p>
    </div>
  );
}
