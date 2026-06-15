import { Home, Gamepad2, MessageCircle, Trophy, User, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Tab =
  | { path: string; label: string; icon: typeof Home; kind: 'icon' }
  | { path: string; label: string; kind: 'avatar' };

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { player, logout } = useAuth();

  // First name keeps the label compact in the bottom nav.
  const firstName = (player?.name ?? '').split(/\s+/)[0] || 'You';

  const tabs: Tab[] = [
    { path: '/', icon: Home, label: 'Home', kind: 'icon' },
    { path: '/games', icon: Gamepad2, label: 'Games', kind: 'icon' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranks', kind: 'icon' },
    { path: '/chat', icon: MessageCircle, label: 'Chat', kind: 'icon' },
    { path: '/profile', label: firstName, kind: 'avatar' },
  ];

  const handleSwitchPlayer = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav aria-label="Primary" className="flex-shrink-0 flex border-t border-white/5 bg-surface px-1">
      {tabs.map(t => {
        const active = location.pathname === t.path;
        const accessibleName = t.kind === 'avatar' ? `Profile (${player?.name ?? 'you'})` : t.label;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            aria-label={accessibleName}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent relative rounded-xl mx-0.5 my-1 min-w-0 ${
              active ? 'text-accent' : 'text-text-muted hover:text-text'
            }`}
            title={accessibleName}
          >
            {active && (
              <span className="absolute inset-0 bg-accent/10 rounded-xl" />
            )}
            {t.kind === 'avatar' ? (
              <span className={`relative leading-none ${active ? 'text-xl' : 'text-lg'}`} aria-hidden>
                {player?.avatar || <User size={20} />}
              </span>
            ) : (
              <t.icon size={20} strokeWidth={active ? 2.5 : 2} className="relative" />
            )}
            <span className={`text-[10px] font-semibold relative truncate max-w-full px-1 ${active ? 'text-accent' : ''}`}>{t.label}</span>
          </button>
        );
      })}
      <button
        onClick={handleSwitchPlayer}
        aria-label={player ? `Sign out ${player.name} and switch player` : 'Switch player'}
        className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-3 text-text-muted hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent border-l border-white/5"
        title={player ? `Sign out ${player.name} and switch player` : 'Switch Player'}
      >
        <LogOut size={20} strokeWidth={2} aria-hidden />
        <span className="text-[10px] font-semibold">Switch</span>
      </button>
    </nav>
  );
}
