import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { playerFromSession } from "./model/auth";

export const sendChallenge = mutation({
  args: { sessionToken: v.string(), toId: v.id("players"), gameId: v.string(), stage: v.number(), fromScore: v.number() },
  handler: async (ctx, args) => {
    const from = await playerFromSession(ctx, args.sessionToken);
    if (!from) return { error: "Not signed in." };
    const to = await ctx.db.get(args.toId);
    if (!to) return { error: "Player not found." };
    const id = await ctx.db.insert("challenges", {
      fromId: from._id,
      toId: args.toId,
      gameId: args.gameId,
      stage: args.stage,
      fromScore: args.fromScore,
      status: "pending",
      createdAt: Date.now(),
    });
    return { challengeId: id };
  },
});

export const respondToChallenge = mutation({
  args: { sessionToken: v.string(), challengeId: v.id("challenges"), toScore: v.number() },
  handler: async (ctx, args) => {
    const player = await playerFromSession(ctx, args.sessionToken);
    if (!player) return { error: "Not signed in." };
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.status !== "pending") return { error: "Challenge not found or already completed." };
    if (challenge.toId !== player._id) return { error: "This challenge isn't for you." };
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
