import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  fromName: string;
  fromAvatar: string;
  content: string;
  read: boolean;
  createdAt: number;
}

export function Notifications() {
  const { player } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!player) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'notifications:getNotifications',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId }],
        }),
      });
      const data = await res.json();
      if (data.value) {
        const notifs = data.value.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          type: n.type as string,
          fromName: n.fromName as string,
          fromAvatar: n.fromAvatar as string,
          content: n.content as string,
          read: n.read as boolean,
          createdAt: n.createdAt as number,
        }));
        setNotifications(notifs);
        setUnread(notifs.filter((n: Notification) => !n.read).length);
      }
    } catch { /* offline */ }
  }, [player]);

  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(fetchNotifications, 0);
    return () => clearTimeout(timer);
  }, [player, fetchNotifications]);

  const markAllRead = async () => {
    if (!player) return;
    try {
      await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'notifications:markAllRead',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId }],
        }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* offline */ }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const typeIcons: Record<string, string> = {
    mention: '💬',
    challenge: '⚔️',
    badge: '🏆',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Bell size={20} className="text-accent" /> Notifications
          {unread > 0 && (
            <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full">{unread}</span>
          )}
        </h1>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-accent flex items-center gap-1 hover:opacity-80"
          >
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Bell size={48} className="text-text-muted mb-4" />
            <h3 className="text-lg font-bold mb-2">No notifications yet</h3>
            <p className="text-text-muted text-sm">
              When someone mentions you, challenges you, or you earn a badge, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                  n.read ? 'bg-card' : 'bg-accent/5 ring-1 ring-accent/10'
                }`}
              >
                <div className="text-2xl flex-shrink-0">
                  {typeIcons[n.type] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{n.fromAvatar}</span>
                    <span className="font-semibold text-sm truncate">{n.fromName}</span>
                    <span className="text-text-muted text-xs">{formatTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-text-dim mt-1">{n.content}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
