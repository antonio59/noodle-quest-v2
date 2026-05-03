export const GAME_IMAGES: Record<string, string> = {};

export function getGameImage(gameId: string): string | undefined {
  return GAME_IMAGES[gameId];
}
