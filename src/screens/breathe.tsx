import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  bestFor: string;
  bestForEmoji: string;
  steps: { label: string; duration: number; color: string }[];
  rounds: number;
  difficulty: 'easy' | 'medium' | 'hard';
  durationLabel: string;
}

const EXERCISES: Exercise[] = [
  {
    id: 'calm-down',
    name: 'Calm Down',
    emoji: '🌊',
    desc: 'Breathe in 3s, out 5s — the longer exhale calms your nervous system fast',
    bestFor: 'Feeling upset, angry or overwhelmed',
    bestForEmoji: '😤',
    steps: [
      { label: 'Breathe In', duration: 3000, color: '#4ade80' },
      { label: 'Breathe Out', duration: 5000, color: '#67e8f9' },
    ],
    rounds: 5,
    difficulty: 'easy',
    durationLabel: '~1 min',
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    emoji: '📦',
    desc: 'In 4s, hold 4s, out 4s, hold 4s — equal sides like a square',
    bestFor: 'Stress, before a test, or feeling nervous',
    bestForEmoji: '😰',
    steps: [
      { label: 'Breathe In', duration: 4000, color: '#4ade80' },
      { label: 'Hold', duration: 4000, color: '#fbbf24' },
      { label: 'Breathe Out', duration: 4000, color: '#67e8f9' },
      { label: 'Hold', duration: 4000, color: '#fbbf24' },
    ],
    rounds: 4,
    difficulty: 'easy',
    durationLabel: '~2.5 min',
  },
  {
    id: 'focus',
    name: 'Focus Flow',
    emoji: '🎯',
    desc: 'In 4s, out 6s — slows your heart rate and sharpens attention',
    bestFor: 'Before studying, homework, or games',
    bestForEmoji: '📚',
    steps: [
      { label: 'Breathe In', duration: 4000, color: '#4ade80' },
      { label: 'Breathe Out', duration: 6000, color: '#67e8f9' },
    ],
    rounds: 6,
    difficulty: 'easy',
    durationLabel: '~1.5 min',
  },
  {
    id: '4-7-8',
    name: '4-7-8 Relax',
    emoji: '😌',
    desc: 'In 4s, hold 7s, out 8s — powerful for deep relaxation',
    bestFor: 'Trouble sleeping or feeling very anxious',
    bestForEmoji: '😴',
    steps: [
      { label: 'Breathe In', duration: 4000, color: '#4ade80' },
      { label: 'Hold', duration: 7000, color: '#fbbf24' },
      { label: 'Breathe Out', duration: 8000, color: '#67e8f9' },
    ],
    rounds: 4,
    difficulty: 'medium',
    durationLabel: '~3 min',
  },
  {
    id: 'belly-breathing',
    name: 'Belly Breathing',
    emoji: '🫁',
    desc: 'Slow deep belly breaths — put your hand on your tummy and feel it rise',
    bestFor: 'Any time — perfect for beginners!',
    bestForEmoji: '🌟',
    steps: [
      { label: 'Breathe In slowly', duration: 4000, color: '#c084fc' },
      { label: 'Pause', duration: 1000, color: '#fbbf24' },
      { label: 'Breathe Out slowly', duration: 4000, color: '#67e8f9' },
      { label: 'Rest', duration: 1000, color: '#fbbf24' },
    ],
    rounds: 5,
    difficulty: 'easy',
    durationLabel: '~1.5 min',
  },
  {
    id: 'energy-boost',
    name: 'Energy Boost',
    emoji: '⚡',
    desc: 'Short quick breaths then slow out — wakes up your brain',
    bestFor: 'Feeling tired, bored, or sluggish',
    bestForEmoji: '😴',
    steps: [
      { label: 'Quick Breath In', duration: 2000, color: '#fbbf24' },
      { label: 'Breathe Out slowly', duration: 4000, color: '#4ade80' },
    ],
    rounds: 6,
    difficulty: 'easy',
    durationLabel: '~1 min',
  },
  {
    id: 'star-breathing',
    name: 'Star Breathing',
    emoji: '⭐',
    desc: 'Trace a 5-pointed star in your mind — one breath per point',
    bestFor: 'Panic, meltdown, or when everything feels too much',
    bestForEmoji: '🌪️',
    steps: [
      { label: 'Breathe In — point ⬆', duration: 3000, color: '#f472b6' },
      { label: 'Breathe Out — slide ↗', duration: 3000, color: '#67e8f9' },
      { label: 'Breathe In — point ↗', duration: 3000, color: '#f472b6' },
      { label: 'Breathe Out — slide ↙', duration: 3000, color: '#67e8f9' },
      { label: 'Breathe In — point ⬇', duration: 3000, color: '#f472b6' },
    ],
    rounds: 2,
    difficulty: 'medium',
    durationLabel: '~1.5 min',
  },
  {
    id: 'bedtime',
    name: 'Bedtime Wind-Down',
    emoji: '🌙',
    desc: 'Very slow breaths to ease you into sleep',
    bestFor: 'Before bed, or when you cannot sleep',
    bestForEmoji: '🛌',
    steps: [
      { label: 'Breathe In gently', duration: 5000, color: '#818cf8' },
      { label: 'Hold softly', duration: 2000, color: '#c084fc' },
      { label: 'Let it go...', duration: 7000, color: '#67e8f9' },
    ],
    rounds: 5,
    difficulty: 'medium',
    durationLabel: '~3.5 min',
  },
];

const DIFFICULTY_COLORS = {
  easy: 'text-success',
  medium: 'text-warning',
  hard: 'text-danger',
};

const DIFFICULTY_LABELS = {
  easy: 'Beginner',
  medium: 'Intermediate',
  hard: 'Advanced',
};

export function Breathe() {
  const [exercise, setExercise] = useState<Exercise>(EXERCISES[0]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showDetail, setShowDetail] = useState<Exercise | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepStartRef = useRef(0);

  const startExercise = useCallback((ex?: Exercise) => {
    const target = ex ?? exercise;
    if (ex) setExercise(ex);
    setRunning(true);
    setCurrentStep(0);
    setCurrentRound(0);
    setCompleted(false);
    setShowDetail(null);
    stepStartRef.current = Date.now();
    setTimeLeft(target.steps[0].duration);
    setProgress(0);
  }, [exercise]);

  const stopExercise = useCallback(() => {
    setRunning(false);
    setCurrentStep(0);
    setCurrentRound(0);
    setTimeLeft(0);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;

    const step = exercise.steps[currentStep];
    if (!step) return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartRef.current;
      const remaining = Math.max(0, step.duration - elapsed);
      const pct = Math.min(1, elapsed / step.duration);

      setTimeLeft(remaining);
      setProgress(pct);

      if (remaining <= 0) {
        const nextStep = currentStep + 1;
        if (nextStep >= exercise.steps.length) {
          const nextRound = currentRound + 1;
          if (nextRound >= exercise.rounds) {
            setRunning(false);
            setCompleted(true);
            setCurrentStep(0);
            setCurrentRound(0);
            setTimeLeft(0);
            setProgress(0);
            if (timerRef.current) clearInterval(timerRef.current);
            return;
          }
          setCurrentRound(nextRound);
          setCurrentStep(0);
          stepStartRef.current = Date.now();
          setTimeLeft(exercise.steps[0].duration);
          setProgress(0);
        } else {
          setCurrentStep(nextStep);
          stepStartRef.current = Date.now();
          setTimeLeft(exercise.steps[nextStep].duration);
          setProgress(0);
        }
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, currentStep, currentRound, exercise]);

  const currentStepData = exercise.steps[currentStep];

  // Detail modal
  if (showDetail) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0 flex items-center gap-3">
          <button onClick={() => setShowDetail(null)} className="text-text-muted hover:text-text p-1">
            ← Back
          </button>
          <span className="font-bold">{showDetail.emoji} {showDetail.name}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-card rounded-2xl p-5 mb-4">
            <div className="text-5xl mb-3">{showDetail.emoji}</div>
            <h2 className="text-xl font-bold mb-1">{showDetail.name}</h2>
            <p className="text-text-muted text-sm mb-4">{showDetail.desc}</p>

            <div className="bg-surface rounded-xl p-4 mb-4">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Best for</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{showDetail.bestForEmoji}</span>
                <span className="text-sm font-medium">{showDetail.bestFor}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface rounded-xl p-3">
                <div className="text-xs text-text-muted mb-1">Duration</div>
                <div className="font-bold">{showDetail.durationLabel}</div>
              </div>
              <div className="bg-surface rounded-xl p-3">
                <div className="text-xs text-text-muted mb-1">Level</div>
                <div className={`font-bold ${DIFFICULTY_COLORS[showDetail.difficulty]}`}>
                  {DIFFICULTY_LABELS[showDetail.difficulty]}
                </div>
              </div>
            </div>

            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">Steps per round</div>
            <div className="flex flex-col gap-2">
              {showDetail.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface rounded-xl p-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-sm flex-1">{s.label}</span>
                  <span className="text-sm font-bold text-text-muted">{s.duration / 1000}s</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-text-muted mt-3 text-center">{showDetail.rounds} rounds total</div>
          </div>

          <button
            onClick={() => startExercise(showDetail)}
            className="w-full bg-accent text-bg font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 text-lg"
          >
            <Play size={20} /> Start {showDetail.name}
          </button>
        </div>
      </div>
    );
  }

  // Active exercise
  if (running && currentStepData) {
    const isInhale = currentStepData.label.toLowerCase().includes('in');
    const isHold = currentStepData.label.toLowerCase().includes('hold') || currentStepData.label.toLowerCase().includes('pause') || currentStepData.label.toLowerCase().includes('rest');
    const circleScale = isHold ? 0.85 : isInhale ? (0.4 + progress * 0.6) : (1 - progress * 0.6);

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">{exercise.emoji} {exercise.name}</span>
            <span className="text-text-muted text-sm">Round {currentRound + 1}/{exercise.rounds}</span>
          </div>
          <div className="mt-2 h-1.5 bg-card rounded-full">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${((currentRound * exercise.steps.length + currentStep) / (exercise.rounds * exercise.steps.length)) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Breathing circle */}
          <div className="relative w-52 h-52 mb-8 flex items-center justify-center">
            {/* Outer pulse ring */}
            <div
              className="absolute rounded-full"
              style={{
                inset: 0,
                background: currentStepData.color,
                transform: `scale(${circleScale * 1.15})`,
                opacity: 0.15,
                transition: 'transform 0.1s linear',
              }}
            />
            {/* Main circle */}
            <div
              className="absolute rounded-full"
              style={{
                inset: '10%',
                background: currentStepData.color,
                transform: `scale(${circleScale})`,
                opacity: 0.8,
                transition: 'transform 0.1s linear',
              }}
            />
            {/* Text */}
            <div className="relative text-center z-10">
              <div className="text-lg font-bold text-bg drop-shadow">{currentStepData.label}</div>
              <div className="text-3xl font-bold text-bg drop-shadow mt-1">
                {Math.ceil(timeLeft / 1000)}
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 mb-8">
            {exercise.steps.map((s, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === currentStep ? 24 : 8,
                  background: i === currentStep ? s.color : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>

          <button
            onClick={stopExercise}
            className="bg-card text-text font-semibold px-8 py-3 rounded-xl flex items-center gap-2 active:scale-95"
          >
            <Pause size={16} /> Stop
          </button>
        </div>
      </div>
    );
  }

  // Complete screen
  if (completed) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Amazing!</h2>
        <p className="text-text-muted text-sm mb-1">You completed</p>
        <p className="text-accent font-bold text-lg mb-6">{exercise.emoji} {exercise.name}</p>
        <p className="text-text-muted text-xs mb-6 max-w-xs">
          Regular breathing exercises help your brain manage stress and emotions. Keep it up!
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => { setCompleted(false); }}
            className="bg-card text-text font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
          >
            <RotateCcw size={16} /> Pick Another
          </button>
          <button
            onClick={() => startExercise()}
            className="bg-accent text-bg font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
          >
            <Play size={16} /> Do It Again
          </button>
        </div>
      </div>
    );
  }

  // Exercise picker
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">🫧 Breathe & Relax</h1>
        <p className="text-text-muted text-xs mt-1">Pick an exercise — tap for details or press Start</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {EXERCISES.map(e => (
          <div
            key={e.id}
            className={`bg-card rounded-2xl p-4 transition-all ${
              exercise.id === e.id ? 'ring-2 ring-accent' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => setExercise(e)}
                className="text-3xl flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
              >
                {e.emoji}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{e.name}</span>
                  <span className={`text-xs ${DIFFICULTY_COLORS[e.difficulty]}`}>
                    {DIFFICULTY_LABELS[e.difficulty]}
                  </span>
                  <span className="text-text-muted text-xs">{e.durationLabel}</span>
                </div>
                <div className="text-text-muted text-xs mt-1 flex items-center gap-1.5">
                  <span>{e.bestForEmoji}</span>
                  <span className="truncate">{e.bestFor}</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(e)}
                className="text-text-muted hover:text-text text-xs px-2 py-1 rounded-lg hover:bg-surface active:scale-95 flex-shrink-0"
              >
                Info
              </button>
            </div>

            {exercise.id === e.id && (
              <button
                onClick={() => startExercise(e)}
                className="w-full mt-3 bg-accent text-bg font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 text-sm"
              >
                <Play size={16} /> Start {e.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
