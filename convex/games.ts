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

export const getLeaderboard = query({
  args: { gameId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scores = args.gameId
      ? await ctx.db.query("scores").withIndex("by_game_score", q => q.eq("gameId", args.gameId!)).order("desc").take(100)
      : await ctx.db.query("scores").order("desc").take(500);

    const playerMap = new Map<string, { name: string; avatar: string; totalStars: number; totalScore: number; games: Set<string> }>();
    for (const s of scores) {
      const existing = playerMap.get(s.playerId);
      if (existing) {
        existing.totalStars += s.stars;
        existing.totalScore += s.score;
        existing.games.add(s.gameId);
      } else {
        const player = await ctx.db.get(s.playerId);
        playerMap.set(s.playerId, { name: player?.name || "?", avatar: player?.avatar || "🎮", totalStars: s.stars, totalScore: s.score, games: new Set([s.gameId]) });
      }
    }
    return Array.from(playerMap.entries()).map(([id, p]) => ({ playerId: id, playerName: p.name, avatar: p.avatar, totalStars: p.totalStars, totalScore: p.totalScore, gamesPlayed: p.games.size })).sort((a, b) => b.totalStars - a.totalStars).slice(0, 50);
  },
});

export const getPlayerStats = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const progress = await ctx.db.query("progress").withIndex("by_player", q => q.eq("playerId", args.playerId)).collect();
    let totalStars = 0;
    let gamesPlayed = 0;
    let maxStage = 0;
    let threeStars = 0;
    const uniqueGames = new Set<string>();

    for (const p of progress) {
      totalStars += p.starsEarned;
      gamesPlayed += p.timesPlayed;
      if (p.stage > maxStage) maxStage = p.stage;
      if (p.starsEarned >= 3) threeStars++;
      uniqueGames.add(p.gameId);
    }

    return { totalStars, gamesPlayed, maxStage, threeStars, uniqueGames: uniqueGames.size, playedGameIds: [...uniqueGames] };
  },
});
