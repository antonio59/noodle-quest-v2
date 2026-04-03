import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ConvexClientProvider } from '@/lib/convex';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from './App';
import { loadGames } from '@/lib/load-games';

loadGames().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConvexClientProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ConvexClientProvider>
    </StrictMode>,
  );
});
