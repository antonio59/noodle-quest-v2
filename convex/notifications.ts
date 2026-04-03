import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getNotifications = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db.query("notifications").withIndex("by_player", q => q.eq("playerId", args.playerId)).order("desc").take(50);
    return notifications.map(n => ({ id: n._id, type: n.type, fromName: n.fromName, fromAvatar: n.fromAvatar, content: n.content, postId: n.postId, read: n.read, createdAt: n.createdAt }));
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const notifs = await ctx.db.query("notifications").withIndex("by_player", q => q.eq("playerId", args.playerId).eq("read", false)).collect();
    for (const n of notifs) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const createNotification = mutation({
  args: { playerId: v.id("players"), type: v.string(), fromId: v.id("players"), fromName: v.string(), fromAvatar: v.string(), content: v.string(), postId: v.optional(v.id("feed")) },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("notifications", { playerId: args.playerId, type: args.type, fromId: args.fromId, fromName: args.fromName, fromAvatar: args.fromAvatar, content: args.content, postId: args.postId, read: false, createdAt: Date.now() });
    return { id };
  },
});
