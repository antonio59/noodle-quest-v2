import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameProps } from '@/types';

const TOTAL_TRIALS = 30;
const SHOW_MS      = 700;   // circle visible for 700ms
const ITI_MS       = 600;   // inter-trial interval

type Signal = 'go' | 'stop';
type TrialResult = 'correct-go' | 'correct-stop' | 'false-alarm' | 'miss' | null;
type Phase = 'intro' | 'iti' | 'signal' | 'result' | 'done';

function buildTrials(goRatio: number): Signal[] {
  const trials: Signal[] = [];
  for (let i = 0; i < TOTAL_TRIALS; i++) {
    trials.push(Math.random() < goRatio ? 'go' : 'stop');
  }
  return trials;
}

export default function GoNoGoGame({ stage, onScore, onProgress, onEnd, onMessage }: GameProps) {
  const goRatio = Math.max(0.5, 0.75 - stage * 0.02); // More stop signals at higher stages
  const windowMs = Math.max(400, SHOW_MS - stage * 15); // Shorter window at higher stages

  const trials = useMemo(() => buildTrials(goRatio), [goRatio]);

  const [phase, setPhase]     = useState<Phase>('intro');
  const [ti, setTi]           = useState(0);
  const [score, setScore]     = useState(0);
  const [trialResult, setTrialResult] = useState<TrialResult>(null);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [stats, setStats]     = useState({ hits: 0, misses: 0, falseAlarms: 0, correct: 0 });

  const endedRef      = useRef(false);
  const signalStartRef = useRef(0);
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

  const endGame = useCallback((finalScore: number, finalStats: typeof stats) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const accuracy = (finalStats.hits + finalStats.correct) / TOTAL_TRIALS;
    const stars = accuracy >= 0.85 ? 3 : accuracy >= 0.65 ? 2 : 1;
    const summary = `${finalStats.hits} correct taps, ${finalStats.correct} correct stops. Score: ${finalScore}`;
    onEndRef.current({ score: finalScore, stars, summary });
  }, []);

  const advanceTrial = useCallback((nextTi: number, currentScore: number, currentStats: typeof stats) => {
    if (nextTi >= TOTAL_TRIALS) {
      setPhase('done');
      endGame(currentScore, currentStats);
      return;
    }
    onProgressRef.current(nextTi / TOTAL_TRIALS);
    setTi(nextTi);
    setTrialResult(null);
    setReactionMs(null);
    setPhase('iti');

    schedule(() => {
      signalStartRef.current = performance.now();
      setPhase('signal');

      schedule(() => {
        // time expired — if GO, it's a miss; if STOP, correct stop
        setPhase('result');
        const signal = trials[nextTi];
        if (signal === 'go') {
          const newStats = { ...currentStats, misses: currentStats.misses + 1 };
          setStats(newStats);
          setTrialResult('miss');
          onMessageRef.current('Too slow! 😅');
          schedule(() => advanceTrial(nextTi + 1, currentScore, newStats), 500);
        } else {
          const pts = 5;
          const newScore = currentScore + pts;
          const newStats = { ...currentStats, correct: currentStats.correct + 1 };
          setScore(newScore);
          setStats(newStats);
          onScoreRef.current(pts);
          setTrialResult('correct-stop');
          onMessageRef.current('Good restraint! 🧠');
          schedule(() => advanceTrial(nextTi + 1, newScore, newStats), 500);
        }
      }, windowMs);
    }, ITI_MS);
  }, [trials, windowMs, schedule, endGame]);

  const handleTap = useCallback(() => {
    if (phase !== 'signal' || !trials[ti]) return;
    const rt = Math.round(performance.now() - signalStartRef.current);
    setReactionMs(rt);

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const signal = trials[ti];
    setPhase('result');

    if (signal === 'go') {
      const speedBonus = rt < 250 ? 5 : rt < 400 ? 3 : 0;
      const pts = 10 + speedBonus;
      const newScore = score + pts;
      const newStats = { ...stats, hits: stats.hits + 1 };
      setScore(newScore);
      setStats(newStats);
      onScoreRef.current(pts);
      setTrialResult('correct-go');
      onMessageRef.current(rt < 250 ? `⚡ Blazing! +${pts}` : `✓ Tapped! +${pts}`);
      schedule(() => advanceTrial(ti + 1, newScore, newStats), 500);
    } else {
      const newScore = Math.max(0, score - 10);
      const newStats = { ...stats, falseAlarms: stats.falseAlarms + 1 };
      setScore(newScore);
      setStats(newStats);
      setTrialResult('false-alarm');
      onMessageRef.current('⚠️ That was STOP! -10');
      schedule(() => advanceTrial(ti + 1, newScore, newStats), 600);
    }
  }, [phase, trials, ti, score, stats, schedule, advanceTrial]);

  const startGame = useCallback(() => {
    setScore(0);
    setStats({ hits: 0, misses: 0, falseAlarms: 0, correct: 0 });
    advanceTrial(0, 0, { hits: 0, misses: 0, falseAlarms: 0, correct: 0 });
  }, [advanceTrial]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-5xl">🚦</div>
        <h2 className="text-2xl font-bold text-accent">Go / No-Go</h2>
        <div className="bg-card rounded-2xl p-4 max-w-xs w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex-shrink-0 shadow-lg" style={{ background: '#22c55e', boxShadow: '0 0 20px #22c55e' }} />
            <span className="text-sm text-text text-left"><span className="text-emerald-400 font-bold">Green</span> = Tap as fast as you can!</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex-shrink-0 shadow-lg" style={{ background: '#ef4444', boxShadow: '0 0 20px #ef4444' }} />
            <span className="text-sm text-text text-left"><span className="text-red-400 font-bold">Red</span> = Don&apos;t tap! Hold back.</span>
          </div>
        </div>
        <div className="text-text-muted text-sm">{TOTAL_TRIALS} signals · Stage {stage}</div>
        <button onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all">
          Ready! 🚦
        </button>
      </div>
    );
  }

  const signal = trials[ti];
  const circleColor = signal === 'go' ? '#22c55e' : '#ef4444';
  const showCircle  = phase === 'signal';
  const resultColor = trialResult === 'correct-go' || trialResult === 'correct-stop' ? '#4ade80' : '#ef4444';

  return (
    <div className="h-full flex flex-col items-center p-4 gap-3" onPointerDown={handleTap}>
      <div className="flex justify-between items-center w-full">
        <span className="text-sm font-bold text-text-muted">{ti + 1}/{TOTAL_TRIALS}</span>
        <span className="bg-accent/20 text-accent rounded-lg px-2.5 py-1 text-sm font-bold">{score} pts</span>
      </div>

      <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${(ti / TOTAL_TRIALS) * 100}%`, background: 'linear-gradient(90deg,var(--color-accent),#67e8f9)' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Signal circle */}
        <div
          className="w-44 h-44 rounded-full transition-all duration-100 flex items-center justify-center"
          style={{
            background: showCircle ? circleColor : 'var(--color-surface)',
            boxShadow: showCircle ? `0 0 60px ${circleColor}99, 0 0 120px ${circleColor}44` : 'none',
            transform: showCircle ? 'scale(1.05)' : 'scale(0.9)',
            opacity: phase === 'iti' ? 0.2 : 1,
          }}
        >
          {showCircle && (
            <span className="text-4xl select-none pointer-events-none">
              {signal === 'go' ? '✓' : '✗'}
            </span>
          )}
        </div>

        {/* Result text */}
        {trialResult && (
          <div className="font-bold text-lg text-center" style={{ color: resultColor }}>
            {trialResult === 'correct-go'    && `✓ Tapped! ${reactionMs ? `(${reactionMs}ms)` : ''}`}
            {trialResult === 'correct-stop'  && '✓ Nice restraint!'}
            {trialResult === 'miss'          && '✗ Too slow!'}
            {trialResult === 'false-alarm'   && '⚠️ False alarm!'}
          </div>
        )}

        {phase === 'iti' && (
          <div className="text-text-muted text-sm">Get ready...</div>
        )}
      </div>

      <div className="flex gap-6 text-xs text-text-muted pb-2">
        <span>✓ Taps: {stats.hits}</span>
        <span>✓ Stops: {stats.correct}</span>
        <span>✗ FA: {stats.falseAlarms}</span>
        <span>✗ Miss: {stats.misses}</span>
      </div>
    </div>
  );
}
