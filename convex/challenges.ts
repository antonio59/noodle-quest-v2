import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendChallenge = mutation({
  args: { fromId: v.id("players"), toId: v.id("players"), gameId: v.string(), stage: v.number(), fromScore: v.number() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("challenges", { ...args, status: "pending", createdAt: Date.now() });
    return { challengeId: id };
  },
});

export const respondToChallenge = mutation({
  args: { challengeId: v.id("challenges"), toScore: v.number() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.status !== "pending") return { error: "Challenge not found or already completed." };
    const won = args.toScore > challenge.fromScore;
    await ctx.db.patch(args.challengeId, { toScore: args.toScore, status: "completed", completedAt: Date.now() });
    return { won, fromScore: challenge.fromScore, toScore: args.toScore };
  },
});

export const getPendingChallenges = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const challenges = await ctx.db.query("challenges").withIndex("by_to", q => q.eq("toId", args.playerId).eq("status", "pending")).collect();
    return challenges.map(c => ({ id: c._id, fromId: c.fromId, gameId: c.gameId, stage: c.stage, fromScore: c.fromScore, createdAt: c.createdAt }));
  },
});
