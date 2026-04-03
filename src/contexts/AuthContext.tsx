import { useState, useEffect, type ReactNode } from 'react';
import type { Player } from '@/types';
import { Ctx } from './auth-types';

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

  const signup = async (name: string, pin: string): Promise<string | null> => {
    if (name.length < 2) return 'Name needs at least 2 characters!';
    if (!/^\d{6,8}$/.test(pin)) return 'PIN should be 6-8 digits';
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({ path: 'auth:signUp', format: 'convex_encoded_json', args: [{ name: name.trim(), pin }] }),
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

  const updateAvatar = (emoji: string) => {
    setPlayer(prev => prev ? { ...prev, avatar: emoji } : null);
  };

  return <Ctx.Provider value={{ player, login, signup, logout, updateAvatar }}>{children}</Ctx.Provider>;
}
