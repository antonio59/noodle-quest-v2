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

export const getAllPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players.map(p => ({ id: p._id, name: p.name, avatar: p.avatar }));
  },
});
