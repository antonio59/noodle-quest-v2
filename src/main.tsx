import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ConvexClientProvider } from '@/lib/convex';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from './App';

// Register all game metadata + lazy loaders (no component code imported)
import './lib/game-manifest';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexClientProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ConvexClientProvider>
  </StrictMode>,
);

// PWA: offline shell + asset caching (production builds only, so dev
// never serves stale modules)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal — the app works without offline support
    });
  });
}
