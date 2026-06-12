import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { playerFromSession } from "./model/auth";

// Submit a game request from a player. Attribution comes from the session
// (when provided) rather than client-supplied identity.
export const createGameRequest = mutation({
  args: {
    gameName: v.string(),
    description: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = args.sessionToken ? await playerFromSession(ctx, args.sessionToken) : null;
    return await ctx.db.insert("game_requests", {
      gameName: args.gameName,
      description: args.description,
      playerId: player?._id,
      playerName: player?.name,
      createdAt: Date.now(),
    });
  },
});

interface ReportInput {
  errorId: string;
  gameId?: string;
  playerId?: Id<"players">;
  playerName?: string;
  errorType: string;
  severity: string;
  message: string;
  stackTrace?: string;
  context?: unknown;
}

async function upsertReport(ctx: MutationCtx, input: ReportInput) {
  const now = Date.now();

  // Check if this error already exists
  const existing = await ctx.db
    .query("reports")
    .withIndex("by_errorId", (q) => q.eq("errorId", input.errorId))
    .first();

  if (existing) {
    // Update existing report
    await ctx.db.patch(existing._id, {
      updatedAt: now,
      status: "open",
    });
    return { id: existing._id, isNew: false };
  }

  const reportId = await ctx.db.insert("reports", {
    errorId: input.errorId,
    gameId: input.gameId,
    playerId: input.playerId,
    playerName: input.playerName,
    errorType: input.errorType,
    severity: input.severity,
    message: input.message,
    stackTrace: input.stackTrace,
    context: input.context,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  return { id: reportId, isNew: true };
}

// Create a new error report from the app. Anonymous reports are allowed
// (errors can happen before login); attribution comes from the session.
export const createReport = mutation({
  args: {
    errorId: v.string(),
    gameId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    errorType: v.string(),
    severity: v.string(),
    message: v.string(),
    stackTrace: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const player = args.sessionToken ? await playerFromSession(ctx, args.sessionToken) : null;
    return await upsertReport(ctx, {
      errorId: args.errorId,
      gameId: args.gameId,
      playerId: player?._id,
      playerName: player?.name,
      errorType: args.errorType,
      severity: args.severity,
      message: args.message,
      stackTrace: args.stackTrace,
      context: args.context,
    });
  },
});

// Create a report from the secret-verified webhook (convex/webhooks.ts),
// which is trusted to attribute reports to players directly.
export const createReportFromWebhook = internalMutation({
  args: {
    errorId: v.string(),
    gameId: v.optional(v.string()),
    playerId: v.optional(v.id("players")),
    playerName: v.optional(v.string()),
    errorType: v.string(),
    severity: v.string(),
    message: v.string(),
    stackTrace: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await upsertReport(ctx, args);
  },
});

// Resolve a report (called by bot after fix)
export const resolveReport = internalMutation({
  args: {
    errorId: v.string(),
    resolvedBy: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("reports")
      .withIndex("by_errorId", (q) => q.eq("errorId", args.errorId))
      .first();

    if (!report) {
      throw new Error(`Report not found for errorId: ${args.errorId}`);
    }

    const wasAlreadyResolved = report.status === "resolved";

    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: "resolved",
      resolvedBy: args.resolvedBy || "bot",
      resolvedAt: now,
      updatedAt: now,
    });

    // Post resolution message to feed only if not already resolved
    if (report.playerId && !wasAlreadyResolved) {
      await ctx.db.insert("feed", {
        authorId: report.playerId,
        authorName: "🤖 Noodle Bot",
        authorAvatar: "🤖",
        type: "system",
        content: args.resolutionNote || `Bug in ${report.gameId || "game"} has been fixed!`,
        gameId: report.gameId,
        createdAt: now,
      });
    }

    return report._id;
  },
});

// Get open reports
export const getOpenReports = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .collect();
  },
});

// Get reports for a specific game
export const getGameReports = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .collect();
  },
});

// Get recent reports
export const getRecentReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .take(args.limit || 10);
    return reports;
  },
});

// Update report with Linear issue info
export const updateReportWithLinear = internalMutation({
  args: {
    errorId: v.string(),
    linearIssueId: v.string(),
    linearIssueUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("reports")
      .withIndex("by_errorId", (q) => q.eq("errorId", args.errorId))
      .first();

    if (!report) {
      throw new Error(`Report not found for errorId: ${args.errorId}`);
    }

    await ctx.db.patch(report._id, {
      linearIssueId: args.linearIssueId,
      linearIssueUrl: args.linearIssueUrl,
      status: "investigating",
      updatedAt: Date.now(),
    });

    return report._id;
  },
});
