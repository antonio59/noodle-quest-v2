import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Home } from '@/screens/home';
import { GameHub } from '@/screens/game-hub';
import { PlayGame } from '@/screens/play';
import { Feed } from '@/screens/feed';
import { Profile } from '@/screens/profile';
import { Leaderboard } from '@/screens/leaderboard';
import { Landing } from '@/screens/landing';
import { Auth } from '@/screens/auth';
import { InvitePage } from '@/screens/invite';
import { useAuth } from '@/contexts/AuthContext';
import { NavBar } from '@/components/NavBar';

function AppLayout() {
  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <NavBar />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { player } = useAuth();
  if (!player) return <Landing />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />

        {/* Invite links (public — redirects to auth if needed) */}
        <Route path="/invite/:code" element={<InvitePage />} />

        {/* App routes with navbar */}
        <Route element={<AuthGate><AppLayout /></AuthGate>}>
          <Route index element={<Home />} />
          <Route path="games" element={<GameHub />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="chat" element={<Feed />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Full-screen game (no navbar) */}
        <Route path="play/:gameId" element={<AuthGate><PlayGame /></AuthGate>} />

        {/* Fallback */}
        <Route path="*" element={<AuthGate><Home /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  );
}
