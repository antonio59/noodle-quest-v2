import { useState, useEffect } from 'react';
import { Play, Stars, Brain, Gamepad2, Music, Zap } from 'lucide-react';

interface LandingProps {
  onLogin: () => void;
}

const GAME_EMOJIS = ['🐱', '🃏', '🧠', '🔢', '🎯', '🫧', '🎨', '🔴', '🐍', '⚫', '📝', '⚡', '🔍', '🔤', '🎮'];

const FEATURES = [
  { icon: Brain, title: '40+ Games', desc: 'Brain training, board games, puzzles, and more', color: 'text-accent' },
  { icon: Stars, title: '20 Stages Each', desc: 'Progressive difficulty from easy to expert', color: 'text-warning' },
  { icon: Gamepad2, title: 'AI Opponents', desc: 'Play board games against smart AI anytime', color: 'text-success' },
  { icon: Music, title: 'Focus Tracks', desc: 'Lo-fi beats and calming sounds to play along', color: 'text-primary' },
];

export function Landing({ onLogin }: LandingProps) {
  const [currentEmoji, setCurrentEmoji] = useState(0);
  const [bounceKey, setBounceKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEmoji(prev => (prev + 1) % GAME_EMOJIS.length);
      setBounceKey(k => k + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        {/* Animated emoji carousel */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div
            key={bounceKey}
            className="relative text-7xl animate-[pop-in_0.5s_ease]"
          >
            {GAME_EMOJIS[currentEmoji]}
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold mb-2">
          <span className="bg-gradient-to-r from-accent via-primary to-success bg-clip-text text-transparent">
            Noodle Quest
          </span>
        </h1>
        <p className="text-text-dim text-lg mb-2">Brain games for the whole family</p>
        <p className="text-text-muted text-sm mb-8 max-w-xs">
          40+ games to train your focus, memory, and problem-solving. Play solo or challenge friends!
        </p>

        <button
          onClick={onLogin}
          className="bg-accent text-bg font-bold px-10 py-4 rounded-xl text-lg hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-accent/20"
        >
          <Play size={20} fill="currentColor" /> Start Playing
        </button>
      </div>

      {/* Features grid */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-card rounded-xl p-4 border border-white/5"
            >
              <f.icon className={`mx-auto mb-2 ${f.color}`} size={28} />
              <div className="font-bold text-sm mb-1">{f.title}</div>
              <div className="text-text-muted text-xs leading-tight">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Game preview marquee */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-text-dim mb-3 flex items-center gap-2">
            <Zap size={14} className="text-accent" /> What you'll play
          </h2>
          <div className="overflow-hidden">
            <div className="flex gap-3 animate-[scroll-left_30s_linear_infinite] w-max">
              {[...GAME_EMOJIS, ...GAME_EMOJIS].map((emoji, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl p-3 text-center min-w-[70px] border border-white/5"
                >
                  <div className="text-2xl mb-1">{emoji}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl p-6 text-center border border-accent/10 mb-8">
          <div className="text-3xl mb-3">🎮</div>
          <h3 className="text-lg font-bold mb-2">Ready to train your brain?</h3>
          <p className="text-text-muted text-sm mb-4">
            Join thousands of players improving their focus, memory, and problem-solving skills every day.
          </p>
          <button
            onClick={onLogin}
            className="bg-accent text-bg font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all active:scale-95"
          >
            Get Started — It's Free!
          </button>
        </div>

        <div className="text-center text-text-muted text-xs pb-4">
          Made with ❤️ for curious minds ages 7+
        </div>
      </div>
    </div>
  );
}
