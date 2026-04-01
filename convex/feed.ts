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
