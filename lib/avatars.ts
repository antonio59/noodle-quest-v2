// Curated set of unique, visually distinct avatars
// Grouped: animals, fantasy, nature, objects
export const AVATARS: string[] = [
  // Animals (distinct silhouettes)
  '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🦄', '🐸',
  '🐙', '🦋', '🐢', '🦖', '🐧', '🦜', '🐝',
  // More animals
  '🐺', '🦝', '🐗', '🦓', '🦒', '🐘', '🦏', '🐊',
  '🦈', '🐋', '🦩', '🐓', '🦉', '🦇', '🐿️',
  // Fantasy & characters
  '🐲', '👻', '🤖', '👽', '🧙', '🧛', '🦸', '🦹',
  // Nature & objects
  '🌵', '🍄', '🌻', '⭐', '🔥', '💎', '🎯', '🍜',
];

/**
 * Pick a random avatar that isn't already taken by a nearby player.
 * Falls back to full pool if all avatars are taken.
 */
export function pickUniqueAvatar(takenSet?: Set<string>): string {
  const available = takenSet
    ? AVATARS.filter(a => !takenSet.has(a))
    : AVATARS;
  const pool = available.length > 0 ? available : AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}
