import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    name: v.string(),
    pin: v.string(),
    avatar: v.string(),
    createdAt: v.number(),
    lastActive: v.number(),
  }).index("by_name", ["name"]),

  progress: defineTable({
    playerId: v.id("players"),
    gameId: v.string(),
    stage: v.number(),
    highScore: v.number(),
    starsEarned: v.number(),
    timesPlayed: v.number(),
    lastPlayed: v.number(),
  })
    .index("by_player", ["playerId"])
    .index("by_player_game", ["playerId", "gameId"]),

  scores: defineTable({
    playerId: v.id("players"),
    gameId: v.string(),
    stage: v.number(),
    score: v.number(),
    stars: v.number(),
    playedAt: v.number(),
  })
    .index("by_player", ["playerId"])
    .index("by_game_score", ["gameId", "score"]),

  challenges: defineTable({
    fromId: v.id("players"),
    toId: v.id("players"),
    gameId: v.string(),
    stage: v.number(),
    fromScore: v.number(),
    toScore: v.optional(v.number()),
    status: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_to", ["toId", "status"])
    .index("by_from", ["fromId"]),

  feed: defineTable({
    authorId: v.id("players"),
    authorName: v.string(),
    authorAvatar: v.string(),
    type: v.string(),
    content: v.string(),
    gameId: v.optional(v.string()),
    gameName: v.optional(v.string()),
    gameEmoji: v.optional(v.string()),
    stage: v.optional(v.number()),
    stars: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_time", ["createdAt"]),

  favorites: defineTable({
    playerId: v.id("players"),
    gameId: v.string(),
    addedAt: v.number(),
  }).index("by_player", ["playerId"]),

  playlists: defineTable({
    playerId: v.id("players"),
    name: v.string(),
    trackIds: v.array(v.string()),
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_player", ["playerId"]),
});
