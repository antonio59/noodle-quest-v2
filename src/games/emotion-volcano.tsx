import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const allScenarios: Record<number, { trigger: string; emoji: string; heat: number }[]> = {
  1: [
    { trigger: 'Someone took the last cookie you wanted', emoji: '🍪', heat: 40 },
    { trigger: 'Your game froze and you lost progress', emoji: '🎮', heat: 50 },
  ],
  2: [
    { trigger: "Your sibling is being really annoying", emoji: '😤', heat: 45 },
    { trigger: "You can't find your favorite toy", emoji: '🧸', heat: 40 },
    { trigger: 'Someone said something mean', emoji: '💬', heat: 55 },
  ],
  3: [
    { trigger: 'You have to stop playing to do homework', emoji: '📚', heat: 45 },
    { trigger: 'Your friend cancelled your playdate', emoji: '😞', heat: 50 },
    { trigger: 'You made a mistake in front of everyone', emoji: '😳', heat: 60 },
  ],
  4: [
    { trigger: "Someone blamed you for something you didn't do", emoji: '😠', heat: 65 },
    { trigger: 'Your project got ruined by accident', emoji: '🎨', heat: 55 },
    { trigger: 'You lost an important game', emoji: '⚽', heat: 50 },
    { trigger: 'No one wants to play what you want', emoji: '🎯', heat: 45 },
  ],
  5: [
    { trigger: 'Your sibling got something you wanted', emoji: '🎁', heat: 55 },
    { trigger: 'Someone cut in front of you in line', emoji: '😤', heat: 50 },
    { trigger: 'You studied hard but got a bad grade', emoji: '📝', heat: 65 },
    { trigger: 'Your best friend is playing with someone else', emoji: '👫', heat: 60 },
  ],
  6: [
    { trigger: "You got blamed for your sibling's mess", emoji: '🗑️', heat: 70 },
    { trigger: 'Someone laughed at your idea', emoji: '💡', heat: 60 },
    { trigger: "You weren't picked for the team", emoji: '🏀', heat: 65 },
    { trigger: 'Your parents said no to something you really wanted', emoji: '🙅', heat: 55 },
  ],
  7: [
    { trigger: 'Someone shared your secret', emoji: '🤫', heat: 75 },
    { trigger: 'You feel like no one is listening to you', emoji: '🗣️', heat: 65 },
    { trigger: 'Everything is going wrong today', emoji: '😫', heat: 70 },
    { trigger: "You're being compared to someone else", emoji: '⚖️', heat: 60 },
  ],
  8: [
    { trigger: "You worked really hard but didn't win", emoji: '🏆', heat: 70 },
    { trigger: 'Someone broke your favorite thing', emoji: '💔', heat: 75 },
    { trigger: 'You feel left out of a group', emoji: '😔', heat: 65 },
    { trigger: 'Adults are treating you unfairly', emoji: '⚖️', heat: 70 },
    { trigger: "You can't do something everyone else can", emoji: '😰', heat: 60 },
  ],
  9: [
    { trigger: 'Someone is spreading rumors about you', emoji: '📢', heat: 80 },
    { trigger: 'You feel embarrassed in front of everyone', emoji: '😳', heat: 75 },
    { trigger: 'Things keep going wrong no matter what you try', emoji: '🌧️', heat: 70 },
    { trigger: 'Someone you trust let you down', emoji: '💔', heat: 75 },
    { trigger: "You're overwhelmed with too much to do", emoji: '📚', heat: 65 },
  ],
  10: [
    { trigger: 'Everything feels unfair and overwhelming', emoji: '😤', heat: 85 },
    { trigger: "You feel really angry but don't know why", emoji: '🌋', heat: 80 },
    { trigger: 'Someone hurt your feelings badly', emoji: '💔', heat: 85 },
    { trigger: 'You feel like giving up on everything', emoji: '😢', heat: 75 },
    { trigger: 'Multiple bad things happened at once', emoji: '⛈️', heat: 80 },
  ],
};

const coolingStrategies = [
  { name: 'Deep Breaths', emoji: '🌬️', power: 20, tip: 'Breathe in for 4, hold for 4, out for 4' },
  { name: 'Count to 10', emoji: '🔢', power: 15, tip: 'Slowly count and feel calmer with each number' },
  { name: 'Walk Away', emoji: '🚶', power: 25, tip: 'Take a break and come back when calm' },
  { name: 'Squeeze & Release', emoji: '✊', power: 18, tip: 'Squeeze your fists tight, then relax them' },
  { name: 'Talk It Out', emoji: '💬', power: 22, tip: 'Tell someone how you feel' },
  { name: 'Think Happy Thoughts', emoji: '🌈', power: 15, tip: 'Remember something that makes you smile' },
  { name: 'Drink Water', emoji: '💧', power: 12, tip: 'A cool drink can help you cool down!' },
  { name: 'Move Your Body', emoji: '🏃', power: 20, tip: 'Jump, stretch, or dance it out!' },
];

const tips = [
  "💡 Everyone's volcano rumbles sometimes — it's what you DO that matters!",
  '💡 Noticing your feelings getting big is the FIRST step to cooling down.',
  '💡 Different strategies work for different people. Find YOUR favorites!',
  "💡 It's okay to feel angry. It's NOT okay to hurt others.",
  '💡 Cooling down takes practice. You\'re getting better every time!',
];

type Phase = 'intro' | 'playing' | 'cooldown' | 'done';

function getHeatDisplay(heat: number) {
  if (heat >= 60) return { text: '🔥 Still hot! Keep going!', color: '#ff6e6c' };
  if (heat >= 30) return { text: '🌡️ Getting better...', color: '#fbbf24' };
  return { text: '❄️ Cooled down!', color: '#4ade80' };
}

function EmotionVolcanoGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const cycledStage = ((stage - 1) % 10) + 1;
  const scenarios = allScenarios[cycledStage] || allScenarios[1];
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState(0);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [heat, setHeat] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#67e8f9');
  const [usedStrategies, setUsedStrategies] = useState<Set<number>>(new Set());
  const [strategies, setStrategies] = useState<typeof coolingStrategies>([]);
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);
  const heatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

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

  const cleanup = useCallback(() => {
    if (heatIntervalRef.current) {
      clearInterval(heatIntervalRef.current);
      heatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      if (heatIntervalRef.current) {
        clearInterval(heatIntervalRef.current);
        heatIntervalRef.current = null;
      }
    };
  }, []);

  const advanceScenario = useCallback((currentScore: number) => {
    cleanup();
    const next = currentScenario + 1;
    onProgress(next / scenarios.length);
    if (next >= scenarios.length) {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase('done');
      const stars = currentScore >= 200 ? 3 : currentScore >= 120 ? 2 : 1;
      let summary = 'You practiced cooling down your volcano! ';
      if (stars === 3) summary += 'Amazing emotional regulation! You know lots of ways to calm big feelings. Use these in real life too! 🌟';
      else if (stars === 2) summary += 'Good work! Remember these strategies when you feel your volcano heating up in real life!';
      else summary += 'Keep practicing! The more you use calming strategies, the easier they become!';
      onEnd({ score: currentScore, stars, summary });
    } else {
      setCurrentScenario(next);
      const scenario = scenarios[next];
      setHeat(scenario.heat);
      setFeedback('');
      setFeedbackColor('#67e8f9');
      setUsedStrategies(new Set());
      setStrategies([...coolingStrategies].sort(() => Math.random() - 0.5).slice(0, 4));
    }
  }, [currentScenario, scenarios, cleanup, onProgress, onEnd]);

  const startScenario = useCallback((idx: number) => {
    cleanup();
    const scenario = scenarios[idx];
    setHeat(scenario.heat);
    setFeedback('');
    setFeedbackColor('#67e8f9');
    setUsedStrategies(new Set());
    setStrategies([...coolingStrategies].sort(() => Math.random() - 0.5).slice(0, 4));
    setPhase('playing');
  }, [scenarios, cleanup]);

  // Auto-heat increase
  useEffect(() => {
    if (phase !== 'playing') return;
    const heatIntervalMs = Math.max(400, 1500 - (stage - 1) * 20);
    heatIntervalRef.current = setInterval(() => {
      setHeat(prev => {
        const next = Math.min(100, prev + 2);
        if (next >= 100) {
          cleanup();
          setFeedback("When feelings get too big, we might say or do things we regret. Next time, start cooling sooner!");
          setFeedbackColor('#fbbf24');
          setPhase('cooldown');
          schedule(() => advanceScenario(scoreRef.current), 3000);
        }
        return next;
      });
    }, heatIntervalMs);
    return cleanup;
  }, [phase, cleanup, advanceScenario, schedule]);

  const handleStrategy = useCallback((strat: typeof coolingStrategies[number], idx: number) => {
    if (phase !== 'playing' || usedStrategies.has(idx)) return;

    setUsedStrategies(prev => new Set(prev).add(idx));
    setHeat(prev => {
      const next = Math.max(0, prev - strat.power);
      if (next < 30) {
        cleanup();
        setPhase('cooldown');
        scoreRef.current += 40;
        setScore(scoreRef.current);
        schedule(() => advanceScenario(scoreRef.current), 1500);
      }
      return next;
    });
    scoreRef.current += 10;
    setScore(scoreRef.current);
    onScore(10);
    setFeedback(`${strat.emoji} ${strat.tip}`);
    setFeedbackColor('#4ade80');
  }, [phase, usedStrategies, onScore, cleanup, advanceScenario, schedule]);

  // Derive heat display at render time
  const heatDisplay = getHeatDisplay(heat);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🌋</div>
        <h2 className="text-2xl font-bold text-[#ff6e6c] mb-2">Emotion Volcano</h2>
        <p className="text-[#fca5a5] mb-4 max-w-xs">Keep your volcano from erupting using calming strategies!</p>
        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-[#fbbf24] mb-2">When something frustrating happens...</div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-[60px] bg-gradient-to-b from-[#ff6e6c] to-[#dc2626]" style={{ clipPath: 'polygon(20% 100%, 80% 100%, 100% 60%, 90% 30%, 70% 0%, 30% 0%, 10% 30%, 0% 60%)' }} />
            <span className="text-[#ff6e6c] text-2xl">→</span>
            <div className="flex gap-1">
              <span className="text-2xl">🌬️</span>
              <span className="text-2xl">🔢</span>
              <span className="text-2xl">🚶</span>
            </div>
            <span className="text-[#4ade80] text-2xl">→</span>
            <div className="w-10 h-[60px] bg-gradient-to-b from-[#4ade80] to-[#166534]" style={{ clipPath: 'polygon(20% 100%, 80% 100%, 100% 60%, 90% 30%, 70% 0%, 30% 0%, 10% 30%, 0% 60%)' }} />
          </div>
          <div className="text-[#4ade80]">...use strategies to cool down! ❄️</div>
        </div>
        <p className="text-[#67e8f9] text-sm mb-5 max-w-xs">{tip}</p>
        <button
          onClick={() => { startScenario(0); }}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Cooling! ❄️
        </button>
      </div>
    );
  }

  const scenario = scenarios[currentScenario];
  const lavaHeight = `${heat}%`;

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center p-3">
      <div className="flex gap-4 px-3 py-1.5 bg-[#232146] rounded-lg mb-2">
        <span className="text-[#ff6e6c] font-bold">Situation {currentScenario + 1}/{scenarios.length}</span>
        <span className="text-[#fbbf24]">Score: {score}</span>
      </div>

      <div className="bg-[#2d1f1f] rounded-xl p-3 text-center w-full max-w-xs mb-2">
        <div className="text-3xl mb-1">{scenario.emoji}</div>
        <div className="text-white text-[0.95rem]">{scenario.trigger}</div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-[60px] h-[100px]">
          <div
            className="absolute bottom-0 w-full h-full bg-[#333]"
            style={{ clipPath: 'polygon(20% 100%, 80% 100%, 100% 60%, 90% 30%, 70% 0%, 30% 0%, 10% 30%, 0% 60%)' }}
          />
          <div
            className="absolute bottom-0 w-full transition-[height] duration-300"
            style={{
              height: lavaHeight,
              background: 'linear-gradient(180deg,#ff6e6c,#dc2626)',
              clipPath: 'polygon(20% 100%, 80% 100%, 100% 60%, 90% 30%, 70% 0%, 30% 0%, 10% 30%, 0% 60%)',
            }}
          />
        </div>
        <div className="text-left">
          <div className="text-2xl font-bold" style={{ color: heatDisplay.color }}>{heat}%</div>
          <div className="text-[#a78bfa] text-xs">Frustration Level</div>
          <div className="text-sm mt-1" style={{ color: heatDisplay.color }}>{heatDisplay.text}</div>
        </div>
      </div>

      <div className="text-[#67e8f9] text-xs mb-1.5">Tap strategies to cool down below 30%:</div>

      <div className="grid grid-cols-2 gap-1.5 w-full max-w-xs">
        {strategies.map((strat, idx) => {
          const used = usedStrategies.has(idx);
          return (
            <button
              key={idx}
              onClick={() => handleStrategy(strat, idx)}
              disabled={used || phase !== 'playing'}
              className="border-2 border-[#67e8f9] text-white p-2.5 rounded-lg text-sm flex flex-col items-center gap-0.5 transition-all"
              style={{
                background: used ? '#166534' : '#232146',
                borderColor: used ? '#4ade80' : '#67e8f9',
                opacity: used ? 0.7 : 1,
              }}
            >
              <span className="text-2xl">{strat.emoji}</span>
              <span>{strat.name}</span>
            </button>
          );
        })}
      </div>

      <div className="text-sm min-h-[40px] text-center p-2 max-w-xs mt-1" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

export default EmotionVolcanoGame;
