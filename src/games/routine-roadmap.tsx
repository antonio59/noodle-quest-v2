import { useState, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface Task {
  emoji: string;
  text: string;
  order: number;
}

interface Routine {
  name: string;
  tasks: Task[];
}

const allRoutines: Record<number, Routine> = {
  1: {
    name: 'Morning Wake Up',
    tasks: [
      { emoji: '⏰', text: 'Alarm rings', order: 1 },
      { emoji: '🛏️', text: 'Get out of bed', order: 2 },
      { emoji: '🪥', text: 'Brush teeth', order: 3 },
    ],
  },
  2: {
    name: 'Getting Dressed',
    tasks: [
      { emoji: '🧦', text: 'Put on socks', order: 1 },
      { emoji: '👕', text: 'Put on shirt', order: 2 },
      { emoji: '👖', text: 'Put on pants', order: 3 },
      { emoji: '👟', text: 'Put on shoes', order: 4 },
    ],
  },
  3: {
    name: 'Morning Routine',
    tasks: [
      { emoji: '🛏️', text: 'Wake up', order: 1 },
      { emoji: '🪥', text: 'Brush teeth', order: 2 },
      { emoji: '👕', text: 'Get dressed', order: 3 },
      { emoji: '🥣', text: 'Eat breakfast', order: 4 },
      { emoji: '🎒', text: 'Pack bag', order: 5 },
    ],
  },
  4: {
    name: 'Making a Sandwich',
    tasks: [
      { emoji: '🍞', text: 'Get bread', order: 1 },
      { emoji: '🧈', text: 'Spread butter', order: 2 },
      { emoji: '🧀', text: 'Add cheese', order: 3 },
      { emoji: '🥬', text: 'Add lettuce', order: 4 },
      { emoji: '🍞', text: 'Put top bread', order: 5 },
      { emoji: '🔪', text: 'Cut in half', order: 6 },
    ],
  },
  5: {
    name: 'Baking Cookies',
    tasks: [
      { emoji: '📖', text: 'Read recipe', order: 1 },
      { emoji: '🥣', text: 'Mix ingredients', order: 2 },
      { emoji: '🔥', text: 'Preheat oven', order: 3 },
      { emoji: '🍪', text: 'Shape cookies', order: 4 },
      { emoji: '⏰', text: 'Bake in oven', order: 5 },
      { emoji: '❄️', text: 'Let cool', order: 6 },
      { emoji: '😋', text: 'Enjoy!', order: 7 },
    ],
  },
  6: {
    name: 'Going to School',
    tasks: [
      { emoji: '⏰', text: 'Wake up early', order: 1 },
      { emoji: '🚿', text: 'Take shower', order: 2 },
      { emoji: '👕', text: 'Get dressed', order: 3 },
      { emoji: '🥣', text: 'Eat breakfast', order: 4 },
      { emoji: '🎒', text: 'Pack bag', order: 5 },
      { emoji: '👋', text: 'Say goodbye', order: 6 },
      { emoji: '🚌', text: 'Catch bus', order: 7 },
    ],
  },
  7: {
    name: 'Doing Homework',
    tasks: [
      { emoji: '🏠', text: 'Get home', order: 1 },
      { emoji: '🍎', text: 'Have a snack', order: 2 },
      { emoji: '📚', text: 'Get supplies', order: 3 },
      { emoji: '📝', text: 'Check assignments', order: 4 },
      { emoji: '✏️', text: 'Do homework', order: 5 },
      { emoji: '✅', text: 'Check work', order: 6 },
      { emoji: '🎒', text: 'Pack for tomorrow', order: 7 },
      { emoji: '🎮', text: 'Free time!', order: 8 },
    ],
  },
  8: {
    name: 'Plan Your Day',
    tasks: [
      { emoji: '🌅', text: 'Morning exercise', order: 1 },
      { emoji: '🥣', text: 'Healthy breakfast', order: 2 },
      { emoji: '📚', text: 'Study time', order: 3 },
      { emoji: '🍎', text: 'Healthy lunch', order: 4 },
      { emoji: '🎨', text: 'Creative time', order: 5 },
      { emoji: '🤝', text: 'Help family', order: 6 },
      { emoji: '📖', text: 'Read book', order: 7 },
      { emoji: '🎮', text: 'Game time', order: 8 },
      { emoji: '🌙', text: 'Bedtime routine', order: 9 },
    ],
  },
  9: {
    name: 'Throwing a Party',
    tasks: [
      { emoji: '📅', text: 'Pick a date', order: 1 },
      { emoji: '📝', text: 'Make guest list', order: 2 },
      { emoji: '💌', text: 'Send invitations', order: 3 },
      { emoji: '🛒', text: 'Buy supplies', order: 4 },
      { emoji: '🎈', text: 'Decorate', order: 5 },
      { emoji: '🍰', text: 'Prepare food', order: 6 },
      { emoji: '👋', text: 'Greet guests', order: 7 },
      { emoji: '🎉', text: 'Party time!', order: 8 },
      { emoji: '🧹', text: 'Clean up', order: 9 },
      { emoji: '💤', text: 'Rest!', order: 10 },
    ],
  },
  10: {
    name: 'Science Experiment',
    tasks: [
      { emoji: '❓', text: 'Ask a question', order: 1 },
      { emoji: '📚', text: 'Do research', order: 2 },
      { emoji: '💭', text: 'Make hypothesis', order: 3 },
      { emoji: '📝', text: 'Plan experiment', order: 4 },
      { emoji: '🧪', text: 'Gather materials', order: 5 },
      { emoji: '🔬', text: 'Do experiment', order: 6 },
      { emoji: '📊', text: 'Record results', order: 7 },
      { emoji: '🤔', text: 'Analyze data', order: 8 },
      { emoji: '✅', text: 'Draw conclusion', order: 9 },
      { emoji: '📢', text: 'Share findings', order: 10 },
    ],
  },
  11: {
    name: 'Building a Treehouse',
    tasks: [
      { emoji: '🌳', text: 'Pick a tree', order: 1 },
      { emoji: '📐', text: 'Draw a plan', order: 2 },
      { emoji: '🛒', text: 'Buy wood and nails', order: 3 },
      { emoji: '🔨', text: 'Build the platform', order: 4 },
      { emoji: '🪜', text: 'Add a ladder', order: 5 },
      { emoji: '🏠', text: 'Build the walls', order: 6 },
      { emoji: '🔲', text: 'Add a roof', order: 7 },
      { emoji: '🪟', text: 'Install windows', order: 8 },
      { emoji: '🎨', text: 'Paint it', order: 9 },
      { emoji: '🛋️', text: 'Add furniture', order: 10 },
      { emoji: '🎉', text: 'Housewarming party', order: 11 },
    ],
  },
  12: {
    name: 'Learning to Swim',
    tasks: [
      { emoji: '🏊', text: 'Sign up for lessons', order: 1 },
      { emoji: '🩱', text: 'Get a swimsuit', order: 2 },
      { emoji: '🥽', text: 'Get goggles', order: 3 },
      { emoji: '🏊‍♂️', text: 'Get in the water', order: 4 },
      { emoji: '💨', text: 'Practice blowing bubbles', order: 5 },
      { emoji: '🦵', text: 'Learn to kick', order: 6 },
      { emoji: '💪', text: 'Practice arm strokes', order: 7 },
      { emoji: '🤿', text: 'Try floating', order: 8 },
      { emoji: '🏊', text: 'Swim across the pool', order: 9 },
      { emoji: '🔄', text: 'Learn different strokes', order: 10 },
      { emoji: '🏆', text: 'Pass the swim test', order: 11 },
      { emoji: '🌊', text: 'Swim in the ocean', order: 12 },
    ],
  },
  13: {
    name: 'Starting a Business',
    tasks: [
      { emoji: '💡', text: 'Get a business idea', order: 1 },
      { emoji: '📊', text: 'Research the market', order: 2 },
      { emoji: '📝', text: 'Write a business plan', order: 3 },
      { emoji: '💰', text: 'Get funding', order: 4 },
      { emoji: '📋', text: 'Register the business', order: 5 },
      { emoji: '🏢', text: 'Find a location', order: 6 },
      { emoji: '🛒', text: 'Buy supplies', order: 7 },
      { emoji: '👥', text: 'Hire employees', order: 8 },
      { emoji: '📢', text: 'Advertise', order: 9 },
      { emoji: '🎉', text: 'Grand opening', order: 10 },
      { emoji: '📈', text: 'First customers', order: 11 },
      { emoji: '💵', text: 'First profit', order: 12 },
      { emoji: '🚀', text: 'Expand the business', order: 13 },
    ],
  },
  14: {
    name: 'Training for a Marathon',
    tasks: [
      { emoji: '🏃', text: 'Set a goal', order: 1 },
      { emoji: '👟', text: 'Get running shoes', order: 2 },
      { emoji: '📅', text: 'Make a training plan', order: 3 },
      { emoji: '🏃‍♂️', text: 'Start with short runs', order: 4 },
      { emoji: '📈', text: 'Increase distance weekly', order: 5 },
      { emoji: '🥗', text: 'Eat healthy food', order: 6 },
      { emoji: '💧', text: 'Stay hydrated', order: 7 },
      { emoji: '😴', text: 'Get enough rest', order: 8 },
      { emoji: '🏋️', text: 'Cross-train', order: 9 },
      { emoji: '📏', text: 'Run a half marathon', order: 10 },
      { emoji: '🎽', text: 'Get race gear', order: 11 },
      { emoji: '🏁', text: 'Race day!', order: 12 },
      { emoji: '🏅', text: 'Finish the marathon', order: 13 },
      { emoji: '🎉', text: 'Celebrate!', order: 14 },
    ],
  },
  15: {
    name: 'Writing a Novel',
    tasks: [
      { emoji: '💡', text: 'Get an idea', order: 1 },
      { emoji: '📝', text: 'Outline the story', order: 2 },
      { emoji: '👤', text: 'Create characters', order: 3 },
      { emoji: '🗺️', text: 'Build the world', order: 4 },
      { emoji: '✍️', text: 'Write chapter 1', order: 5 },
      { emoji: '📖', text: 'Write more chapters', order: 6 },
      { emoji: '😰', text: 'Hit writer block', order: 7 },
      { emoji: '☕', text: 'Take a break', order: 8 },
      { emoji: '💪', text: 'Push through', order: 9 },
      { emoji: '📚', text: 'Finish the draft', order: 10 },
      { emoji: '✏️', text: 'Edit and revise', order: 11 },
      { emoji: '👀', text: 'Get feedback', order: 12 },
      { emoji: '📝', text: 'Final edits', order: 13 },
      { emoji: '📕', text: 'Publish the book', order: 14 },
      { emoji: '🎉', text: 'Book launch party', order: 15 },
    ],
  },
  16: {
    name: 'Planning a Wedding',
    tasks: [
      { emoji: '💍', text: 'Get engaged', order: 1 },
      { emoji: '📅', text: 'Set a date', order: 2 },
      { emoji: '💰', text: 'Set a budget', order: 3 },
      { emoji: '📋', text: 'Make a guest list', order: 4 },
      { emoji: '🏛️', text: 'Book the venue', order: 5 },
      { emoji: '👗', text: 'Pick the dress', order: 6 },
      { emoji: '💐', text: 'Choose flowers', order: 7 },
      { emoji: '🎂', text: 'Order the cake', order: 8 },
      { emoji: '🎵', text: 'Pick the music', order: 9 },
      { emoji: '💌', text: 'Send invitations', order: 10 },
      { emoji: '📸', text: 'Hire a photographer', order: 11 },
      { emoji: '🍽️', text: 'Plan the menu', order: 12 },
      { emoji: '🎀', text: 'Decorate the venue', order: 13 },
      { emoji: '💒', text: 'Wedding day!', order: 14 },
      { emoji: '💃', text: 'First dance', order: 15 },
      { emoji: '🎉', text: 'Reception party', order: 16 },
    ],
  },
  17: {
    name: 'Building a Robot',
    tasks: [
      { emoji: '💡', text: 'Design the robot', order: 1 },
      { emoji: '📐', text: 'Draw blueprints', order: 2 },
      { emoji: '🛒', text: 'Buy parts', order: 3 },
      { emoji: '🔧', text: 'Assemble the body', order: 4 },
      { emoji: '⚡', text: 'Wire the circuits', order: 5 },
      { emoji: '🧠', text: 'Install the brain', order: 6 },
      { emoji: '💻', text: 'Write the code', order: 7 },
      { emoji: '🔌', text: 'Power it up', order: 8 },
      { emoji: '🤖', text: 'Test basic movements', order: 9 },
      { emoji: '🐛', text: 'Fix bugs', order: 10 },
      { emoji: '🔄', text: 'Improve the code', order: 11 },
      { emoji: '👀', text: 'Add sensors', order: 12 },
      { emoji: '🗣️', text: 'Add voice commands', order: 13 },
      { emoji: '✅', text: 'Final testing', order: 14 },
      { emoji: '🏆', text: 'Robot competition', order: 15 },
      { emoji: '🎉', text: 'It works!', order: 16 },
      { emoji: '🤖', text: 'Robot does a dance', order: 17 },
    ],
  },
  18: {
    name: 'Creating a Movie',
    tasks: [
      { emoji: '💡', text: 'Get an idea', order: 1 },
      { emoji: '📝', text: 'Write the script', order: 2 },
      { emoji: '💰', text: 'Get funding', order: 3 },
      { emoji: '👥', text: 'Cast the actors', order: 4 },
      { emoji: '📍', text: 'Scout locations', order: 5 },
      { emoji: '🎬', text: 'Start filming', order: 6 },
      { emoji: '🎥', text: 'Shoot scenes', order: 7 },
      { emoji: '🔄', text: 'Reshoot bad takes', order: 8 },
      { emoji: '🎞️', text: 'Edit the footage', order: 9 },
      { emoji: '🎵', text: 'Add music', order: 10 },
      { emoji: '✨', text: 'Add special effects', order: 11 },
      { emoji: '🔊', text: 'Mix sound', order: 12 },
      { emoji: '🎬', text: 'Final cut', order: 13 },
      { emoji: '📢', text: 'Marketing campaign', order: 14 },
      { emoji: '🎟️', text: 'Premiere night', order: 15 },
      { emoji: '🍿', text: 'Audience watches', order: 16 },
      { emoji: '🏆', text: 'Win an award', order: 17 },
      { emoji: '🎉', text: 'Box office hit', order: 18 },
    ],
  },
  19: {
    name: 'Climbing Mount Everest',
    tasks: [
      { emoji: '🏔️', text: 'Dream of the summit', order: 1 },
      { emoji: '🏋️', text: 'Start training', order: 2 },
      { emoji: '🥾', text: 'Get climbing gear', order: 3 },
      { emoji: '📋', text: 'Get permits', order: 4 },
      { emoji: '✈️', text: 'Fly to Nepal', order: 5 },
      { emoji: '🚶', text: 'Trek to base camp', order: 6 },
      { emoji: '🏕️', text: 'Set up base camp', order: 7 },
      { emoji: '🧗', text: 'Acclimatize to altitude', order: 8 },
      { emoji: '🏔️', text: 'Climb to Camp 1', order: 9 },
      { emoji: '🏔️', text: 'Climb to Camp 2', order: 10 },
      { emoji: '🏔️', text: 'Climb to Camp 3', order: 11 },
      { emoji: '🏔️', text: 'Climb to Camp 4', order: 12 },
      { emoji: '😰', text: 'Face the death zone', order: 13 },
      { emoji: '🌅', text: 'Start summit push', order: 14 },
      { emoji: '🏔️', text: 'Reach the summit', order: 15 },
      { emoji: '📸', text: 'Take summit photo', order: 16 },
      { emoji: '⬇️', text: 'Descend safely', order: 17 },
      { emoji: '🏕️', text: 'Return to base camp', order: 18 },
      { emoji: '🎉', text: 'Celebrate!', order: 19 },
    ],
  },
  20: {
    name: 'Building a Theme Park',
    tasks: [
      { emoji: '💡', text: 'Get the idea', order: 1 },
      { emoji: '📐', text: 'Design the park', order: 2 },
      { emoji: '💰', text: 'Secure funding', order: 3 },
      { emoji: '🏗️', text: 'Buy the land', order: 4 },
      { emoji: '🚜', text: 'Clear and level ground', order: 5 },
      { emoji: '🏗️', text: 'Build the rides', order: 6 },
      { emoji: '🎢', text: 'Install roller coasters', order: 7 },
      { emoji: '🎠', text: 'Add classic rides', order: 8 },
      { emoji: '🍔', text: 'Build restaurants', order: 9 },
      { emoji: '🎁', text: 'Set up gift shops', order: 10 },
      { emoji: '🌳', text: 'Landscaping', order: 11 },
      { emoji: '🎨', text: 'Paint and decorate', order: 12 },
      { emoji: '🧪', text: 'Test all rides', order: 13 },
      { emoji: '👥', text: 'Hire staff', order: 14 },
      { emoji: '📢', text: 'Marketing campaign', order: 15 },
      { emoji: '🎟️', text: 'Soft opening', order: 16 },
      { emoji: '🎉', text: 'Grand opening!', order: 17 },
      { emoji: '🎢', text: 'First riders scream', order: 18 },
      { emoji: '😊', text: 'Kids have fun', order: 19 },
      { emoji: '🏆', text: 'Park of the year', order: 20 },
    ],
  },
};

const tips = [
  '💡 Tip: Think about what HAS to happen FIRST before other things can happen.',
  "💡 Tip: Look for clues — you can't eat cookies before baking them!",
  '💡 Tip: Imagine yourself doing the activity — what would you do first?',
  '💡 Tip: Some tasks are obvious firsts (wake up) or lasts (enjoy/clean up).',
  '💡 Tip: If stuck, start with what you KNOW is first or last!',
];

type Phase = 'intro' | 'playing' | 'result' | 'done';

function RoutineRoadmapGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const routine = allRoutines[stage] || allRoutines[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentOrder, setCurrentOrder] = useState<Task[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#67e8f9');
  const [resultColors, setResultColors] = useState<(string | null)[]>([]);
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);
  const draggedItem = useRef<number | null>(null);
  const touchStartY = useRef(0);

  const startGame = useCallback(() => {
    setCurrentOrder([...routine.tasks].sort(() => Math.random() - 0.5));
    setFeedback('');
    setFeedbackColor('#67e8f9');
    setResultColors([]);
    setPhase('playing');
  }, [routine]);

  const handleDragStart = useCallback((idx: number) => {
    draggedItem.current = idx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (draggedItem.current !== null && draggedItem.current !== idx) {
      setCurrentOrder(prev => {
        const next = [...prev];
        const temp = next[draggedItem.current!];
        next.splice(draggedItem.current!, 1);
        next.splice(idx, 0, temp);
        return next;
      });
    }
    draggedItem.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, idx: number) => {
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    const itemHeight = 56;
    const moveItems = Math.round(deltaY / itemHeight);
    const newIdx = Math.max(0, Math.min(currentOrder.length - 1, idx + moveItems));

    if (newIdx !== idx) {
      setCurrentOrder(prev => {
        const next = [...prev];
        const temp = next[idx];
        next.splice(idx, 1);
        next.splice(newIdx, 0, temp);
        return next;
      });
    }
  }, [currentOrder.length]);

  const checkOrder = useCallback(() => {
    let correct = 0;
    currentOrder.forEach((task, i) => {
      if (task.order === i + 1) correct++;
    });

    const accuracy = correct / routine.tasks.length;
    const newScore = Math.round(accuracy * 300);
    onScore(newScore);
    onProgress(accuracy);

    const colors = currentOrder.map((task, i) =>
      task.order === i + 1 ? '#4ade80' : '#ff6e6c'
    );
    setResultColors(colors);
    setPhase('result');

    if (accuracy === 1) {
      setFeedback('🎉 Perfect order! You nailed it!');
      setFeedbackColor('#4ade80');
      setTimeout(() => {
        onEnd({
          score: newScore + 50,
          stars: 3,
          summary: `Perfect! You put "${routine.name}" in exactly the right order! Great sequencing skills! 🏆`,
        });
      }, 1200);
    } else {
      setFeedback(`${correct}/${routine.tasks.length} in the right place. Green = correct!`);
      setFeedbackColor('#fbbf24');

      let summary: string;
      if (accuracy >= 0.8) {
        summary = `Almost perfect! ${correct}/${routine.tasks.length} correct. Look at the red items — what should come before/after them?`;
      } else if (accuracy >= 0.5) {
        summary = `${correct}/${routine.tasks.length} correct. Think about what MUST happen first before other things can happen.`;
      } else {
        summary = `${correct}/${routine.tasks.length} correct. Imagine doing "${routine.name}" yourself — what would you do first?`;
      }

      setTimeout(() => {
        onEnd({
          score: newScore,
          stars: accuracy >= 0.8 ? 2 : 1,
          summary,
        });
      }, 2500);
    }
  }, [currentOrder, routine, onScore, onProgress, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-2xl font-bold text-[#fbbf24] mb-2">Routine Roadmap</h2>
        <p className="text-[#fcd34d] mb-4 max-w-xs">Put the tasks in the right order!</p>
        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-xl text-[#fbbf24] mb-2">{routine.name}</div>
          <div className="text-[#67e8f9]">{routine.tasks.length} steps to put in order</div>
          <div className="flex gap-1 justify-center flex-wrap mt-2">
            {routine.tasks.map((t, i) => (
              <span key={i} className="text-xl">{t.emoji}</span>
            ))}
          </div>
        </div>
        <div className="bg-[#1a1833] rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-[#4ade80] text-sm">Drag tasks up/down to reorder them!</div>
        </div>
        <p className="text-[#67e8f9] text-sm mb-5 max-w-xs">{tip}</p>
        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Ordering! 📋
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center">
      <div className="px-4 py-2 bg-[#232146] rounded-xl mb-2 text-center">
        <span className="text-[#fbbf24] font-bold">{routine.name}</span>
      </div>
      <div className="text-[#67e8f9] text-sm mb-2">Drag to put in order! First at top.</div>
      <div className="flex flex-col gap-1.5 w-full max-w-sm flex-1 overflow-y-auto p-1">
        {currentOrder.map((task, i) => {
          const borderColor = resultColors[i] || '#c084fc';
          const bgColor = resultColors[i] ? `${resultColors[i]}26` : '#232146';
          return (
            <div
              key={`${task.order}-${i}`}
              draggable={phase === 'playing'}
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
              onTouchStart={(e) => handleTouchStart(e)}
              onTouchEnd={(e) => handleTouchEnd(e, i)}
              className="p-2.5 px-3.5 rounded-lg flex items-center gap-2.5 transition-all select-none"
              style={{
                background: bgColor,
                border: `2px solid ${borderColor}`,
                cursor: phase === 'playing' ? 'grab' : 'default',
              }}
            >
              <span className="text-[#6b7280] text-sm min-w-[20px]">{i + 1}.</span>
              <span className="text-2xl">{task.emoji}</span>
              <span className="flex-1 text-white text-[0.95rem]">{task.text}</span>
              <span className="text-[#67e8f9] text-lg">☰</span>
            </div>
          );
        })}
      </div>
      {phase === 'playing' && (
        <div className="flex gap-3 p-2.5">
          <button
            onClick={checkOrder}
            className="bg-[#4ade80] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Check Order! ✓
          </button>
        </div>
      )}
      <div className="text-sm min-h-[24px] text-center p-2" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('routine-roadmap', {
  name: 'Routine Roadmap',
  emoji: '📋',
  description: 'Put the daily tasks in the right order!',
  category: 'sequence',
  stages: 20,
  component: RoutineRoadmapGame,
});

export default RoutineRoadmapGame;
