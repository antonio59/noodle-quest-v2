import { Home, Gamepad2, MessageCircle, Trophy, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/games', icon: Gamepad2, label: 'Games' },
  { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex-shrink-0 flex border-t border-white/5 bg-surface">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = location.pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors focus:outline-none ${
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
