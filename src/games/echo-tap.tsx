import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

const CONFIG: Record<number, { beats: number; tolerance: number; bpm: number }> = {
  1: { beats: 3, tolerance: 400, bpm: 80 },
  2: { beats: 4, tolerance: 380, bpm: 85 },
  3: { beats: 4, tolerance: 350, bpm: 90 },
  4: { beats: 5, tolerance: 330, bpm: 90 },
  5: { beats: 5, tolerance: 300, bpm: 95 },
  6: { beats: 6, tolerance: 280, bpm: 100 },
  7: { beats: 6, tolerance: 260, bpm: 105 },
  8: { beats: 7, tolerance: 240, bpm: 110 },
  9: { beats: 7, tolerance: 220, bpm: 115 },
  10: { beats: 8, tolerance: 200, bpm: 120 },
};

const ROUNDS_NEEDED = 5;

type Phase = 'listening' | 'tapping' | 'evaluating' | 'done';

const LISTEN_PITCHES = [523, 659, 784, 1047, 880, 988]; // C5, E5, G5, C6, A5, B5
const TAP_PITCHES = [659, 784, 988, 1319, 1175, 1397];   // E5, G5, B5, E6, D6, F6

function playBeatSound(audioCtx: AudioContext, isTap: boolean, beatIndex = 0) {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const pitch = isTap
    ? TAP_PITCHES[beatIndex % TAP_PITCHES.length]
    : LISTEN_PITCHES[beatIndex % LISTEN_PITCHES.length];

  if (isTap) {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    click.type = 'square';
    click.frequency.value = pitch * 1.8;
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    click.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    click.start(now);
    click.stop(now + 0.03);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    const thump = audioCtx.createOscillator();
    const thumpGain = audioCtx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(pitch * 0.25, now);
    thump.frequency.exponentialRampToValueAtTime(pitch * 0.15, now + 0.1);
    thumpGain.gain.setValueAtTime(0.2, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    thump.connect(thumpGain);
    thumpGain.connect(audioCtx.destination);
    thump.start(now);
    thump.stop(now + 0.1);
  }

  if (navigator.vibrate) navigator.vibrate(isTap ? 10 : 20);
}

function getIntervals(times: number[]) {
  const intervals: number[] = [];
  for (let i = 1; i < times.length; i++) {
    intervals.push(times[i] - times[i - 1]);
  }
  return intervals;
}

function EchoTapGame({ stage, onScore, onProgress, onMessage: _onMessage, onEnd }: GameProps) {
  const config = useMemo(() => scaleFromLast(stage, CONFIG, {
    beats: 0.1, tolerance: -0.1, bpm: 0.05,
  }, {
    beats: 12, tolerance: 100, bpm: 160,
  }), [stage]);
  const beatInterval = 60000 / config.bpm;

  const [phase, setPhase] = useState<Phase>('listening');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [statusText, setStatusText] = useState('Get ready...');
  const [statusColor, setStatusColor] = useState('#67e8f9');
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#a78bfa');
  const [beatDots, setBeatDots] = useState<Array<'off' | 'on' | 'tap'>>(Array(config.beats).fill('off'));
  const [tapBtnActive, setTapBtnActive] = useState(false);
  const [timingBarPct, setTimingBarPct] = useState(0);
  const [timingBarColor, setTimingBarColor] = useState('#4ade80');
  const [showTimingBar, setShowTimingBar] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const patternTimesRef = useRef<number[]>([]);
  const tapTimesRef = useRef<number[]>([]);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const finishGame = useCallback((finalScore: number, roundsCompleted: number, perfect: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const ratio = roundsCompleted / ROUNDS_NEEDED;
    const scoreStars = finalScore >= 120 ? 3 : finalScore >= 70 ? 2 : 1;
    const stars = perfect ? scoreStars : ratio >= 0.75 ? Math.min(scoreStars, 2) : 1;
    let summary = `Final score: ${finalScore}. `;
    if (stars === 3) summary += 'Incredible rhythm! You have perfect timing! 🥁';
    else if (stars === 2) summary += 'Good beat! Practice counting along to improve your timing.';
    else summary += 'Rhythm takes practice! Try tapping your foot to the beat first.';
    onEnd({ score: finalScore, stars, summary });
  }, [onEnd]);

  const playBeatSequence = useCallback(() => {
    if (endedRef.current) return;
    setPhase('listening');
    setTapBtnActive(false);
    setStatusText('🔊 Listen to the rhythm...');
    setStatusColor('#67e8f9');
    setFeedback('');
    setBeatDots(Array(config.beats).fill('off') as Array<'off' | 'on' | 'tap'>);
    tapTimesRef.current = [];

    const beatTimes: number[] = [];
    let beatCount = 0;

    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    beatTimerRef.current = setInterval(() => {
      if (endedRef.current) {
        if (beatTimerRef.current) clearInterval(beatTimerRef.current);
        return;
      }
      if (beatCount >= config.beats) {
        if (beatTimerRef.current) clearInterval(beatTimerRef.current);
        patternTimesRef.current = beatTimes;
        setPhase('tapping');
        setTapBtnActive(true);
        setStatusText('🥁 Now YOU tap to match the rhythm!');
        setStatusColor('#4ade80');
        setShowTimingBar(true);
        setTimingBarPct(0);
        setBeatDots(Array(config.beats).fill('off') as Array<'off' | 'on' | 'tap'>);
        return;
      }

      beatTimes.push(performance.now());

      setBeatDots(prev => {
        const next = [...prev] as ('off' | 'on' | 'tap')[];
        next[beatCount] = 'on';
        return next;
      });

      playBeatSound(getAudioCtx(), false, beatCount);

      const thisBeat = beatCount;
      schedule(() => {
        setBeatDots(prev => {
          const next = [...prev] as ('off' | 'on' | 'tap')[];
          next[thisBeat] = 'off';
          return next;
        });
      }, beatInterval * 0.4);

      beatCount++;
    }, beatInterval);
  }, [config, beatInterval, getAudioCtx, schedule]);

  const startGame = useCallback(() => {
    setScore(0);
    setRound(1);
    setPhase('listening');
    schedule(playBeatSequence, 1000);
  }, [playBeatSequence, schedule]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const advanceRound = useCallback((currentScore: number) => {
    if (endedRef.current) return;
    const currentRound = round;
    onProgress(currentRound / ROUNDS_NEEDED);

    if (currentRound >= ROUNDS_NEEDED) {
      setPhase('done');
      setStatusText('🎉 Great rhythm!');
      setStatusColor('#c084fc');
      finishGame(currentScore, currentRound, true);
    } else {
      setStatusText('✨ Next round...');
      setPhase('evaluating');
      setRound(r => r + 1);
      schedule(playBeatSequence, 1200);
    }
  }, [round, onProgress, playBeatSequence, schedule, finishGame]);

  const evaluateRhythm = useCallback((currentScore: number) => {
    if (endedRef.current) return;
    setPhase('evaluating');
    setShowTimingBar(false);

    const patternIntervals = getIntervals(patternTimesRef.current);
    const tapIntervals = getIntervals(tapTimesRef.current);

    if (tapIntervals.length === 0 || patternIntervals.length === 0) {
      const newScore = currentScore + 15;
      setScore(newScore);
      onScore(15);
      setFeedback('✓ Good!');
      setFeedbackColor('#4ade80');
      advanceRound(newScore);
      return;
    }

    let totalError = 0;
    const compared = Math.min(patternIntervals.length, tapIntervals.length);
    for (let i = 0; i < compared; i++) {
      totalError += Math.abs(patternIntervals[i] - tapIntervals[i]);
    }
    const avgError = totalError / compared;

    const accuracy = Math.max(0, Math.min(100, Math.round((1 - avgError / (beatInterval * 1.5)) * 100)));
    setTimingBarPct(accuracy);
    setTimingBarColor(accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#fbbf24' : '#ef4444');

    let points: number;
    let message: string;
    let msgColor: string;
    if (avgError <= config.tolerance * 0.4) {
      points = 30;
      message = '🎯 Perfect rhythm!';
      msgColor = '#4ade80';
    } else if (avgError <= config.tolerance) {
      points = 20;
      message = '👍 Great timing!';
      msgColor = '#4ade80';
    } else if (avgError <= config.tolerance * 1.8) {
      points = 10;
      message = '🤔 Close, but a bit off';
      msgColor = '#fbbf24';
    } else {
      points = 5;
      message = '😅 Way off beat!';
      msgColor = '#ef4444';
    }

    const newScore = currentScore + points;
    setScore(newScore);
    onScore(points);
    setFeedback(`${message} (${accuracy}% accurate, +${points}pts)`);
    setFeedbackColor(msgColor);

    advanceRound(newScore);
  }, [config, beatInterval, onScore, advanceRound]);

  const handleTap = useCallback(() => {
    if (phase !== 'tapping' || !tapBtnActive) return;

    const now = performance.now();
    tapTimesRef.current.push(now);

    setTapBtnActive(false);
    setTapBtnActive(true);

    const currentBeat = tapTimesRef.current.length - 1;
    playBeatSound(getAudioCtx(), true, currentBeat);
    setBeatDots(prev => {
      const next = [...prev] as ('off' | 'on' | 'tap')[];
      if (currentBeat < next.length) {
        next[currentBeat] = 'tap';
      }
      return next;
    });
    schedule(() => {
      setBeatDots(p => {
        const n = [...p] as ('off' | 'on' | 'tap')[];
        if (currentBeat < n.length) n[currentBeat] = 'off';
        return n;
      });
    }, 200);

    if (patternTimesRef.current.length > 1 && currentBeat > 0) {
      const progress = currentBeat / config.beats;
      setTimingBarPct(progress * 100);
    }

    if (tapTimesRef.current.length >= config.beats) {
      setTapBtnActive(false);
      setShowTimingBar(false);
      evaluateRhythm(score);
    }
  }, [phase, tapBtnActive, config, getAudioCtx, evaluateRhythm, score, schedule]);

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round: {round}/{ROUNDS_NEEDED}</span>
        <span className="text-accent">Score: {score}</span>
      </div>

      <div className="text-lg py-2 min-h-[30px]" style={{ color: statusColor }}>
        {statusText}
      </div>

      <div className="flex gap-2.5 py-4 justify-center flex-wrap min-h-[50px]">
        {beatDots.map((state, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full transition-all duration-150"
            style={{
              background: state === 'on' ? '#c084fc' : state === 'tap' ? '#4ade80' : '#232146',
              transform: state !== 'off' ? 'scale(1.4)' : 'scale(1)',
              boxShadow: state === 'on' ? '0 0 14px #c084fc' : state === 'tap' ? '0 0 14px #4ade80' : 'none',
              border: '2px solid #c084fc',
            }}
          />
        ))}
      </div>

      <button
        onPointerDown={handleTap}
        disabled={!tapBtnActive}
        className="w-36 h-36 rounded-full text-5xl border-4 select-none transition-all duration-100 active:scale-90 disabled:opacity-50 mt-4"
        style={{
          borderColor: tapBtnActive ? '#4ade80' : '#c084fc',
          background: 'linear-gradient(135deg, #232146, #2d2a5e)',
          color: '#c084fc',
          boxShadow: '0 4px 0 rgba(0,0,0,0.3)',
        }}
      >
        🥁
      </button>

      {feedback && (
        <div className="text-sm mt-3 text-center" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}

      {showTimingBar && (
        <div className="w-52 h-2 bg-surface rounded mt-2 overflow-hidden">
          <div
            className="h-full rounded transition-all duration-100"
            style={{
              width: `${timingBarPct}%`,
              background: timingBarColor,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default EchoTapGame;
