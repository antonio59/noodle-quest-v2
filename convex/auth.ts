import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Expanded avatar pool — must stay in sync with src/lib/avatars.ts
const AVATARS = [
  "🦊","🐱","🐶","🦁","🐼","🐨","🦄","🐸","🐙","🦋","🐢","🦖","🐧","🦜","🐝",
  "🐺","🦝","🐗","🦓","🦒","🐘","🦏","🐊","🦈","🐋","🦩","🐓","🦉","🦇","🐿️",
  "🐲","👻","🤖","👽","🧙","🧛","🦸","🦹","🌵","🍄","🌻","⭐","🔥","💎","🎯","🍜",
];

export const signUp = mutation({
  args: { name: v.string(), pin: v.string(), avatar: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("players").withIndex("by_name", q => q.eq("name", args.name.trim())).unique();
    if (existing) return { error: "Name already taken!" };
    const avatar = args.avatar && AVATARS.includes(args.avatar)
      ? args.avatar
      : AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const now = Date.now();
    const playerId = await ctx.db.insert("players", { name: args.name.trim(), pin: args.pin, avatar, createdAt: now, lastActive: now });
    return { playerId, avatar };
  },
});

export const logIn = mutation({
  args: { name: v.string(), pin: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db.query("players").withIndex("by_name", q => q.eq("name", args.name.trim())).unique();
    if (!player) return { error: "No player found." };
    if (player.pin !== args.pin) return { error: "Wrong PIN!" };
    await ctx.db.patch(player._id, { lastActive: Date.now() });
    return { playerId: player._id, name: player.name, avatar: player.avatar };
  },
});

export const getPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;
    return { id: player._id, name: player.name, avatar: player.avatar };
  },
});

export const searchPlayers = query({
  args: { query: v.string(), currentPlayerId: v.id("players") },
  handler: async (ctx, args) => {
    if (args.query.length < 2) return [];
    const players = await ctx.db.query("players").collect();
    return players.filter(p => p._id !== args.currentPlayerId && p.name.toLowerCase().includes(args.query.toLowerCase())).slice(0, 10).map(p => ({ id: p._id, name: p.name, avatar: p.avatar }));
  },
});

export const updateAvatar = mutation({
  args: { playerId: v.id("players"), avatar: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, { avatar: args.avatar });
    return { success: true };
  },
});

export const updateName = mutation({
  args: { playerId: v.id("players"), name: v.string() },
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (trimmed.length < 2) return { error: "Name needs at least 2 characters!" };
    const existing = await ctx.db.query("players").withIndex("by_name", q => q.eq("name", trimmed)).unique();
    if (existing && existing._id !== args.playerId) return { error: "Name already taken!" };
    await ctx.db.patch(args.playerId, { name: trimmed });
    return { success: true, name: trimmed };
  },
});

export const getAllPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players.map(p => ({ id: p._id, name: p.name, avatar: p.avatar, createdAt: p.createdAt, lastActive: p.lastActive }));
  },
});

// Admin: reset a player's PIN
export const adminResetPin = mutation({
  args: { playerId: v.id("players"), newPin: v.string(), adminSecret: v.string() },
  handler: async (ctx, args) => {
    if (args.adminSecret !== process.env.ADMIN_SECRET) return { error: "Unauthorized" };
    if (!/^\d{6}$/.test(args.newPin)) return { error: "PIN must be 6 digits" };
    const player = await ctx.db.get(args.playerId);
    if (!player) return { error: "Player not found" };
    await ctx.db.patch(args.playerId, { pin: args.newPin });
    return { success: true };
  },
});

// Admin: merge source player into target player (keeps target, deletes source)
export const adminMergePlayers = mutation({
  args: { sourceId: v.id("players"), targetId: v.id("players"), adminSecret: v.string() },
  handler: async (ctx, args) => {
    if (args.adminSecret !== process.env.ADMIN_SECRET) return { error: "Unauthorized" };
    if (args.sourceId === args.targetId) return { error: "Cannot merge a player into themselves" };

    const source = await ctx.db.get(args.sourceId);
    const target = await ctx.db.get(args.targetId);
    if (!source || !target) return { error: "One or both players not found" };

    // 1. Merge progress: combine by gameId+stage, keep best scores
    const sourceProgress = await ctx.db.query("progress").withIndex("by_player", q => q.eq("playerId", args.sourceId)).collect();
    for (const sp of sourceProgress) {
      const existing = await ctx.db.query("progress").withIndex("by_player_game", q => q.eq("playerId", args.targetId).eq("gameId", sp.gameId)).filter(q => q.eq(q.field("stage"), sp.stage)).unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          highScore: Math.max(existing.highScore, sp.highScore),
          starsEarned: existing.starsEarned + sp.starsEarned,
          timesPlayed: existing.timesPlayed + sp.timesPlayed,
          lastPlayed: Math.max(existing.lastPlayed, sp.lastPlayed),
        });
        await ctx.db.delete(sp._id);
      } else {
        await ctx.db.patch(sp._id, { playerId: args.targetId });
      }
    }

    // 2. Reassign scores
    const sourceScores = await ctx.db.query("scores").withIndex("by_player", q => q.eq("playerId", args.sourceId)).collect();
    for (const sc of sourceScores) {
      await ctx.db.patch(sc._id, { playerId: args.targetId });
    }

    // 3. Reassign challenges (as sender or receiver)
    const challengesAsFrom = await ctx.db.query("challenges").withIndex("by_from", q => q.eq("fromId", args.sourceId)).collect();
    for (const c of challengesAsFrom) {
      await ctx.db.patch(c._id, { fromId: args.targetId });
    }
    const challengesAsTo = await ctx.db.query("challenges").withIndex("by_to", q => q.eq("toId", args.sourceId)).collect();
    for (const c of challengesAsTo) {
      await ctx.db.patch(c._id, { toId: args.targetId });
    }

    // 4. Reassign feed posts
    const feedPosts = await ctx.db.query("feed").collect();
    for (const post of feedPosts) {
      if (post.authorId === args.sourceId) {
        await ctx.db.patch(post._id, { authorId: args.targetId, authorName: target.name, authorAvatar: target.avatar });
      }
    }

    // 5. Reassign favorites (deduplicate by gameId)
    const sourceFavs = await ctx.db.query("favorites").withIndex("by_player", q => q.eq("playerId", args.sourceId)).collect();
    const targetFavs = await ctx.db.query("favorites").withIndex("by_player", q => q.eq("playerId", args.targetId)).collect();
    const targetFavGameIds = new Set(targetFavs.map(f => f.gameId));
    for (const fav of sourceFavs) {
      if (targetFavGameIds.has(fav.gameId)) {
        await ctx.db.delete(fav._id);
      } else {
        await ctx.db.patch(fav._id, { playerId: args.targetId });
      }
    }

    // 6. Reassign playlists
    const sourcePlaylists = await ctx.db.query("playlists").withIndex("by_player", q => q.eq("playerId", args.sourceId)).collect();
    for (const pl of sourcePlaylists) {
      await ctx.db.patch(pl._id, { playerId: args.targetId });
    }

    // 7. Reassign multiplayer invites
    const invites = await ctx.db.query("multiplayer_invites").collect();
    for (const inv of invites) {
      if (inv.fromId === args.sourceId) {
        await ctx.db.patch(inv._id, { fromId: args.targetId, fromName: target.name, fromAvatar: target.avatar });
      }
      if (inv.toId === args.sourceId) {
        await ctx.db.patch(inv._id, { toId: args.targetId, toName: target.name });
      }
    }

    // 8. Reassign multiplayer sessions
    const sessions = await ctx.db.query("multiplayer_sessions").collect();
    for (const sess of sessions) {
      if (sess.player1Id === args.sourceId) {
        await ctx.db.patch(sess._id, { player1Id: args.targetId, player1Name: target.name, player1Avatar: target.avatar });
      }
      if (sess.player2Id === args.sourceId) {
        await ctx.db.patch(sess._id, { player2Id: args.targetId, player2Name: target.name, player2Avatar: target.avatar });
      }
    }

    // 9. Reassign reports
    const reports = await ctx.db.query("reports").collect();
    for (const r of reports) {
      if (r.playerId === args.sourceId) {
        await ctx.db.patch(r._id, { playerId: args.targetId, playerName: target.name });
      }
    }

    // Delete source player
    await ctx.db.delete(args.sourceId);

    return { success: true, message: `Merged ${source.name} into ${target.name}` };
  },
});

// Admin: get full player stats for review
export const adminGetPlayerDetails = query({
  args: { playerId: v.id("players"), adminSecret: v.string() },
  handler: async (ctx, args) => {
    if (args.adminSecret !== process.env.ADMIN_SECRET) return { error: "Unauthorized" };
    const player = await ctx.db.get(args.playerId);
    if (!player) return { error: "Player not found" };

    const progress = await ctx.db.query("progress").withIndex("by_player", q => q.eq("playerId", args.playerId)).collect();
    const scores = await ctx.db.query("scores").withIndex("by_player", q => q.eq("playerId", args.playerId)).collect();
    const challengesSent = await ctx.db.query("challenges").withIndex("by_from", q => q.eq("fromId", args.playerId)).collect();
    const challengesReceived = await ctx.db.query("challenges").withIndex("by_to", q => q.eq("toId", args.playerId)).collect();

    return {
      id: player._id,
      name: player.name,
      avatar: player.avatar,
      createdAt: player.createdAt,
      lastActive: player.lastActive,
      progressCount: progress.length,
      scoresCount: scores.length,
      challengesSent: challengesSent.length,
      challengesReceived: challengesReceived.length,
    };
  },
});
