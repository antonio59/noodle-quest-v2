import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { playerFromSession } from "./model/auth";

const MAX_SCORE = 1_000_000;

function isValidScore(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= MAX_SCORE;
}

export const sendChallenge = mutation({
  args: { sessionToken: v.string(), toId: v.id("players"), gameId: v.string(), stage: v.number(), fromScore: v.number() },
  handler: async (ctx, args) => {
    const from = await playerFromSession(ctx, args.sessionToken);
    if (!from) return { error: "Not signed in." };
    if (!isValidScore(args.fromScore)) return { error: "Invalid score." };
    const to = await ctx.db.get(args.toId);
    if (!to) return { error: "Player not found." };
    if (to._id === from._id) return { error: "You can't challenge yourself!" };

    // One open challenge per pairing per game keeps the inbox sane.
    const existing = await ctx.db
      .query("challenges")
      .withIndex("by_to", q => q.eq("toId", args.toId).eq("status", "pending"))
      .collect();
    if (existing.some(c => c.fromId === from._id && c.gameId === args.gameId)) {
      return { error: `${to.name} already has a pending challenge from you in this game.` };
    }

    const id = await ctx.db.insert("challenges", {
      fromId: from._id,
      toId: args.toId,
      gameId: args.gameId,
      stage: args.stage,
      fromScore: args.fromScore,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("feed", {
      authorId: from._id,
      authorName: from.name,
      authorAvatar: from.avatar,
      type: "score",
      content: `⚔️ challenged ${to.name} to beat ${args.fromScore} pts!`,
      gameId: args.gameId,
      stage: args.stage,
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
    if (!isValidScore(args.toScore)) return { error: "Invalid score." };
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.status !== "pending") return { error: "Challenge not found or already completed." };
    if (challenge.toId !== player._id) return { error: "This challenge isn't for you." };
    const won = args.toScore > challenge.fromScore;
    await ctx.db.patch(args.challengeId, { toScore: args.toScore, status: "completed", completedAt: Date.now() });

    const from = await ctx.db.get(challenge.fromId);
    await ctx.db.insert("feed", {
      authorId: player._id,
      authorName: player.name,
      authorAvatar: player.avatar,
      type: "score",
      content: won
        ? `🏆 beat ${from?.name ?? "a"} challenge — ${args.toScore} vs ${challenge.fromScore} pts!`
        : `⚔️ took on ${from?.name ?? "a"}'s challenge: ${args.toScore} vs ${challenge.fromScore} pts`,
      gameId: challenge.gameId,
      stage: challenge.stage,
      createdAt: Date.now(),
    });

    return { won, fromScore: challenge.fromScore, toScore: args.toScore };
  },
});

export const getPendingChallenges = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const player = await playerFromSession(ctx, args.sessionToken);
    if (!player) return [];
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_to", q => q.eq("toId", player._id).eq("status", "pending"))
      .collect();
    // Enrich with the challenger's current name/avatar for the UI.
    const out = [];
    for (const c of challenges) {
      const from = await ctx.db.get(c.fromId);
      out.push({
        id: c._id,
        fromId: c.fromId,
        fromName: from?.name ?? "Unknown",
        fromAvatar: from?.avatar ?? "🎮",
        gameId: c.gameId,
        stage: c.stage,
        fromScore: c.fromScore,
        createdAt: c.createdAt,
      });
    }
    return out;
  },
});
