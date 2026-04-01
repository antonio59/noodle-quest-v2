import type { GameDefinition } from '@/types';

const registry = new Map<string, GameDefinition>();

export function registerGame(id: string, game: GameDefinition) {
  registry.set(id, game);
}

export function getGame(id: string) {
  return registry.get(id);
}

export function getAllGames() {
  return Array.from(registry.entries()).map(([id, game]) => ({ id, ...game }));
}

export function getGamesByCategory(category: string) {
  return getAllGames().filter(g => g.category === category);
}
