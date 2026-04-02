import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a short unique invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Create a multiplayer invite (link or direct)
export const createInvite = mutation({
  args: {
    gameId: v.string(),
    fromId: v.id("players"),
    toId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const from = await ctx.db.get(args.fromId);
    if (!from) return { error: "Player not found." };

    let toName: string | undefined;
    if (args.toId) {
      const to = await ctx.db.get(args.toId);
      if (!to) return { error: "Target player not found." };
      toName = to.name;
    }

    // Create the session in 'waiting' status
    const sessionId = await ctx.db.insert("multiplayer_sessions", {
      gameId: args.gameId,
      player1Id: args.fromId,
      player1Name: from.name,
      player1Avatar: from.avatar,
      boardState: null,
      currentPlayer: 1,
      status: 'waiting',
      moves: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const inviteCode = generateInviteCode();
    const inviteId = await ctx.db.insert("multiplayer_invites", {
      gameId: args.gameId,
      fromId: args.fromId,
      fromName: from.name,
      fromAvatar: from.avatar,
      toId: args.toId,
      toName,
      inviteCode,
      sessionId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    // Auto-post to feed
    await ctx.db.insert("feed", {
      authorId: args.fromId,
      authorName: from.name,
      authorAvatar: from.avatar,
      type: 'invite',
      content: `invited someone to play ${args.gameId}!`,
      gameId: args.gameId,
      createdAt: Date.now(),
    });

    return { inviteId, inviteCode, sessionId };
  },
});

// Get invite by code
export const getInvite = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("multiplayer_invites")
      .withIndex("by_code", q => q.eq("inviteCode", args.inviteCode))
      .unique();
    if (!invite) return null;
    return {
      _id: invite._id,
      gameId: invite.gameId,
      fromId: invite.fromId,
      fromName: invite.fromName,
      fromAvatar: invite.fromAvatar,
      toId: invite.toId,
      toName: invite.toName,
      inviteCode: invite.inviteCode,
      sessionId: invite.sessionId,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    };
  },
});

// Get pending invites for a player
export const getPendingInvites = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const invites = await ctx.db.query("multiplayer_invites")
      .withIndex("by_to", q => q.eq("toId", args.playerId).eq("status", "pending"))
      .collect();
    return invites
      .filter(i => i.expiresAt > Date.now())
      .map(i => ({
        _id: i._id,
        gameId: i.gameId,
        fromName: i.fromName,
        fromAvatar: i.fromAvatar,
        inviteCode: i.inviteCode,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
      }));
  },
});

// Join a multiplayer session via invite code
export const joinSession = mutation({
  args: {
    inviteCode: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("multiplayer_invites")
      .withIndex("by_code", q => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!invite) return { error: "Invite not found." };
    if (invite.status !== 'pending') return { error: "Invite already used." };
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: 'expired' });
      return { error: "Invite has expired." };
    }
    if (invite.fromId === args.playerId) return { error: "You can't join your own invite." };

    const player = await ctx.db.get(args.playerId);
    if (!player) return { error: "Player not found." };

    // Update the session
    if (invite.sessionId) {
      await ctx.db.patch(invite.sessionId, {
        player2Id: args.playerId,
        player2Name: player.name,
        player2Avatar: player.avatar,
        status: 'playing',
        updatedAt: Date.now(),
      });
    }

    // Mark invite as accepted
    await ctx.db.patch(invite._id, { status: 'accepted' });

    return { sessionId: invite.sessionId };
  },
});

// Get a multiplayer session
export const getSession = query({
  args: { sessionId: v.id("multiplayer_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return {
      _id: session._id,
      gameId: session.gameId,
      player1Id: session.player1Id,
      player1Name: session.player1Name,
      player1Avatar: session.player1Avatar,
      player2Id: session.player2Id,
      player2Name: session.player2Name,
      player2Avatar: session.player2Avatar,
      boardState: session.boardState,
      currentPlayer: session.currentPlayer,
      status: session.status,
      winner: session.winner,
      moves: session.moves,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  },
});

// Make a move in a multiplayer session
export const makeMove = mutation({
  args: {
    sessionId: v.id("multiplayer_sessions"),
    playerId: v.id("players"),
    move: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { error: "Session not found." };
    if (session.status !== 'playing') return { error: "Game is not active." };

    // Determine which player is making the move
    let playerNumber: number;
    if (session.player1Id === args.playerId) {
      playerNumber = 1;
    } else if (session.player2Id === args.playerId) {
      playerNumber = 2;
    } else {
      return { error: "You are not in this game." };
    }

    if (session.currentPlayer !== playerNumber) {
      return { error: "Not your turn." };
    }

    // Record the move
    const moves = [...session.moves, { player: playerNumber, move: args.move, at: Date.now() }];

    // Update board state and switch turn
    await ctx.db.patch(args.sessionId, {
      boardState: args.move.boardState ?? session.boardState,
      currentPlayer: playerNumber === 1 ? 2 : 1,
      moves,
      winner: args.move.winner,
      status: args.move.winner !== undefined ? 'finished' : 'playing',
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

// Get active games for a player
export const getActiveGames = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const asPlayer1 = await ctx.db.query("multiplayer_sessions")
      .withIndex("by_player1", q => q.eq("player1Id", args.playerId).eq("status", "playing"))
      .collect();
    const asPlayer2 = await ctx.db.query("multiplayer_sessions")
      .withIndex("by_player2", q => q.eq("player2Id", args.playerId).eq("status", "playing"))
      .collect();

    return [...asPlayer1, ...asPlayer2].map(s => ({
      _id: s._id,
      gameId: s.gameId,
      opponentName: s.player1Id === args.playerId ? s.player2Name : s.player1Name,
      opponentAvatar: s.player1Id === args.playerId ? s.player2Avatar : s.player1Avatar,
      currentPlayer: s.currentPlayer,
      isMyTurn: (s.player1Id === args.playerId && s.currentPlayer === 1) ||
                (s.player2Id === args.playerId && s.currentPlayer === 2),
      updatedAt: s.updatedAt,
    }));
  },
});

// Decline an invite
export const declineInvite = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("multiplayer_invites")
      .withIndex("by_code", q => q.eq("inviteCode", args.inviteCode))
      .unique();
    if (!invite) return { error: "Invite not found." };
    await ctx.db.patch(invite._id, { status: 'declined' });
    if (invite.sessionId) {
      await ctx.db.patch(invite.sessionId, { status: 'finished', updatedAt: Date.now() });
    }
    return { ok: true };
  },
});
