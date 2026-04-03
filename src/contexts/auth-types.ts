import { createContext } from 'react';
import type { Player } from '@/types';

interface AuthCtx {
  player: Player | null;
  login: (name: string, pin: string) => Promise<string | null>;
  signup: (name: string, pin: string) => Promise<string | null>;
  logout: () => void;
  updateAvatar: (emoji: string) => void;
}

export const Ctx = createContext<AuthCtx>(null!);
