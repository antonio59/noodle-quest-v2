import type { GameMeta } from '@/types';
import type { ComponentType } from 'react';
import type { GameProps } from '@/types';

/** Stored entry: metadata for listing + a lazy loader for the component. */
interface GameEntry {
  meta: GameMeta;
  loader: () => Promise<{ default: ComponentType<GameProps> }>;
}

const registry = new Map<string, GameEntry>();
const aliases = new Map<string, string>();

/**
 * Register a game with metadata (eagerly available) and a lazy component loader.
 */
export function registerGame(
  id: string,
  meta: GameMeta,
  loader: () => Promise<{ default: ComponentType<GameProps> }>,
) {
  registry.set(id, { meta, loader });
}

export function registerAlias(alias: string, targetId: string) {
  aliases.set(alias, targetId);
}

function resolveEntry(id: string): GameEntry | undefined {
  return registry.get(id) ?? registry.get(aliases.get(id) ?? '');
}

/** Get metadata for a game (no component import triggered). */
export function getGameMeta(id: string): (GameMeta & { id: string }) | undefined {
  const entry = resolveEntry(id);
  if (!entry) return undefined;
  return { id, ...entry.meta };
}

/** Get the lazy loader for a game's component. */
export function getGameLoader(id: string) {
  return resolveEntry(id)?.loader;
}

/** Get game metadata by id (alias for getGameMeta, kept for backward compat). */
export function getGame(id: string) {
  return getGameMeta(id);
}

export function getGameName(id: string) {
  const entry = resolveEntry(id);
  return entry ? `${entry.meta.emoji} ${entry.meta.name}` : id;
}

export function getAllGames() {
  return Array.from(registry.entries()).map(([id, entry]) => ({ id, ...entry.meta }));
}

export function getGamesByCategory(category: string) {
  return getAllGames().filter(g => g.category === category);
}
