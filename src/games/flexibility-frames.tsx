import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

interface Rule {
  name: string;
  check: (color: string, shape: string) => boolean;
  color: string;
}

const ALL_RULES: Rule[] = [
  { name: 'Tap RED shapes!', check: (c) => c === '#ff6e6c', color: '#ff6e6c' },
  { name: 'Tap BLUE shapes!', check: (c) => c === '#67e8f9', color: '#67e8f9' },
  { name: 'Tap GREEN shapes!', check: (c) => c === '#4ade80', color: '#4ade80' },
  { name: 'Tap PURPLE shapes!', check: (c) => c === '#c084fc', color: '#c084fc' },
  { name: 'Tap only CIRCLES!', check: (_c, s) => s === 'circle', color: '#fbbf24' },
  { name: 'Tap only SQUARES!', check: (_c, s) => s === 'square', color: '#fbbf24' },
  { name: 'Tap RED circles!', check: (c, s) => c === '#ff6e6c' && s === 'circle', color: '#ff6e6c' },
  { name: 'Tap BLUE squares!', check: (c, s) => c === '#67e8f9' && s === 'square', color: '#67e8f9' },
  { name: 'Tap GREEN circles!', check: (c, s) => c === '#4ade80' && s === 'circle', color: '#4ade80' },
  { name: 'Tap PURPLE squares!', check: (c, s) => c === '#c084fc' && s === 'square', color: '#c084fc' },
];

const STAGE_RULES: Record<number, Rule[]> = {
  1: [ALL_RULES[0], ALL_RULES[1]],
  2: [ALL_RULES[0], ALL_RULES[1], ALL_RULES[2]],
  3: [ALL_RULES[0], ALL_RULES[2], ALL_RULES[4]],
  4: [ALL_RULES[0], ALL_RULES[1], ALL_RULES[4], ALL_RULES[5]],
  5: [ALL_RULES[6], ALL_RULES[7], ALL_RULES[2]],
  6: [ALL_RULES[6], ALL_RULES[7], ALL_RULES[8]],
  7: [ALL_RULES[6], ALL_RULES[7], ALL_RULES[8], ALL_RULES[9]],
  8: [ALL_RULES[6], ALL_RULES[7], ALL_RULES[8], ALL_RULES[9], ALL_RULES[4]],
  9: [ALL_RULES[6], ALL_RULES[7], ALL_RULES[8], ALL_RULES[9], ALL_RULES[4], ALL_RULES[5]],
  10: ALL_RULES,
};

const STAGE_CONFIG: Record<number, { spawnRate: number; ruleChange: number; duration: number }> = {
  1: { spawnRate: 1200, ruleChange: 15000, duration: 30000 },
  2: { spawnRate: 1100, ruleChange: 14000, duration: 32000 },
  3: { spawnRate: 1000, ruleChange: 13000, duration: 34000 },
  4: { spawnRate: 950, ruleChange: 12000, duration: 35000 },
  5: { spawnRate: 900, ruleChange: 11000, duration: 36000 },
  6: { spawnRate: 850, ruleChange: 10000, duration: 38000 },
  7: { spawnRate: 800, ruleChange: 9000, duration: 40000 },
  8: { spawnRate: 750, ruleChange: 8000, duration: 42000 },
  9: { spawnRate: 700, ruleChange: 7000, duration: 44000 },
  10: { spawnRate: 650, ruleChange: 6000, duration: 45000 },
};

const COLORS = ['#ff6e6c', '#c084fc', '#67e8f9', '#4ade80'];
const SHAPE_TYPES = ['circle', 'square'];

interface GameItem {
  id: number;
  color: string;
  shape: string;
  size: number;
  x: number;
  y: number;
  popping: boolean;
}

type Phase = 'playing' | 'done';

function FlexibilityFramesGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const cycledStage = ((stage - 1) % 10) + 1;
  const rules = STAGE_RULES[cycledStage] || ALL_RULES;
  const config = useMemo(() => scaleFromLast(stage, STAGE_CONFIG, {
    spawnRate: -0.15, ruleChange: -0.1, duration: 0.1,
  }, {
    spawnRate: 400, ruleChange: 3, duration: 70000,
  }), [stage]);
  const [phase, setPhase] = useState<Phase>('playing');
  const [currentRuleIdx, setCurrentRuleIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctClicks, setCorrectClicks] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [items, setItems] = useState<GameItem[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#67e8f9');
  const [rulePulse, setRulePulse] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const itemIdRef = useRef(0);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const ruleIdxRef = useRef(0);
  const gameActiveRef = useRef(false);

  const currentRule = rules[currentRuleIdx];

  const spawnItem = useCallback(() => {
    if (!gameActiveRef.current || !gameAreaRef.current) return;
    const area = gameAreaRef.current;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const shape = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    const size = 45 + Math.random() * 25;
    const maxX = Math.max(50, area.clientWidth - size);
    const maxY = Math.max(50, area.clientHeight - size);

    const item: GameItem = {
      id: itemIdRef.current++,
      color,
      shape,
      size,
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      popping: false,
    };

    setItems(prev => [...prev, item]);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== item.id));
    }, 4500);
  }, []);

  const handleItemClick = useCallback(
    (item: GameItem) => {
      if (!gameActiveRef.current) return;
      const rule = rules[ruleIdxRef.current];
      const correct = rule.check(item.color, item.shape);

      totalRef.current++;
      setTotalClicks(totalRef.current);

      if (correct) {
        correctRef.current++;
        setCorrectClicks(correctRef.current);
        scoreRef.current += 15;
        setScore(scoreRef.current);
        onScore(15);

        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, popping: true } : i)),
        );
        setTimeout(() => {
          setItems(prev => prev.filter(i => i.id !== item.id));
        }, 250);

        if (correctRef.current % 5 === 0) {
          const msgs = ['Flexible mind! 🧠', 'Quick adapter! ⚡', 'Rule master! 👑'];
          setFeedback(msgs[Math.floor(Math.random() * 3)]);
        } else {
          setFeedback('+15 Correct! ✓');
        }
        setFeedbackColor('#67e8f9');
      } else {
        setCorrectClicks(correctRef.current);
        scoreRef.current = Math.max(0, scoreRef.current - 8);
        setScore(scoreRef.current);
        setFeedback(`💡 Remember: ${rules[ruleIdxRef.current].name}`);
        setFeedbackColor('#fbbf24');

        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, popping: true } : i)),
        );
        setTimeout(() => {
          setItems(prev => prev.filter(i => i.id !== item.id));
        }, 250);
      }
    },
    [rules, onScore],
  );

  const changeRule = useCallback(() => {
    if (!gameActiveRef.current) return;
    const newIdx = (ruleIdxRef.current + 1) % rules.length;
    ruleIdxRef.current = newIdx;
    setCurrentRuleIdx(newIdx);
    setRulePulse(true);
    setFeedback('🔄 RULE CHANGED! Read the new rule!');
    setFeedbackColor('#fbbf24');
    onMessage(rules[newIdx].name);
    setTimeout(() => {
      setRulePulse(false);
      setFeedbackColor('#67e8f9');
    }, 2000);
  }, [rules, onMessage]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    setPhase('playing');
    setScore(0);
    setCorrectClicks(0);
    setTotalClicks(0);
    setCurrentRuleIdx(0);
    setItems([]);
    setFeedback('');
    scoreRef.current = 0;
    correctRef.current = 0;
    totalRef.current = 0;
    ruleIdxRef.current = 0;
    itemIdRef.current = 0;
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (phase !== 'playing') return;

    gameActiveRef.current = true;

    const spawnInterval = setInterval(spawnItem, config.spawnRate);
    const ruleInterval = setInterval(changeRule, config.ruleChange);
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (gameActiveRef.current) {
        onProgress(Math.min((Date.now() - startTime) / config.duration, 1));
      }
    }, 500);
    const gameTimeout = setTimeout(() => {
      gameActiveRef.current = false;
      clearInterval(spawnInterval);
      clearInterval(ruleInterval);

      const accuracy = totalRef.current > 0 ? correctRef.current / totalRef.current : 0;
      const stars = accuracy > 0.7 ? 3 : accuracy > 0.45 ? 2 : 1;

      let summary = `You got ${correctRef.current} right out of ${totalRef.current}! `;
      if (accuracy > 0.7) {
        summary += 'Super flexible brain! You adapted to every rule change like a champ! 🌟';
      } else if (accuracy > 0.45) {
        summary += 'Good adapting! Try pausing when rules change to read them clearly.';
      } else {
        summary += 'Keep practicing! Say the new rule out loud when it changes — it helps!';
      }

      setPhase('done');
      onProgress(1);
      onEnd({ score: scoreRef.current, stars, summary });
    }, config.duration);

    return () => {
      gameActiveRef.current = false;
      clearInterval(spawnInterval);
      clearInterval(ruleInterval);
      clearInterval(progressInterval);
      clearTimeout(gameTimeout);
    };
  }, [phase, config, spawnItem, changeRule, onProgress, onEnd]);

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div
        className={`text-lg font-bold text-center py-3 px-4 bg-card rounded-t-xl transition-all ${
          rulePulse ? 'animate-pulse scale-105' : ''
        }`}
        style={{ color: currentRule?.color }}
      >
        {currentRule?.name}
      </div>

      <div className="flex justify-between px-4 py-1.5 bg-surface">
        <span className="text-success font-bold">✓ {correctClicks}</span>
        <span className="text-warning text-sm">Score: {score}</span>
        <span className="text-danger font-bold">✗ {totalClicks - correctClicks}</span>
      </div>

      <div
        ref={gameAreaRef}
        className="flex-1 min-h-[250px] relative bg-bg overflow-hidden"
      >
        {items.map(item => (
          <div
            key={item.id}
            onPointerDown={e => {
              e.stopPropagation();
              handleItemClick(item);
            }}
            className="absolute cursor-pointer select-none"
            style={{
              width: item.size,
              height: item.size,
              left: item.x,
              top: item.y,
              background: item.color,
              borderRadius: item.shape === 'circle' ? '50%' : '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s',
              animation: item.popping ? 'pop-in 0.25s forwards' : undefined,
            }}
          />
        ))}
      </div>

      <div
        className="text-center py-2 text-sm min-h-[24px] bg-card rounded-b-xl"
        style={{ color: feedbackColor }}
      >
        {feedback}
      </div>
    </div>
  );
}

export default FlexibilityFramesGame;
