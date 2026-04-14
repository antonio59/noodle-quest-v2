import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveScore = mutation({
  args: { playerId: v.id("players"), gameId: v.string(), stage: v.number(), score: v.number(), stars: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("scores", { ...args, playedAt: Date.now() });
    const existing = await ctx.db.query("progress").withIndex("by_player_game", q => q.eq("playerId", args.playerId).eq("gameId", args.gameId)).filter(q => q.eq(q.field("stage"), args.stage)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { highScore: Math.max(existing.highScore, args.score), starsEarned: existing.starsEarned + args.stars, timesPlayed: existing.timesPlayed + 1, lastPlayed: Date.now() });
    } else {
      await ctx.db.insert("progress", { playerId: args.playerId, gameId: args.gameId, stage: args.stage, highScore: args.score, starsEarned: args.stars, timesPlayed: 1, lastPlayed: Date.now() });
    }
    if (args.score > 0) {
      const player = await ctx.db.get(args.playerId);
      if (player) await ctx.db.insert("feed", { authorId: args.playerId, authorName: player.name, authorAvatar: player.avatar, type: "score", content: `${"⭐".repeat(Math.min(args.stars, 3))} on ${args.gameId}!`, gameId: args.gameId, stage: args.stage, stars: args.stars, createdAt: Date.now() });
    }
    return { ok: true };
  },
});

export const getPlayerProgress = query({
  args: { playerId: v.id("players"), gameId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_player_game", q => q.eq("playerId", args.playerId).eq("gameId", args.gameId))
      .collect();
    // Return the highest stage that was completed (earned at least 1 star)
    let maxStage = 0;
    for (const r of rows) {
      if (r.starsEarned > 0 && r.stage > maxStage) maxStage = r.stage;
    }
    return { maxUnlockedStage: maxStage + 1, stages: rows.map(r => ({ stage: r.stage, highScore: r.highScore, stars: r.starsEarned, timesPlayed: r.timesPlayed })) };
  },
});

export const getPlayerStats = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const scores = await ctx.db.query("scores").withIndex("by_player", q => q.eq("playerId", args.playerId)).collect();
    let totalStars = 0;
    let totalScore = 0;
    const gameIds = new Set<string>();
    for (const s of scores) {
      totalStars += s.stars;
      totalScore += s.score;
      gameIds.add(s.gameId);
    }
    // Get progress for best stage info
    const progress = await ctx.db.query("progress").withIndex("by_player", q => q.eq("playerId", args.playerId)).collect();
    const gameStages: Record<string, { highScore: number; starsEarned: number; timesPlayed: number }> = {};
    for (const p of progress) {
      const key = `${p.gameId}:${p.stage}`;
      if (!gameStages[p.gameId] || p.highScore > gameStages[p.gameId].highScore) {
        gameStages[p.gameId] = { highScore: p.highScore, starsEarned: p.starsEarned, timesPlayed: p.timesPlayed };
      }
    }
    return { totalStars, totalScore, gamesPlayed: gameIds.size, totalGames: scores.length, gameStages };
  },
});

export const getLeaderboard = query({
  args: { gameId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scores = args.gameId
      ? await ctx.db.query("scores").withIndex("by_game_score", q => q.eq("gameId", args.gameId!)).collect()
      : await ctx.db.query("scores").collect();

    const playerMap = new Map<string, { name: string; avatar: string; totalStars: number; totalScore: number; games: Map<string, { stars: number; score: number }> }>();
    for (const s of scores) {
      const existing = playerMap.get(s.playerId);
      const gameStats = existing?.games.get(s.gameId) || { stars: 0, score: 0 };
      const newStars = gameStats.stars + s.stars;
      const newScore = gameStats.score + s.score;
      
      if (existing) {
        existing.totalStars += s.stars;
        existing.totalScore += s.score;
        existing.games.set(s.gameId, { stars: newStars, score: newScore });
      } else {
        const player = await ctx.db.get(s.playerId);
        const gamesMap = new Map<string, { stars: number; score: number }>();
        gamesMap.set(s.gameId, { stars: s.stars, score: s.score });
        playerMap.set(s.playerId, { name: player?.name || "?", avatar: player?.avatar || "🎮", totalStars: s.stars, totalScore: s.score, games: gamesMap });
      }
    }
    
    return Array.from(playerMap.entries())
      .map(([id, p]) => {
        const topGames = Array.from(p.games.entries())
          .map(([gameId, stats]) => ({ gameId, stars: stats.stars, score: stats.score }))
          .sort((a, b) => b.stars - a.stars)
          .slice(0, 5);
        return { playerId: id, playerName: p.name, avatar: p.avatar, totalStars: p.totalStars, totalScore: p.totalScore, gamesPlayed: p.games.size, topGames };
      })
      .sort((a, b) => b.totalStars - a.totalStars)
      .slice(0, 50);
  },
});
