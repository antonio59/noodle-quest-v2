import type { MutationCtx, QueryCtx } from "../_generated/server";

const GATE_KEY = "default";
const MAX_ADMIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Length-constant XOR compare — avoids leaking secret length via early return. */
export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

function canWrite(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  // MutationCtx exposes scheduler; QueryCtx does not.
  return "scheduler" in ctx;
}

/**
 * Verify the admin secret with constant-time compare and rate limiting.
 * Rate-limit counters only update from mutations (queries are read-only);
 * queries still respect an existing lock.
 */
export async function assertAdminSecret(
  ctx: QueryCtx | MutationCtx,
  secret: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || expected.length < 24) {
    return { ok: false, error: "Admin not configured" };
  }

  const gate = await ctx.db
    .query("admin_gate")
    .withIndex("by_key", q => q.eq("key", GATE_KEY))
    .unique();

  const now = Date.now();
  if (gate?.lockedUntil && gate.lockedUntil > now) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!timingSafeEqual(secret, expected)) {
    if (canWrite(ctx)) {
      const failedAttempts = (gate?.failedAttempts ?? 0) + 1;
      if (failedAttempts >= MAX_ADMIN_ATTEMPTS) {
        if (gate) {
          await ctx.db.patch(gate._id, { failedAttempts: 0, lockedUntil: now + ADMIN_LOCKOUT_MS });
        } else {
          await ctx.db.insert("admin_gate", {
            key: GATE_KEY,
            failedAttempts: 0,
            lockedUntil: now + ADMIN_LOCKOUT_MS,
          });
        }
      } else if (gate) {
        await ctx.db.patch(gate._id, { failedAttempts });
      } else {
        await ctx.db.insert("admin_gate", { key: GATE_KEY, failedAttempts });
      }
    }
    return { ok: false, error: "Unauthorized" };
  }

  if (canWrite(ctx) && gate && ((gate.failedAttempts ?? 0) > 0 || gate.lockedUntil)) {
    await ctx.db.patch(gate._id, { failedAttempts: 0, lockedUntil: undefined });
  }

  return { ok: true };
}
