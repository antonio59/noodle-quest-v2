import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Generate a short unique invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface Seat {
  id: Id<"players">;
  name: string;
  avatar: string;
  seat: number;
}

/** Read a canonical player roster from a session, falling back to legacy
 *  player1/player2 fields for documents written before the N-player refactor. */
function rosterFor(session: {
  players?: Seat[];
  player1Id: Id<"players">;
  player1Name: string;
  player1Avatar: string;
  player2Id?: Id<"players">;
  player2Name?: string;
  player2Avatar?: string;
}): Seat[] {
  if (session.players && session.players.length > 0) return session.players;
  const seats: Seat[] = [
    { id: session.player1Id, name: session.player1Name, avatar: session.player1Avatar, seat: 1 },
  ];
  if (session.player2Id && session.player2Name && session.player2Avatar) {
    seats.push({ id: session.player2Id, name: session.player2Name, avatar: session.player2Avatar, seat: 2 });
  }
  return seats;
}

// Create a multiplayer invite (link or direct)
export const createInvite = mutation({
  args: {
    gameId: v.string(),
    fromId: v.id("players"),
    toId: v.optional(v.id("players")),
    minPlayers: v.optional(v.number()),
    maxPlayers: v.optional(v.number()),
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

    const minPlayers = Math.max(2, args.minPlayers ?? 2);
    const maxPlayers = Math.max(minPlayers, args.maxPlayers ?? 2);

    const hostSeat: Seat = {
      id: args.fromId,
      name: from.name,
      avatar: from.avatar,
      seat: 1,
    };

    // Create the session. 'waiting' = host alone; 'lobby' = enough players to
    // start but host hasn't pressed start yet. 'playing' begins on startSession.
    const sessionId = await ctx.db.insert("multiplayer_sessions", {
      gameId: args.gameId,
      player1Id: args.fromId,
      player1Name: from.name,
      player1Avatar: from.avatar,
      players: [hostSeat],
      minPlayers,
      maxPlayers,
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

// Join a multiplayer session via invite code. Appends the joiner to the roster
// up to maxPlayers. Invite stays pending until the lobby is full OR the host
// presses start (startSession).
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

    const player = await ctx.db.get(args.playerId);
    if (!player) return { error: "Player not found." };

    if (!invite.sessionId) return { error: "Session missing." };
    const session = await ctx.db.get(invite.sessionId);
    if (!session) return { error: "Session not found." };

    const roster = rosterFor(session);
    if (roster.some(s => s.id === args.playerId)) {
      // Already joined — idempotent success.
      return { sessionId: invite.sessionId };
    }

    const maxPlayers = session.maxPlayers ?? 2;
    if (roster.length >= maxPlayers) return { error: "Game is full." };

    const minPlayers = session.minPlayers ?? 2;
    const newSeat: Seat = {
      id: args.playerId,
      name: player.name,
      avatar: player.avatar,
      seat: roster.length + 1,
    };
    const players = [...roster, newSeat];

    // For 2-player games the second join auto-starts, matching legacy behaviour.
    // For 3+ player games we stay in 'lobby' until the host calls startSession.
    const canAutoStart = maxPlayers === 2 && players.length === 2;
    const nextStatus = canAutoStart ? 'playing' : 'lobby';

    // Keep legacy player2* fields populated when seat 2 fills, for older reads.
    const legacyPatch: {
      player2Id?: Id<"players">;
      player2Name?: string;
      player2Avatar?: string;
    } = {};
    if (newSeat.seat === 2) {
      legacyPatch.player2Id = newSeat.id;
      legacyPatch.player2Name = newSeat.name;
      legacyPatch.player2Avatar = newSeat.avatar;
    }

    await ctx.db.patch(invite.sessionId, {
      ...legacyPatch,
      players,
      status: nextStatus,
      updatedAt: Date.now(),
    });

    // Accept the invite only once the lobby is considered ready. Leave it
    // pending while we're still filling seats.
    if (canAutoStart || players.length >= maxPlayers) {
      await ctx.db.patch(invite._id, { status: 'accepted' });
    }

    return { sessionId: invite.sessionId, players, canStart: players.length >= minPlayers };
  },
});

// Host starts the session once ≥ minPlayers have joined. No-op for 2-player
// games, which auto-start when the second player joins.
export const startSession = mutation({
  args: {
    sessionId: v.id("multiplayer_sessions"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { error: "Session not found." };
    if (session.player1Id !== args.playerId) return { error: "Only the host can start." };
    if (session.status === 'playing' || session.status === 'finished') {
      return { error: "Game already started." };
    }
    const roster = rosterFor(session);
    const minPlayers = session.minPlayers ?? 2;
    if (roster.length < minPlayers) {
      return { error: `Need at least ${minPlayers} players.` };
    }
    await ctx.db.patch(args.sessionId, {
      status: 'playing',
      currentPlayer: 1,
      updatedAt: Date.now(),
    });
    // Accept any remaining pending invites tied to this session.
    const invites = await ctx.db.query("multiplayer_invites")
      .withIndex("by_from", q => q.eq("fromId", session.player1Id))
      .collect();
    for (const inv of invites) {
      if (inv.sessionId === args.sessionId && inv.status === 'pending') {
        await ctx.db.patch(inv._id, { status: 'accepted' });
      }
    }
    return { ok: true };
  },
});

// Get a multiplayer session
export const getSession = query({
  args: { sessionId: v.id("multiplayer_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    const roster = rosterFor(session);
    return {
      _id: session._id,
      gameId: session.gameId,
      players: roster,
      minPlayers: session.minPlayers ?? 2,
      maxPlayers: session.maxPlayers ?? 2,
      // Legacy mirrors for any old callers
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

// Make a move in a multiplayer session. Rotates currentPlayer modulo N.
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

    const roster = rosterFor(session);
    const seat = roster.find(s => s.id === args.playerId);
    if (!seat) return { error: "You are not in this game." };
    if (session.currentPlayer !== seat.seat) return { error: "Not your turn." };

    const moves = [...session.moves, { player: seat.seat, move: args.move, at: Date.now() }];
    const nextSeat = (seat.seat % roster.length) + 1;

    await ctx.db.patch(args.sessionId, {
      boardState: args.move.boardState ?? session.boardState,
      currentPlayer: nextSeat,
      moves,
      winner: args.move.winner,
      status: args.move.winner !== undefined ? 'finished' : 'playing',
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

// Get active games for a player. Scans playing sessions the player is in.
export const getActiveGames = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const playing = await ctx.db.query("multiplayer_sessions")
      .withIndex("by_status", q => q.eq("status", "playing"))
      .collect();

    const mine = playing.filter(s => rosterFor(s).some(seat => seat.id === args.playerId));

    return mine.map(s => {
      const roster = rosterFor(s);
      const mySeat = roster.find(seat => seat.id === args.playerId)!;
      const others = roster.filter(seat => seat.id !== args.playerId);
      const firstOther = others[0];
      return {
        _id: s._id,
        gameId: s.gameId,
        opponentName: firstOther?.name ?? null,
        opponentAvatar: firstOther?.avatar ?? null,
        playerCount: roster.length,
        currentPlayer: s.currentPlayer,
        isMyTurn: s.currentPlayer === mySeat.seat,
        updatedAt: s.updatedAt,
      };
    });
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
