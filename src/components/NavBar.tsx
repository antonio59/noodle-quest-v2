import { Home, Gamepad2, MessageCircle, Trophy, Swords, User, Bell } from 'lucide-react';
import type { Screen } from '@/App';

const tabs: { id: Screen; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'games', icon: Gamepad2, label: 'Games' },
  { id: 'challenges', icon: Swords, label: 'Duel' },
  { id: 'leaderboard', icon: Trophy, label: 'Ranks' },
  { id: 'feed', icon: MessageCircle, label: 'Chat' },
  { id: 'notifications', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function NavBar({ current, onChange, unreadCount }: { current: Screen; onChange: (s: Screen) => void; unreadCount: number }) {
  return (
    <nav className="flex-shrink-0 flex border-t border-white/5 bg-surface overflow-x-auto scrollbar-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
      {tabs.map(t => {
        const Icon = t.icon;
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 min-w-[52px] flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${
              active ? 'text-accent' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-semibold leading-tight">{t.label}</span>
            {t.id === 'notifications' && unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger rounded-full text-[9px] text-white flex items-center justify-center font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
