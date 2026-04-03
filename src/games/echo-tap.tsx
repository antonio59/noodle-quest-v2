import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

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
  11: { beats: 8, tolerance: 185, bpm: 125 },
  12: { beats: 9, tolerance: 170, bpm: 130 },
  13: { beats: 9, tolerance: 155, bpm: 135 },
  14: { beats: 10, tolerance: 140, bpm: 140 },
  15: { beats: 10, tolerance: 125, bpm: 145 },
  16: { beats: 10, tolerance: 115, bpm: 150 },
  17: { beats: 11, tolerance: 105, bpm: 152 },
  18: { beats: 11, tolerance: 95, bpm: 155 },
  19: { beats: 12, tolerance: 88, bpm: 158 },
  20: { beats: 12, tolerance: 80, bpm: 160 },
};

const TIPS = [
  '💡 Tip: Count along with the beats — \'1, 2, 3, 4\' — to lock in the rhythm!',
  '💡 Tip: Tap your foot to the beat before it starts. Get the rhythm in your body.',
  '💡 Tip: Don\'t watch the button — FEEL the beat. Close your eyes if it helps!',
  '💡 Tip: The key is consistency. Same gap between every tap.',
  '💡 Tip: If it feels too fast, take a breath and wait for the next round.',
];

const ROUNDS_NEEDED = 5;

type Phase = 'intro' | 'listening' | 'tapping' | 'evaluating' | 'done';

function playBeatSound(audioCtx: AudioContext, isTap: boolean) {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  if (isTap) {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    click.type = 'square';
    click.frequency.value = 1800;
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    click.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    click.start(now);
    click.stop(now + 0.03);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    const thump = audioCtx.createOscillator();
    const thumpGain = audioCtx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150, now);
    thump.frequency.exponentialRampToValueAtTime(80, now + 0.1);
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

function EchoTapGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const beatInterval = 60000 / config.bpm;
  const tip = useRef(TIPS[Math.floor(Math.random() * TIPS.length)]);

  const [phase, setPhase] = useState<Phase>('intro');
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
  const scoreRef = useRef(0);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeatSequence = useCallback(() => {
    setPhase('listening');
    setTapBtnActive(false);
    setStatusText('🔊 Listen to the rhythm...');
    setStatusColor('#67e8f9');
    setFeedback('');
    // Reset tap times for the new round
    tapTimesRef.current = [];
    setBeatDots(Array(config.beats).fill('off') as Array<'off' | 'on' | 'tap'>);

    const beatTimes: number[] = [];
    let beatCount = 0;

    beatTimerRef.current = setInterval(() => {
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

      playBeatSound(getAudioCtx(), false);

      const thisBeat = beatCount;
      setTimeout(() => {
        setBeatDots(prev => {
          const next = [...prev] as ('off' | 'on' | 'tap')[];
          next[thisBeat] = 'off';
          return next;
        });
      }, beatInterval * 0.4);

      beatCount++;
    }, beatInterval);
  }, [config, beatInterval, getAudioCtx]);

  const startGame = useCallback(() => {
    setScore(0);
    setRound(1);
    setPhase('listening');
    setTimeout(playBeatSequence, 1000);
  }, [playBeatSequence]);

  const advanceRound = useCallback((currentScore: number) => {
    const currentRound = round;
    onProgress(currentRound / ROUNDS_NEEDED);

    if (currentRound >= ROUNDS_NEEDED) {
      setPhase('done');
      setStatusText('🎉 Great rhythm!');
      setStatusColor('#c084fc');

      const stars = currentScore >= 120 ? 3 : currentScore >= 70 ? 2 : 1;
      let summary = `Final score: ${currentScore}. `;
      if (stars === 3) summary += 'Incredible rhythm! You have perfect timing! 🥁';
      else if (stars === 2) summary += 'Good beat! Practice counting along to improve your timing.';
      else summary += 'Rhythm takes practice! Try tapping your foot to the beat first.';
      onEnd({ score: currentScore, stars, summary });
    } else {
      setStatusText('✨ Next round...');
      setPhase('evaluating');
      setRound(r => r + 1);
      setTimeout(playBeatSequence, 1200);
    }
  }, [round, onProgress, onEnd, playBeatSequence]);

  const evaluateRhythm = useCallback((currentScore: number) => {
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
    // Brief visual feedback
    setTapBtnActive(true);

    playBeatSound(getAudioCtx(), true);

    // Light up next beat dot
    const currentBeat = tapTimesRef.current.length - 1;
    setBeatDots(prev => {
      const next = [...prev] as ('off' | 'on' | 'tap')[];
      if (currentBeat < next.length) {
        next[currentBeat] = 'tap';
        setTimeout(() => {
          setBeatDots(p => {
            const n = [...p] as ('off' | 'on' | 'tap')[];
            if (currentBeat < n.length) n[currentBeat] = 'off';
            return n;
          });
        }, 200);
      }
      return next;
    });

    // Update timing bar
    if (patternTimesRef.current.length > 1 && currentBeat > 0) {
      const progress = currentBeat / config.beats;
      setTimingBarPct(progress * 100);
    }

    // Check if done tapping
    if (tapTimesRef.current.length >= config.beats) {
      setTapBtnActive(false);
      setShowTimingBar(false);
      evaluateRhythm(scoreRef.current);
    }
  }, [phase, tapBtnActive, config, getAudioCtx, evaluateRhythm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🥁</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Echo Tap</h2>
        <p className="text-text-dim mb-6 max-w-xs">
          Listen to the beat, then tap to match the <strong>rhythm!</strong>
        </p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="text-info mb-2">🔊 Beat plays with timing gaps</div>
          <div className="text-success mb-2">🥁 You tap to match the rhythm</div>
          <div className="text-warning">⭐ Closer timing = more points!</div>
        </div>

        <div className="bg-surface rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-success text-sm">🔊 Listen → 🥁 Tap along → 🎯 Match the beat!</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 🥁
        </button>
      </div>
    );
  }

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

registerGame('echo-tap', {
  name: 'Echo Tap',
  emoji: '🥁',
  description: 'Tap the buttons to match the rhythm pattern!',
  category: 'focus',
  stages: 20,
  component: EchoTapGame,
});

export default EchoTapGame;
