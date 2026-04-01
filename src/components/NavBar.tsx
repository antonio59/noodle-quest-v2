import { Home, Gamepad2, MessageCircle, Trophy, User } from 'lucide-react';
import type { Screen } from '@/App';

const tabs: { id: Screen; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'games', icon: Gamepad2, label: 'Games' },
  { id: 'leaderboard', icon: Trophy, label: 'Ranks' },
  { id: 'feed', icon: MessageCircle, label: 'Chat' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function NavBar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="flex-shrink-0 flex border-t border-white/5 bg-surface">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              active ? 'text-accent' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
