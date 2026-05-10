import { Home, Gamepad2, MessageCircle, Trophy, User, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  const { logout } = useAuth();

  const handleSwitchPlayer = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="flex-shrink-0 flex border-t border-white/5 bg-surface px-1">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = location.pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors focus:outline-none relative rounded-xl mx-0.5 my-1 ${
              active ? 'text-accent' : 'text-text-muted hover:text-text'
            }`}
          >
            {active && (
              <span className="absolute inset-0 bg-accent/10 rounded-xl" />
            )}
            <Icon size={20} strokeWidth={active ? 2.5 : 2} className="relative" />
            <span className={`text-[10px] font-semibold relative ${active ? 'text-accent' : ''}`}>{t.label}</span>
          </button>
        );
      })}
      <button
        onClick={handleSwitchPlayer}
        className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-3 text-muted hover:text-accent transition-colors focus:outline-none border-l border-foreground/5"
        title="Switch Player"
      >
        <Users size={20} strokeWidth={2} />
        <span className="text-2xs font-semibold">Switch</span>
      </button>
    </nav>
  );
}
