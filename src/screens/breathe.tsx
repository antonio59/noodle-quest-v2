import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const EXERCISES = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    emoji: '📦',
    desc: 'Breathe in 4s, hold 4s, out 4s, hold 4s',
    steps: [
      { label: 'Breathe In', duration: 4000, color: '#4ade80' },
      { label: 'Hold', duration: 4000, color: '#fbbf24' },
      { label: 'Breathe Out', duration: 4000, color: '#67e8f9' },
      { label: 'Hold', duration: 4000, color: '#fbbf24' },
    ],
    rounds: 4,
  },
  {
    id: '4-7-8',
    name: '4-7-8 Relax',
    emoji: '😌',
    desc: 'In 4s, hold 7s, out 8s — great for calming down',
    steps: [
      { label: 'Breathe In', duration: 4000, color: '#4ade80' },
      { label: 'Hold', duration: 7000, color: '#fbbf24' },
      { label: 'Breathe Out', duration: 8000, color: '#67e8f9' },
    ],
    rounds: 4,
  },
  {
    id: 'calm-down',
    name: 'Calm Down',
    emoji: '🌊',
    desc: 'Quick 5-breath exercise for when you feel upset',
    steps: [
      { label: 'Breathe In', duration: 3000, color: '#4ade80' },
      { label: 'Breathe Out', duration: 5000, color: '#67e8f9' },
    ],
    rounds: 5,
  },
  {
    id: 'focus',
    name: 'Focus Flow',
    emoji: '🎯',
    desc: 'Steady breathing to help you concentrate',
    steps: [
      { label: 'Breathe In', duration: 4000, color: '#4ade80' },
      { label: 'Breathe Out', duration: 6000, color: '#67e8f9' },
    ],
    rounds: 6,
  },
];

export function Breathe() {
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepStartRef = useRef(0);

  const startExercise = useCallback(() => {
    setRunning(true);
    setCurrentStep(0);
    setCurrentRound(0);
    stepStartRef.current = Date.now();
    setTimeLeft(exercise.steps[0].duration);
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
        // Move to next step
        const nextStep = currentStep + 1;
        if (nextStep >= exercise.steps.length) {
          const nextRound = currentRound + 1;
          if (nextRound >= exercise.rounds) {
            // Done
            setRunning(false);
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
  const isComplete = !running && currentRound >= exercise.rounds;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">🫧 Breathe & Relax</h1>
        <p className="text-text-muted text-xs mt-1">Simple breathing exercises to help you focus and calm down</p>
      </div>

      {/* Exercise selector */}
      {!running && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {EXERCISES.map(e => (
              <button
                key={e.id}
                onClick={() => setExercise(e)}
                className={`bg-card rounded-xl p-4 text-left transition-all active:scale-95 ${
                  exercise.id === e.id ? 'ring-2 ring-accent bg-card-hover' : ''
                }`}
              >
                <div className="text-3xl mb-2">{e.emoji}</div>
                <div className="font-bold text-sm">{e.name}</div>
                <div className="text-text-muted text-xs mt-1">{e.desc}</div>
                <div className="text-text-muted text-xs mt-2">
                  {e.rounds} rounds • {e.steps.length} steps
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-4 bg-accent text-bg font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95"
          >
            <Play size={18} /> Start: {exercise.name}
          </button>
        </div>
      )}

      {/* Active exercise */}
      {running && currentStepData && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-sm text-text-dim mb-2">
            Round {currentRound + 1} / {exercise.rounds}
          </div>

          {/* Breathing circle */}
          <div className="relative w-48 h-48 mb-6">
            <div
              className="absolute inset-0 rounded-full transition-all duration-1000"
              style={{
                background: currentStepData.color,
                transform: `scale(${0.3 + progress * 0.7})`,
                opacity: 0.3,
              }}
            />
            <div
              className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{
                background: currentStepData.color,
                transform: `scale(${0.3 + progress * 0.7})`,
                opacity: 0.5,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-text">{currentStepData.label}</div>
                <div className="text-2xl font-bold text-accent mt-1">
                  {Math.ceil(timeLeft / 1000)}s
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={stopExercise}
              className="bg-card text-text font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
            >
              <Pause size={16} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* Complete */}
      {isComplete && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4 animate-[celebrate_0.5s_ease]">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Well done!</h2>
          <p className="text-text-muted text-sm mb-6">You completed {exercise.name}!</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setExercise(EXERCISES[0]); }}
              className="bg-card text-text font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
            >
              <RotateCcw size={16} /> Pick Another
            </button>
            <button
              onClick={startExercise}
              className="bg-accent text-bg font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
            >
              <Play size={16} /> Do It Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
