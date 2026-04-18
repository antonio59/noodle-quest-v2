import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Home } from '@/screens/home';
import { Landing } from '@/screens/landing';
import { Auth } from '@/screens/auth';
import { useAuth } from '@/contexts/AuthContext';
import { NavBar } from '@/components/NavBar';

// Lazy-loaded route screens
const GameHub = lazy(() => import('@/screens/game-hub').then(m => ({ default: m.GameHub })));
const PlayGame = lazy(() => import('@/screens/play').then(m => ({ default: m.PlayGame })));
const Feed = lazy(() => import('@/screens/feed').then(m => ({ default: m.Feed })));
const Profile = lazy(() => import('@/screens/profile').then(m => ({ default: m.Profile })));
const Leaderboard = lazy(() => import('@/screens/leaderboard').then(m => ({ default: m.Leaderboard })));
const InvitePage = lazy(() => import('@/screens/invite').then(m => ({ default: m.InvitePage })));
const Admin = lazy(() => import('@/screens/admin').then(m => ({ default: m.Admin })));

function ScreenFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-2xl animate-pulse">🎮</div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<ScreenFallback />}>
          <Outlet />
        </Suspense>
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
        <Route path="/admin" element={
          <Suspense fallback={<ScreenFallback />}>
            <Admin />
          </Suspense>
        } />

        {/* Invite links (public — redirects to auth if needed) */}
        <Route path="/invite/:code" element={
          <Suspense fallback={<ScreenFallback />}>
            <InvitePage />
          </Suspense>
        } />

        {/* App routes with navbar */}
        <Route element={<AuthGate><AppLayout /></AuthGate>}>
          <Route index element={<Home />} />
          <Route path="games" element={<GameHub />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="chat" element={<Feed />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Full-screen game (no navbar) */}
        <Route path="play/:gameId" element={
          <AuthGate>
            <Suspense fallback={<ScreenFallback />}>
              <PlayGame />
            </Suspense>
          </AuthGate>
        } />

        {/* Fallback */}
        <Route path="*" element={<AuthGate><Home /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  );
}
