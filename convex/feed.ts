import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPost = mutation({
  args: {
    authorId: v.id("players"),
    type: v.string(),
    content: v.string(),
    gameId: v.optional(v.string()),
    gameName: v.optional(v.string()),
    gameEmoji: v.optional(v.string()),
    stage: v.optional(v.number()),
    stars: v.optional(v.number()),
    replyToId: v.optional(v.id("feed")),
  },
  handler: async (ctx, args) => {
    const author = await ctx.db.get(args.authorId);
    if (!author) return { error: "Player not found." };

    // Snapshot the quoted message so deletions/edits don't break old replies.
    let replyToAuthorName: string | undefined;
    let replyToContent: string | undefined;
    let replyToType: string | undefined;
    if (args.replyToId) {
      const original = await ctx.db.get(args.replyToId);
      if (original) {
        replyToAuthorName = original.authorName;
        replyToContent = original.content;
        replyToType = original.type;
      }
    }

    const postId = await ctx.db.insert("feed", {
      authorId: args.authorId,
      authorName: author.name,
      authorAvatar: author.avatar,
      type: args.type,
      content: args.content,
      gameId: args.gameId,
      gameName: args.gameName,
      gameEmoji: args.gameEmoji,
      stage: args.stage,
      stars: args.stars,
      createdAt: Date.now(),
      replyToId: args.replyToId,
      replyToAuthorName,
      replyToContent,
      replyToType,
    });
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

const mapPost = (p: any) => ({
  id: p._id,
  authorName: p.authorName,
  authorAvatar: p.authorAvatar,
  type: p.type,
  content: p.content,
  gameId: p.gameId,
  gameName: p.gameName,
  gameEmoji: p.gameEmoji,
  stage: p.stage,
  stars: p.stars,
  createdAt: p.createdAt,
  replyToId: p.replyToId,
  replyToAuthorName: p.replyToAuthorName,
  replyToContent: p.replyToContent,
  replyToType: p.replyToType,
});

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
    const visible = [...chats, ...gifs, ...gifUrls]
      .filter(p => p.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // Bundle reactions for the visible posts. Done in one parallel batch so
    // the client gets reactions in the same snapshot as the messages.
    const reactionsPerPost = await Promise.all(
      visible.map(p =>
        ctx.db.query("reactions").withIndex("by_post", q => q.eq("postId", p._id)).collect(),
      ),
    );

    return visible.map((p, i) => ({
      ...mapPost(p),
      reactions: reactionsPerPost[i].map(r => ({
        id: r._id,
        playerId: r.playerId,
        playerName: r.playerName,
        emoji: r.emoji,
      })),
    }));
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

// Toggle a reaction: if the same (post, player, emoji) row exists, remove it;
// otherwise insert it. A player can stack multiple distinct emojis on the
// same post (Slack/Discord-style), but tapping the same emoji twice
// removes their reaction.
export const toggleReaction = mutation({
  args: {
    postId: v.id("feed"),
    playerId: v.id("players"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return { error: "Player not found." };

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_post_player", q => q.eq("postId", args.postId).eq("playerId", args.playerId))
      .collect();
    const match = existing.find(r => r.emoji === args.emoji);
    if (match) {
      await ctx.db.delete(match._id);
      return { removed: true };
    }
    await ctx.db.insert("reactions", {
      postId: args.postId,
      playerId: args.playerId,
      playerName: player.name,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
    return { added: true };
  },
});
