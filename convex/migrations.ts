import { internalMutation } from "./_generated/server";
import { generateSalt, hashPin } from "./model/auth";

// One-time migration: hash every remaining plaintext PIN.
// Run after deploying the hashed-PIN auth code:
//   npx convex run migrations:hashAllPins
// (Players who log in before this runs are upgraded lazily by auth:logIn.)
export const hashAllPins = internalMutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    let migrated = 0;
    for (const player of players) {
      if (player.pin === undefined) continue;
      const pinSalt = generateSalt();
      const pinHash = await hashPin(player.pin, pinSalt);
      await ctx.db.patch(player._id, { pin: undefined, pinHash, pinSalt });
      migrated++;
    }
    return { migrated, total: players.length };
  },
});
