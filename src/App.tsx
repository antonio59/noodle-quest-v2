import { useState, useEffect, useCallback } from 'react';
import { Home } from '@/screens/home';
import { GameHub } from '@/screens/game-hub';
import { PlayGame } from '@/screens/play';
import { Feed } from '@/screens/feed';
import { Profile } from '@/screens/profile';
import { Leaderboard } from '@/screens/leaderboard';
import { Challenges } from '@/screens/challenges';
import { Notifications } from '@/screens/notifications';
import { Landing } from '@/screens/landing';
import { Auth } from '@/screens/auth';
import { useAuth } from '@/contexts/AuthContext';
import { NavBar } from '@/components/NavBar';
import type { GameDefinition } from '@/types';

export type Screen = 'home' | 'games' | 'challenges' | 'leaderboard' | 'feed' | 'notifications' | 'profile';

export function AppRouter() {
  const { player } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [playing, setPlaying] = useState<{ game: GameDefinition; id: string; stage: number } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchUnread = useCallback(async () => {
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
        setUnreadNotifs(data.value.filter((n: Record<string, unknown>) => !n.read).length);
      }
    } catch { /* offline */ }
  }, [player]);

  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(fetchUnread, 0);
    return () => clearTimeout(timer);
  }, [player, fetchUnread]);

  // Poll for new notifications every 30s
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [player, fetchUnread]);

  if (!player) {
    if (showAuth) return <Auth onBack={() => setShowAuth(false)} />;
    return <Landing onLogin={() => setShowAuth(true)} />;
  }

  if (playing) {
    return (
      <PlayGame
        game={playing.game}
        gameId={playing.id}
        stage={playing.stage}
        onBack={() => setPlaying(null)}
      />
    );
  }

  return (
    <>
      <main className="flex-1 overflow-hidden">
        {screen === 'home' && <Home onPlay={(g, id, s) => setPlaying({ game: g, id, stage: s })} />}
        {screen === 'games' && <GameHub onPlay={(g, id, s) => setPlaying({ game: g, id, stage: s })} />}
        {screen === 'challenges' && <Challenges />}
        {screen === 'leaderboard' && <Leaderboard />}
        {screen === 'feed' && <Feed />}
        {screen === 'notifications' && <Notifications />}
        {screen === 'profile' && <Profile />}
      </main>
      <NavBar current={screen} onChange={setScreen} unreadCount={unreadNotifs} />
    </>
  );
}
