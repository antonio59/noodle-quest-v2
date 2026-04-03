import { Home, Gamepad2, MessageCircle, Trophy, Swords, User, Wind, LayoutGrid } from 'lucide-react';
import type { Screen } from '@/App';

const tabs: { id: Screen; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'games', icon: Gamepad2, label: 'Games' },
  { id: 'board', icon: LayoutGrid, label: 'Board' },
  { id: 'breathe', icon: Wind, label: 'Breathe' },
  { id: 'challenges', icon: Swords, label: 'Duel' },
  { id: 'leaderboard', icon: Trophy, label: 'Ranks' },
  { id: 'feed', icon: MessageCircle, label: 'Chat' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function NavBar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="flex-shrink-0 flex border-t border-white/5 bg-surface overflow-x-auto scrollbar-none">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 min-w-[56px] flex flex-col items-center gap-0.5 py-2 transition-colors ${
              active ? 'text-accent' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-semibold">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
