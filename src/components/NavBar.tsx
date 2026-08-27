import { useEffect, useState } from 'react';
import { Home, Gamepad2, MessageCircle, Trophy, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';

const CHAT_READ_KEY = 'nq_chat_read';

/** Newest chat activity vs. the locally stored last-read time. */
function useChatUnread(onChatScreen: boolean): boolean {
  const latest = useQuery(api.feed.getLatestChatTime, {});
  const [lastRead, setLastRead] = useState<number>(() => Number(localStorage.getItem(CHAT_READ_KEY) ?? 0));

  useEffect(() => {
    const refresh = () => setLastRead(Number(localStorage.getItem(CHAT_READ_KEY) ?? 0));
    window.addEventListener('nq-chat-read', refresh);
    return () => window.removeEventListener('nq-chat-read', refresh);
  }, []);

  return !onChatScreen && typeof latest === 'number' && latest > lastRead;
}

type Tab =
  | { path: string; label: string; icon: typeof Home; kind: 'icon' }
  | { path: string; label: string; kind: 'avatar' };

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { player } = useAuth();
  const chatUnread = useChatUnread(location.pathname === '/chat');

  const firstName = (player?.name ?? '').split(/\s+/)[0] || 'You';

  const tabs: Tab[] = [
    { path: '/', icon: Home, label: 'Home', kind: 'icon' },
    { path: '/games', icon: Gamepad2, label: 'Games', kind: 'icon' },
    { path: '/leaderboard', icon: Trophy, label: 'Rankings', kind: 'icon' },
    { path: '/chat', icon: MessageCircle, label: 'Chat', kind: 'icon' },
    { path: '/profile', label: firstName, kind: 'avatar' },
  ];

  return (
    <nav aria-label="Primary" className="flex-shrink-0 flex border-t border-white/5 bg-surface/95 backdrop-blur-sm px-1">
      {tabs.map(t => {
        const active = location.pathname === t.path;
        const accessibleName = t.kind === 'avatar' ? `Profile (${player?.name ?? 'you'})` : t.path === '/chat' && chatUnread ? `${t.label} (new messages)` : t.label;
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
              <span className="relative">
                <t.icon size={20} strokeWidth={active ? 2.5 : 2} className="relative" />
                {t.path === '/chat' && chatUnread && (
                  <span
                    className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-danger ring-2 ring-surface"
                    aria-hidden
                  />
                )}
              </span>
            )}
            <span className={`text-[10px] font-semibold relative truncate max-w-full px-1 ${active ? 'text-accent' : ''}`}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
