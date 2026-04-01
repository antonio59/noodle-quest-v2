import { useState } from 'react';
import { Home } from '@/screens/home';
import { GameHub } from '@/screens/game-hub';
import { PlayGame } from '@/screens/play';
import { Feed } from '@/screens/feed';
import { Profile } from '@/screens/profile';
import { Leaderboard } from '@/screens/leaderboard';
import { Challenges } from '@/screens/challenges';
import { Landing } from '@/screens/landing';
import { Auth } from '@/screens/auth';
import { useAuth } from '@/contexts/AuthContext';
import { NavBar } from '@/components/NavBar';
import type { GameDefinition } from '@/types';

export type Screen = 'home' | 'games' | 'challenges' | 'leaderboard' | 'feed' | 'profile';

export function AppRouter() {
  const { player } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [playing, setPlaying] = useState<{ game: GameDefinition; id: string; stage: number } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

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
        {screen === 'profile' && <Profile />}
      </main>
      <NavBar current={screen} onChange={setScreen} />
    </>
  );
}
