import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitReport = mutation({
  args: {
    playerId: v.id("players"),
    playerName: v.string(),
    gameId: v.string(),
    gameName: v.string(),
    stage: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("reports", {
      playerId: args.playerId,
      playerName: args.playerName,
      gameId: args.gameId,
      gameName: args.gameName,
      stage: args.stage,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });
    return { id };
  },
});

export const getReports = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const reports = args.status
      ? await ctx.db.query("reports").withIndex("by_status", q => q.eq("status", args.status!)).order("desc").take(50)
      : await ctx.db.query("reports").order("desc").take(50);
    return reports.map(r => ({
      id: r._id,
      playerId: r.playerId,
      playerName: r.playerName,
      gameId: r.gameId,
      gameName: r.gameName,
      stage: r.stage,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    }));
  },
});

export const resolveReport = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, { status: "resolved", resolvedAt: Date.now() });
  },
});
