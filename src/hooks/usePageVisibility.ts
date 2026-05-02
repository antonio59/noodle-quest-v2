import { useState, useEffect } from 'react';

/**
 * Returns `true` whenever the browser tab / app is hidden (user switched
 * away, locked screen, received a call, etc.).  Reacts to the standard
 * Page Visibility API's `visibilitychange` event.
 */
export function usePageVisibility(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return hidden;
}
