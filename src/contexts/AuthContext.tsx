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

// v2: sessions now carry a server-issued token instead of the plaintext PIN.
// Old 'nq_session' entries have no token, so we ignore them and clean up —
// affected players just log in again once.
const STORAGE_KEY = 'nq_session_v2';
const LEGACY_STORAGE_KEY = 'nq_session';

async function callConvex(kind: 'mutation' | 'query', path: string, args: Record<string, unknown>) {
  const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
    body: JSON.stringify({ path, format: 'convex_encoded_json', args: [args] }),
  });
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return stored?.sessionToken ? stored : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (player) localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    else localStorage.removeItem(STORAGE_KEY);
  }, [player]);

  const login = async (name: string, pin: string): Promise<string | null> => {
    try {
      const data = await callConvex('mutation', 'auth:logIn', { name, pin });
      if (data.status === 'error') return data.errorMessage;
      if (data.value?.error) return data.value.error;
      const p: Player = {
        playerId: data.value.playerId,
        name: data.value.name,
        avatar: data.value.avatar,
        sessionToken: data.value.sessionToken,
      };
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
      const data = await callConvex('mutation', 'auth:signUp', { name: name.trim(), pin, avatar });
      if (data.status === 'error') return data.errorMessage;
      if (data.value?.error) return data.value.error;
      const p: Player = {
        playerId: data.value.playerId,
        name: name.trim(),
        avatar: data.value.avatar,
        sessionToken: data.value.sessionToken,
      };
      setPlayer(p);
      return null;
    } catch {
      return 'Connection error. Check your internet.';
    }
  };

  const logout = () => {
    const token = player?.sessionToken;
    setPlayer(null);
    if (token) {
      // Best effort — local logout already happened.
      callConvex('mutation', 'auth:logOut', { sessionToken: token }).catch(() => {});
    }
  };

  const updateAvatar = async (emoji: string) => {
    setPlayer(prev => prev ? { ...prev, avatar: emoji } : null);
    if (player) {
      try {
        await callConvex('mutation', 'auth:updateAvatar', { sessionToken: player.sessionToken, avatar: emoji });
      } catch { /* offline — localStorage still works */ }
    }
  };

  const updateName = async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return 'Name needs at least 2 characters!';
    if (player) {
      try {
        const data = await callConvex('mutation', 'auth:updateName', { sessionToken: player.sessionToken, name: trimmed });
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
