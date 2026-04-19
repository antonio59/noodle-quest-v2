import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Target,
  Zap,
  Hand,
  RefreshCw,
  Heart,
  ListOrdered,
  Gamepad2,
  Users,
  Wind,
  Music,
  Sparkles,
  Star,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

const BRAIN_CATEGORIES = [
  {
    icon: Target,
    label: 'Focus',
    desc: 'Sharpen attention and block out distractions with precision-based challenges.',
    color: 'text-accent',
  },
  {
    icon: Brain,
    label: 'Memory',
    desc: 'Strengthen working memory and recall through progressive matching games.',
    color: 'text-primary',
  },
  {
    icon: Hand,
    label: 'Motor',
    desc: 'Improve reaction time and hand-eye coordination with timed physical tasks.',
    color: 'text-success',
  },
  {
    icon: RefreshCw,
    label: 'Flexibility',
    desc: 'Boost cognitive switching and mental adaptability under changing rules.',
    color: 'text-warning',
  },
  {
    icon: Heart,
    label: 'Social',
    desc: 'Build emotional intelligence, empathy, and social awareness interactively.',
    color: 'text-danger',
  },
  {
    icon: ListOrdered,
    label: 'Sequence',
    desc: 'Develop pattern recognition, planning, and logical ordering skills.',
    color: 'text-accent',
  },
];

const BOARD_GAMES = [
  'Tic-Tac-Toe',
  'Checkers',
  'Chess',
  'Connect Four',
  'Ludo',
  'Snakes & Ladders',
  'Crossword',
  'Word Search',
  'Bingo',
  'UNO',
  'Scrabble',
];

const BREATHING_EXERCISES = [
  {
    name: 'Box Breathing',
    desc: 'Used by Navy SEALs to stay calm under pressure — inhale, hold, exhale, hold in equal counts.',
  },
  {
    name: 'Coherent Breathing',
    desc: 'Balance your nervous system in just five minutes with slow, rhythmic breaths.',
  },
  {
    name: 'Calm Breathing',
    desc: 'A gentle rhythm designed to ease anxiety and bring your heart rate down.',
  },
  {
    name: 'Triangle Breathing',
    desc: 'Build mental resilience through structured inhale-hold-exhale cycles.',
  },
];

const TRACK_TYPES = [
  { emoji: '☕', name: 'Lo-Fi', desc: 'Chill beats for deep work and study sessions.' },
  { emoji: '🧠', name: 'Focus', desc: 'Sonic environments designed to trigger flow state.' },
  { emoji: '🌿', name: 'Nature', desc: 'Grounding sounds of rain, wind, and forest ambience.' },
  { emoji: '🧘', name: 'Meditation', desc: 'Tones and drones to support mindfulness practice.' },
];

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string; size?: number }> }) {
  return (
    <h2 className="text-xl font-bold text-text flex items-center gap-2 mb-4">
      {Icon && <Icon size={22} className="text-accent" />}
      {children}
    </h2>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl p-5 shadow-sm border border-white/5 ${className}`}>
      {children}
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="relative px-6 pt-10 pb-12 text-center">
        <div className="text-7xl mb-5 animate-[celebrate_3s_ease-in-out_infinite]">🍜</div>
        <h1 className="text-4xl font-extrabold text-text mb-3 tracking-tight">Noodle Quest</h1>
        <p className="text-text-dim text-lg font-medium mb-2">Play smarter. Breathe deeper. Feel better.</p>
        <p className="text-text-muted text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          A growing collection of brain-training games, classic board games, breathing exercises,
          and focus soundscapes — designed to strengthen your mind and calm your day.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 transition-opacity active:scale-95 shadow-lg shadow-accent/20"
        >
          Get Started
        </button>
      </div>

      {/* Mission */}
      <div className="px-5 pb-10">
        <Card className="bg-accent-soft/30 border-accent/20">
          <Sparkles size={20} className="text-accent mb-2" />
          <h3 className="text-base font-bold text-text mb-2">Built for daily mental fitness</h3>
          <p className="text-text-muted text-sm leading-relaxed">
            Noodle Quest was created on a simple belief: looking after your mind should be fun,
            accessible, and part of your everyday routine. Whether you have two minutes between
            meetings or twenty minutes before bed, there is always something here to help you
            focus, unwind, or connect with friends.
          </p>
        </Card>
      </div>

      {/* Brain Training */}
      <div className="px-5 pb-10">
        <SectionTitle icon={Brain}>Brain Training</SectionTitle>
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          Six cognitive categories. Over thirty games. Each one adapts to your level with staged
          progression, star ratings, and leaderboards. Train the skills that matter most.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BRAIN_CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="bg-card rounded-xl p-4 border border-white/5 flex items-start gap-3"
            >
              <div className={`mt-0.5 ${cat.color}`}>
                <cat.icon size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm text-text">{cat.label}</div>
                <div className="text-text-muted text-xs leading-relaxed mt-0.5">{cat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board Games */}
      <div className="px-5 pb-10">
        <SectionTitle icon={Gamepad2}>Board Games</SectionTitle>
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          Play solo against a smart AI with three difficulty levels, or challenge friends in
          real-time multiplayer sessions. From quick classics to deep strategy — there is a board
          for every mood.
        </p>
        <Card>
          <div className="flex flex-wrap gap-2 mb-4">
            {BOARD_GAMES.map((g) => (
              <span
                key={g}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface text-text-muted text-xs font-medium border border-white/5"
              >
                {g}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <Users size={14} className="text-accent" />
              <span>Real-time multiplayer</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <Zap size={14} className="text-warning" />
              <span>Three AI difficulties</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <Star size={14} className="text-success" />
              <span>Invite links for friends</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Breathing */}
      <div className="px-5 pb-10">
        <SectionTitle icon={Wind}>Breathing Exercises</SectionTitle>
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          Four scientifically-backed techniques to reduce stress, improve focus, and regulate
          your nervous system. Each exercise includes a gentle visual guide so you can find your
          rhythm without counting in your head.
        </p>
        <div className="space-y-3">
          {BREATHING_EXERCISES.map((b) => (
            <div
              key={b.name}
              className="bg-card rounded-xl p-4 border border-white/5 flex items-start gap-3"
            >
              <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm text-text">{b.name}</div>
                <div className="text-text-muted text-xs leading-relaxed mt-0.5">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Soundscapes */}
      <div className="px-5 pb-10">
        <SectionTitle icon={Music}>Focus Soundscapes</SectionTitle>
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          Eight curated audio environments to support different mental states. Procedurally
          generated so the atmosphere stays fresh every time you press play.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TRACK_TYPES.map((t) => (
            <div
              key={t.name}
              className="bg-card rounded-xl p-4 border border-white/5 text-center"
            >
              <div className="text-2xl mb-2">{t.emoji}</div>
              <div className="font-semibold text-sm text-text">{t.name}</div>
              <div className="text-text-muted text-xs leading-relaxed mt-1">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-5 pb-10">
        <SectionTitle icon={Sparkles}>How it works</SectionTitle>
        <div className="space-y-3">
          {[
            {
              step: '1',
              title: 'Create your profile',
              desc: 'Pick a name and an avatar. No email required. Takes ten seconds.',
            },
            {
              step: '2',
              title: 'Choose your path',
              desc: 'Brain training, board games, breathing, or soundscapes — jump into whatever you need right now.',
            },
            {
              step: '3',
              title: 'Build the habit',
              desc: 'Earn stars, track progress, challenge friends, and feel the difference with just a few minutes a day.',
            },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent text-xs font-bold">{s.step}</span>
              </div>
              <div>
                <div className="font-semibold text-sm text-text">{s.title}</div>
                <div className="text-text-muted text-xs leading-relaxed mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="px-5 pb-12 text-center">
        <div className="bg-card rounded-2xl p-8 border border-white/5">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-bold text-text mb-2">Ready to train your brain?</h3>
          <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
            Join thousands of players building focus, memory, and calm — one game at a time.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 transition-opacity active:scale-95 shadow-lg shadow-accent/20"
          >
            Get Started
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
