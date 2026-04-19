import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Player } from '@/types';

interface AuthCtx {
  player: Player | null;
  login: (name: string, pin: string) => Promise<string | null>;
  signup: (name: string, pin: string, avatar?: string) => Promise<string | null>;
  logout: () => void;
  updateAvatar: (emoji: string) => Promise<void>;
  updateName: (name: string) => Promise<string | null>;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('nq_session') || 'null');
    } catch { return null; }
  });

  useEffect(() => {
    if (player) localStorage.setItem('nq_session', JSON.stringify(player));
    else localStorage.removeItem('nq_session');
  }, [player]);

  const login = async (name: string, pin: string): Promise<string | null> => {
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({ path: 'auth:logIn', format: 'convex_encoded_json', args: [{ name, pin }] }),
      });
      const data = await res.json();
      if (data.status === 'error') return data.errorMessage;
      if (data.value?.error) return data.value.error;
      const p: Player = { playerId: data.value.playerId, name: data.value.name, avatar: data.value.avatar, pin };
      setPlayer(p);
      return null;
    } catch {
      return 'Connection error. Check your internet.';
    }
  };

  const signup = async (name: string, pin: string, avatar?: string): Promise<string | null> => {
    if (name.length < 2) return 'Name needs at least 2 characters!';
    if (!/^\d{6}$/.test(pin)) return 'Passcode must be 6 digits';
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({ path: 'auth:signUp', format: 'convex_encoded_json', args: [{ name: name.trim(), pin, avatar }] }),
      });
      const data = await res.json();
      if (data.status === 'error') return data.errorMessage;
      if (data.value?.error) return data.value.error;
      const p: Player = { playerId: data.value.playerId, name: name.trim(), avatar: data.value.avatar, pin };
      setPlayer(p);
      return null;
    } catch {
      return 'Connection error. Check your internet.';
    }
  };

  const logout = () => setPlayer(null);

  const updateAvatar = async (emoji: string) => {
    setPlayer(prev => prev ? { ...prev, avatar: emoji } : null);
    if (player) {
      try {
        await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({ path: 'auth:updateAvatar', format: 'convex_encoded_json', args: [{ playerId: player.playerId, avatar: emoji }] }),
        });
      } catch { /* offline — localStorage still works */ }
    }
  };

  const updateName = async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return 'Name needs at least 2 characters!';
    if (player) {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({ path: 'auth:updateName', format: 'convex_encoded_json', args: [{ playerId: player.playerId, name: trimmed }] }),
        });
        const data = await res.json();
        if (data.status === 'error' || data.value?.error) {
          return data.value?.error || data.errorMessage || 'Failed to update name';
        }
        setPlayer(prev => prev ? { ...prev, name: trimmed } : null);
        return null;
      } catch {
        return 'Connection error. Check your internet.';
      }
    }
    return null;
  };

  return <Ctx.Provider value={{ player, login, signup, logout, updateAvatar, updateName }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
