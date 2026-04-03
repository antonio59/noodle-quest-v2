import { useState, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface Panel {
  emoji: string;
  text: string;
  order: number;
}

interface Story {
  title: string;
  panels: Panel[];
}

const allStories: Record<number, Story> = {
  1: {
    title: 'The Surprise Gift',
    panels: [
      { emoji: '🎁', text: 'A box appears', order: 1 },
      { emoji: '🤔', text: "What's inside?", order: 2 },
      { emoji: '😺', text: "It's a kitten!", order: 3 },
    ],
  },
  2: {
    title: 'Rainy Day',
    panels: [
      { emoji: '☁️', text: 'Clouds gather', order: 1 },
      { emoji: '🌧️', text: 'Rain falls', order: 2 },
      { emoji: '☔', text: 'Get umbrella', order: 3 },
      { emoji: '🌈', text: 'Rainbow appears!', order: 4 },
    ],
  },
  3: {
    title: 'Planting a Flower',
    panels: [
      { emoji: '🪴', text: 'Get a pot', order: 1 },
      { emoji: '🌱', text: 'Plant the seed', order: 2 },
      { emoji: '💧', text: 'Water it daily', order: 3 },
      { emoji: '☀️', text: 'Give it sunlight', order: 4 },
      { emoji: '🌸', text: 'Flower blooms!', order: 5 },
    ],
  },
  4: {
    title: 'Baking Cookies',
    panels: [
      { emoji: '📖', text: 'Find a recipe', order: 1 },
      { emoji: '🥣', text: 'Mix ingredients', order: 2 },
      { emoji: '🍪', text: 'Shape cookies', order: 3 },
      { emoji: '🔥', text: 'Put in oven', order: 4 },
      { emoji: '😋', text: 'Delicious!', order: 5 },
    ],
  },
  5: {
    title: 'Building a Snowman',
    panels: [
      { emoji: '❄️', text: 'Snow falls', order: 1 },
      { emoji: '⚪', text: 'Roll big ball', order: 2 },
      { emoji: '🔵', text: 'Add medium ball', order: 3 },
      { emoji: '🟡', text: 'Add head', order: 4 },
      { emoji: '🥕', text: 'Add carrot nose', order: 5 },
      { emoji: '⛄', text: 'Snowman done!', order: 6 },
    ],
  },
  6: {
    title: 'Space Journey',
    panels: [
      { emoji: '🚀', text: 'Blast off!', order: 1 },
      { emoji: '🌙', text: 'Pass the moon', order: 2 },
      { emoji: '🪐', text: 'See Saturn', order: 3 },
      { emoji: '👽', text: 'Meet aliens', order: 4 },
      { emoji: '📸', text: 'Take photos', order: 5 },
      { emoji: '🏠', text: 'Return home', order: 6 },
    ],
  },
  7: {
    title: 'The Lost Dog',
    panels: [
      { emoji: '🐕', text: 'Dog runs away', order: 1 },
      { emoji: '😢', text: 'Owner is sad', order: 2 },
      { emoji: '📋', text: 'Make posters', order: 3 },
      { emoji: '🔍', text: 'Search everywhere', order: 4 },
      { emoji: '👀', text: 'Neighbor sees dog', order: 5 },
      { emoji: '📱', text: 'Calls owner', order: 6 },
      { emoji: '🤗', text: 'Reunited!', order: 7 },
    ],
  },
  8: {
    title: 'Birthday Surprise',
    panels: [
      { emoji: '💌', text: 'Send invites', order: 1 },
      { emoji: '🎈', text: 'Decorate', order: 2 },
      { emoji: '🎂', text: 'Bake cake', order: 3 },
      { emoji: '🚪', text: 'Guests arrive', order: 4 },
      { emoji: '😮', text: 'Birthday surprise!', order: 5 },
      { emoji: '🎁', text: 'Open presents', order: 6 },
      { emoji: '🎉', text: 'Party time!', order: 7 },
      { emoji: '😴', text: 'Tired but happy', order: 8 },
    ],
  },
  9: {
    title: 'Science Fair Project',
    panels: [
      { emoji: '💡', text: 'Get an idea', order: 1 },
      { emoji: '📚', text: 'Do research', order: 2 },
      { emoji: '📝', text: 'Write hypothesis', order: 3 },
      { emoji: '🧪', text: 'Do experiment', order: 4 },
      { emoji: '📊', text: 'Record results', order: 5 },
      { emoji: '🖼️', text: 'Make poster', order: 6 },
      { emoji: '🎤', text: 'Present project', order: 7 },
      { emoji: '🏆', text: 'Win a ribbon!', order: 8 },
    ],
  },
  10: {
    title: 'The Camping Trip',
    panels: [
      { emoji: '🗺️', text: 'Plan the trip', order: 1 },
      { emoji: '🎒', text: 'Pack supplies', order: 2 },
      { emoji: '🚗', text: 'Drive to camp', order: 3 },
      { emoji: '⛺', text: 'Set up tent', order: 4 },
      { emoji: '🥾', text: 'Go hiking', order: 5 },
      { emoji: '🐿️', text: 'See wildlife', order: 6 },
      { emoji: '🏕️', text: 'Make campfire', order: 7 },
      { emoji: '🌟', text: 'Watch stars', order: 8 },
      { emoji: '😴', text: 'Sleep in tent', order: 9 },
      { emoji: '🏠', text: 'Head home', order: 10 },
    ],
  },
  11: {
    title: 'The Big Race',
    panels: [
      { emoji: '🏃', text: 'Start training', order: 1 },
      { emoji: '📅', text: 'Sign up for race', order: 2 },
      { emoji: '👟', text: 'Get running shoes', order: 3 },
      { emoji: '🏋️', text: 'Practice daily', order: 4 },
      { emoji: '🥗', text: 'Eat healthy food', order: 5 },
      { emoji: '😴', text: 'Rest before race', order: 6 },
      { emoji: '🏁', text: 'Race day arrives', order: 7 },
      { emoji: '🏃‍♂️', text: 'Run the race', order: 8 },
      { emoji: '🏆', text: 'Cross the finish', order: 9 },
      { emoji: '🎉', text: 'Celebrate!', order: 10 },
      { emoji: '🏅', text: 'Get a medal', order: 11 },
    ],
  },
  12: {
    title: 'The School Play',
    panels: [
      { emoji: '📢', text: 'Auditions announced', order: 1 },
      { emoji: '🎭', text: 'Try out for role', order: 2 },
      { emoji: '📋', text: 'Get the part', order: 3 },
      { emoji: '📖', text: 'Read the script', order: 4 },
      { emoji: '🗣️', text: 'Memorize lines', order: 5 },
      { emoji: '🎬', text: 'Start rehearsals', order: 6 },
      { emoji: '👗', text: 'Get costume', order: 7 },
      { emoji: '💡', text: 'Tech rehearsal', order: 8 },
      { emoji: '🎭', text: 'Opening night', order: 9 },
      { emoji: '👏', text: 'Take a bow', order: 10 },
      { emoji: '🌹', text: 'Get flowers', order: 11 },
      { emoji: '🎊', text: 'Cast party!', order: 12 },
    ],
  },
  13: {
    title: 'The Garden Project',
    panels: [
      { emoji: '💡', text: 'Get the idea', order: 1 },
      { emoji: '📐', text: 'Design the garden', order: 2 },
      { emoji: '🛒', text: 'Buy seeds and tools', order: 3 },
      { emoji: '🏗️', text: 'Clear the area', order: 4 },
      { emoji: '🌱', text: 'Plant the seeds', order: 5 },
      { emoji: '💧', text: 'Water daily', order: 6 },
      { emoji: '☀️', text: 'Wait for sun', order: 7 },
      { emoji: '🌿', text: 'Sprouts appear', order: 8 },
      { emoji: '🌻', text: 'Flowers bloom', order: 9 },
      { emoji: '🐝', text: 'Bees visit', order: 10 },
      { emoji: '📸', text: 'Take photos', order: 11 },
      { emoji: '🏆', text: 'Win garden prize', order: 12 },
      { emoji: '🎉', text: 'Garden party!', order: 13 },
    ],
  },
  14: {
    title: 'The Mystery Book',
    panels: [
      { emoji: '📚', text: 'Find a book', order: 1 },
      { emoji: '📖', text: 'Start reading', order: 2 },
      { emoji: '🔍', text: 'Spot a clue', order: 3 },
      { emoji: '🤔', text: 'Make a guess', order: 4 },
      { emoji: '📝', text: 'Take notes', order: 5 },
      { emoji: '😲', text: 'Plot twist!', order: 6 },
      { emoji: '🧩', text: 'Pieces connect', order: 7 },
      { emoji: '🔎', text: 'Find another clue', order: 8 },
      { emoji: '💡', text: 'Solve the mystery', order: 9 },
      { emoji: '📕', text: 'Finish the book', order: 10 },
      { emoji: '⭐', text: 'Give 5 stars', order: 11 },
      { emoji: '💬', text: 'Tell friends', order: 12 },
      { emoji: '📚', text: 'Read the sequel', order: 13 },
      { emoji: '🎉', text: 'Book club meets', order: 14 },
    ],
  },
  15: {
    title: 'The Road Trip',
    panels: [
      { emoji: '🗺️', text: 'Pick a destination', order: 1 },
      { emoji: '🚗', text: 'Check the car', order: 2 },
      { emoji: '🧳', text: 'Pack bags', order: 3 },
      { emoji: '🍕', text: 'Buy snacks', order: 4 },
      { emoji: '🎵', text: 'Make a playlist', order: 5 },
      { emoji: '🌅', text: 'Leave at dawn', order: 6 },
      { emoji: '🏔️', text: 'See mountains', order: 7 },
      { emoji: '📸', text: 'Take photos', order: 8 },
      { emoji: '🍔', text: 'Stop for lunch', order: 9 },
      { emoji: '🏨', text: 'Check into hotel', order: 10 },
      { emoji: '🏖️', text: 'Reach the beach', order: 11 },
      { emoji: '🌊', text: 'Swim in ocean', order: 12 },
      { emoji: '🌅', text: 'Watch sunset', order: 13 },
      { emoji: '🔥', text: 'Campfire stories', order: 14 },
      { emoji: '😴', text: 'Sleep under stars', order: 15 },
    ],
  },
  16: {
    title: 'The Talent Show',
    panels: [
      { emoji: '📢', text: 'Show announced', order: 1 },
      { emoji: '💡', text: 'Pick your talent', order: 2 },
      { emoji: '🎸', text: 'Start practicing', order: 3 },
      { emoji: '📅', text: 'Sign up', order: 4 },
      { emoji: '🎵', text: 'Perfect the act', order: 5 },
      { emoji: '👔', text: 'Pick an outfit', order: 6 },
      { emoji: '🪞', text: 'Practice in mirror', order: 7 },
      { emoji: '😰', text: 'Get nervous', order: 8 },
      { emoji: '🎤', text: 'Go on stage', order: 9 },
      { emoji: '🎶', text: 'Perform!', order: 10 },
      { emoji: '👏', text: 'Audience cheers', order: 11 },
      { emoji: '🏆', text: 'Win first place', order: 12 },
      { emoji: '📸', text: 'Photo with trophy', order: 13 },
      { emoji: '🎉', text: 'Celebrate with friends', order: 14 },
      { emoji: '🌟', text: 'Feel proud', order: 15 },
      { emoji: '📺', text: 'Watch the replay', order: 16 },
    ],
  },
  17: {
    title: 'The Pet Adoption',
    panels: [
      { emoji: '🐾', text: 'Decide to adopt', order: 1 },
      { emoji: '🏠', text: 'Prepare the house', order: 2 },
      { emoji: '🛒', text: 'Buy pet supplies', order: 3 },
      { emoji: '🏥', text: 'Visit the shelter', order: 4 },
      { emoji: '🐶', text: 'Meet the pets', order: 5 },
      { emoji: '❤️', text: 'Fall in love', order: 6 },
      { emoji: '📝', text: 'Fill out forms', order: 7 },
      { emoji: '🏠', text: 'Bring pet home', order: 8 },
      { emoji: '🛁', text: 'First bath', order: 9 },
      { emoji: '🍖', text: 'First meal together', order: 10 },
      { emoji: '🛏️', text: 'Show them their bed', order: 11 },
      { emoji: '🎾', text: 'Play together', order: 12 },
      { emoji: '😴', text: 'First night together', order: 13 },
      { emoji: '🌅', text: 'First morning', order: 14 },
      { emoji: '📸', text: 'Take adoption photo', order: 15 },
      { emoji: '🎉', text: 'Welcome party', order: 16 },
      { emoji: '💕', text: 'Best friends forever', order: 17 },
    ],
  },
  18: {
    title: 'The Invention',
    panels: [
      { emoji: '💡', text: 'Get an idea', order: 1 },
      { emoji: '📝', text: 'Sketch it out', order: 2 },
      { emoji: '📚', text: 'Research how', order: 3 },
      { emoji: '🔧', text: 'Gather materials', order: 4 },
      { emoji: '🔨', text: 'Build prototype', order: 5 },
      { emoji: '❌', text: 'First try fails', order: 6 },
      { emoji: '🤔', text: 'Figure out why', order: 7 },
      { emoji: '🔧', text: 'Fix the design', order: 8 },
      { emoji: '🔨', text: 'Build again', order: 9 },
      { emoji: '✅', text: 'It works!', order: 10 },
      { emoji: '🧪', text: 'Test it thoroughly', order: 11 },
      { emoji: '📊', text: 'Record results', order: 12 },
      { emoji: '📋', text: 'Write a report', order: 13 },
      { emoji: '🎤', text: 'Present to judges', order: 14 },
      { emoji: '🏆', text: 'Win the prize', order: 15 },
      { emoji: '📰', text: 'Get in the news', order: 16 },
      { emoji: '🚀', text: 'Start a company', order: 17 },
      { emoji: '🌍', text: 'Change the world', order: 18 },
    ],
  },
  19: {
    title: 'The Music Festival',
    panels: [
      { emoji: '🎫', text: 'Buy tickets', order: 1 },
      { emoji: '📅', text: 'Mark the date', order: 2 },
      { emoji: '👕', text: 'Pick outfits', order: 3 },
      { emoji: '🎒', text: 'Pack essentials', order: 4 },
      { emoji: '🚗', text: 'Drive to venue', order: 5 },
      { emoji: '🎪', text: 'Enter the festival', order: 6 },
      { emoji: '🎸', text: 'First band plays', order: 7 },
      { emoji: '💃', text: 'Dance along', order: 8 },
      { emoji: '🍔', text: 'Grab food', order: 9 },
      { emoji: '🎤', text: 'Headline act starts', order: 10 },
      { emoji: '🎶', text: 'Sing along', order: 11 },
      { emoji: '🎆', text: 'Fireworks show', order: 12 },
      { emoji: '🌙', text: 'Late night vibes', order: 13 },
      { emoji: '🏕️', text: 'Sleep at campsite', order: 14 },
      { emoji: '☀️', text: 'Day two begins', order: 15 },
      { emoji: '🎵', text: 'More great music', order: 16 },
      { emoji: '🤝', text: 'Meet new friends', order: 17 },
      { emoji: '🚗', text: 'Drive home tired', order: 18 },
      { emoji: '😴', text: 'Best weekend ever', order: 19 },
    ],
  },
  20: {
    title: 'The Space Mission',
    panels: [
      { emoji: '🎓', text: 'Study hard in school', order: 1 },
      { emoji: '🏋️', text: 'Train physically', order: 2 },
      { emoji: '🚀', text: 'Join space program', order: 3 },
      { emoji: '🧪', text: 'Years of training', order: 4 },
      { emoji: '👨‍🚀', text: 'Become an astronaut', order: 5 },
      { emoji: '📋', text: 'Get mission assigned', order: 6 },
      { emoji: '🔬', text: 'Prepare experiments', order: 7 },
      { emoji: '🏋️', text: 'Final fitness test', order: 8 },
      { emoji: '🚀', text: 'Launch day!', order: 9 },
      { emoji: '🌍', text: 'Leave Earth orbit', order: 10 },
      { emoji: '🌙', text: 'Pass the moon', order: 11 },
      { emoji: '🪐', text: 'Travel to Mars', order: 12 },
      { emoji: '🛸', text: 'Enter Mars orbit', order: 13 },
      { emoji: '🏔️', text: 'Land on surface', order: 14 },
      { emoji: '👣', text: 'First steps', order: 15 },
      { emoji: '🔬', text: 'Collect samples', order: 16 },
      { emoji: '📸', text: 'Take photos', order: 17 },
      { emoji: '🏁', text: 'Plant the flag', order: 18 },
      { emoji: '🚀', text: 'Return journey', order: 19 },
      { emoji: '🌍', text: 'Hero welcome home', order: 20 },
    ],
  },
};

const tips = [
  '💡 Tip: Look for cause and effect — what makes the next thing happen?',
  '💡 Tip: Stories have a beginning, middle, and end. Find the START!',
  '💡 Tip: Think about time — what happens FIRST in the story?',
  '💡 Tip: The last panel usually shows the result or happy ending.',
  '💡 Tip: Tap two panels to swap them around!',
];

type Phase = 'intro' | 'playing' | 'result' | 'done';

function StoryBuilderGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const story = allStories[stage] || allStories[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentOrder, setCurrentOrder] = useState<Panel[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#67e8f9');
  const [resultColors, setResultColors] = useState<(string | null)[]>([]);
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);

  const startGame = useCallback(() => {
    setCurrentOrder([...story.panels].sort(() => Math.random() - 0.5));
    setSelectedIndex(null);
    setFeedback('');
    setFeedbackColor('#67e8f9');
    setResultColors([]);
    setPhase('playing');
  }, [story]);

  const handlePanelTap = useCallback((idx: number) => {
    if (phase !== 'playing') return;
    if (selectedIndex === null) {
      setSelectedIndex(idx);
    } else if (selectedIndex === idx) {
      setSelectedIndex(null);
    } else {
      setCurrentOrder(prev => {
        const next = [...prev];
        const temp = next[selectedIndex!];
        next[selectedIndex!] = next[idx];
        next[idx] = temp;
        return next;
      });
      setSelectedIndex(null);
      setFeedback('Swapped! Keep arranging...');
    }
  }, [phase, selectedIndex]);

  const checkOrder = useCallback(() => {
    let correct = 0;
    currentOrder.forEach((panel, i) => {
      if (panel.order === i + 1) correct++;
    });

    const accuracy = correct / story.panels.length;
    const newScore = Math.round(accuracy * 300);
    onScore(newScore);
    onProgress(accuracy);

    const colors = currentOrder.map((panel, i) =>
      panel.order === i + 1 ? '#4ade80' : '#ff6e6c'
    );
    setResultColors(colors);
    setPhase('result');

    if (accuracy === 1) {
      setFeedback('🎉 Perfect story! You told it perfectly!');
      setFeedbackColor('#4ade80');
      setTimeout(() => {
        onEnd({
          score: newScore + 50,
          stars: 3,
          summary: `Storytelling master! "${story.title}" was in perfect order! You understand how stories flow! 🏆`,
        });
      }, 1200);
    } else {
      setFeedback(`${correct}/${story.panels.length} panels in right order. Green = correct!`);
      setFeedbackColor('#fbbf24');

      let summary: string;
      if (accuracy >= 0.8) {
        summary = `Almost! ${correct}/${story.panels.length} correct. Check the red panels — what should come before/after?`;
      } else {
        summary = `${correct}/${story.panels.length} correct. Think about the story: what happens FIRST? What's the ending?`;
      }

      setTimeout(() => {
        onEnd({ score: newScore, stars: accuracy >= 0.7 ? 2 : 1, summary });
      }, 2500);
    }
  }, [currentOrder, story, onScore, onProgress, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-2xl font-bold text-[#c084fc] mb-2">Story Builder</h2>
        <p className="text-[#a78bfa] mb-4 max-w-xs">Put the comic panels in order to tell the story!</p>
        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-xl text-[#ff6e6c] mb-2">&quot;{story.title}&quot;</div>
          <div className="text-[#67e8f9]">{story.panels.length} panels to arrange</div>
          <div className="flex gap-1 justify-center flex-wrap mt-2">
            {story.panels.map((p, i) => (
              <span key={i} className="text-xl">{p.emoji}</span>
            ))}
          </div>
        </div>
        <p className="text-[#67e8f9] text-sm mb-5 max-w-xs">{tip}</p>
        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Building! 📖
        </button>
      </div>
    );
  }

  const panelWidth = story.panels.length > 6 ? 80 : 95;

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center">
      <div className="px-4 py-2 bg-[#232146] rounded-xl mb-2">
        <span className="text-[#ff6e6c] font-bold">{story.title}</span>
      </div>
      <div className="text-[#67e8f9] text-sm mb-2">Tap two panels to swap them!</div>
      <div className="flex flex-wrap gap-2.5 justify-center p-2 flex-1 content-start">
        {currentOrder.map((panel, i) => {
          const isSelected = selectedIndex === i;
          const borderColor = resultColors[i] || (isSelected ? '#ff6e6c' : '#c084fc');
          const bgColor = resultColors[i] ? `${resultColors[i]}26` : '#232146';
          return (
            <button
              key={`${panel.order}-${i}`}
              onPointerDown={(e) => { e.stopPropagation(); handlePanelTap(i); }}
              disabled={phase !== 'playing'}
              className="rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all p-1.5"
              style={{
                width: panelWidth,
                height: panelWidth + 25,
                background: bgColor,
                border: `3px solid ${borderColor}`,
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <span className={panelWidth > 80 ? 'text-3xl' : 'text-2xl'}>{panel.emoji}</span>
              <span className="text-[0.65rem] text-white text-center leading-tight">{panel.text}</span>
              <span className="text-[0.6rem] text-[#6b7280]">{i + 1}</span>
            </button>
          );
        })}
      </div>
      {phase === 'playing' && (
        <div className="p-2.5">
          <button
            onClick={checkOrder}
            className="bg-[#4ade80] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Tell the Story! ✓
          </button>
        </div>
      )}
      <div className="text-sm min-h-[24px] text-center p-2" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('story-builder', {
  name: 'Story Builder',
  emoji: '📖',
  description: 'Arrange the comic panels to tell the story!',
  category: 'sequence',
  stages: 20,
  component: StoryBuilderGame,
});

export default StoryBuilderGame;
