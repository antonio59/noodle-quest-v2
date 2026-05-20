import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPost = mutation({
  args: { authorId: v.id("players"), type: v.string(), content: v.string(), gameId: v.optional(v.string()), gameName: v.optional(v.string()), gameEmoji: v.optional(v.string()), stage: v.optional(v.number()), stars: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const author = await ctx.db.get(args.authorId);
    if (!author) return { error: "Player not found." };
    const postId = await ctx.db.insert("feed", { authorId: args.authorId, authorName: author.name, authorAvatar: author.avatar, type: args.type, content: args.content, gameId: args.gameId, gameName: args.gameName, gameEmoji: args.gameEmoji, stage: args.stage, stars: args.stars, createdAt: Date.now() });
    return { postId };
  },
});

export const getFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const posts = await ctx.db.query("feed").withIndex("by_time").order("desc").take(limit);
    return posts.map(p => ({ id: p._id, authorName: p.authorName, authorAvatar: p.authorAvatar, type: p.type, content: p.content, gameId: p.gameId, gameName: p.gameName, gameEmoji: p.gameEmoji, stage: p.stage, stars: p.stars, createdAt: p.createdAt }));
  },
});

const mapPost = (p: any) => ({ id: p._id, authorName: p.authorName, authorAvatar: p.authorAvatar, type: p.type, content: p.content, gameId: p.gameId, gameName: p.gameName, gameEmoji: p.gameEmoji, stage: p.stage, stars: p.stars, createdAt: p.createdAt });

export const getChatMessages = query({
  args: { limit: v.optional(v.number()), playerId: v.optional(v.id("players")) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    // Hide chat history that predates the viewer's join time. Without a
    // playerId we fall back to "show nothing" — anonymous viewers should not
    // see the room's backlog.
    let since = Number.POSITIVE_INFINITY;
    if (args.playerId) {
      const viewer = await ctx.db.get(args.playerId);
      if (viewer) since = viewer.createdAt;
    }
    if (!Number.isFinite(since)) return [];

    // Fetch chat, gif, and gif_url posts separately via the type+time index
    const [chats, gifs, gifUrls] = await Promise.all([
      ctx.db.query("feed").withIndex("by_type_time", q => q.eq("type", "chat")).order("desc").take(limit),
      ctx.db.query("feed").withIndex("by_type_time", q => q.eq("type", "gif")).order("desc").take(20),
      ctx.db.query("feed").withIndex("by_type_time", q => q.eq("type", "gif_url")).order("desc").take(20),
    ]);
    // Merge, drop anything older than the viewer joined, sort desc, cap to limit
    const all = [...chats, ...gifs, ...gifUrls]
      .filter(p => p.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return all.map(mapPost);
  },
});

export const getActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const posts = await ctx.db.query("feed").withIndex("by_type_time", q => q.eq("type", "score")).order("desc").take(limit);
    return posts.map(mapPost);
  },
});
