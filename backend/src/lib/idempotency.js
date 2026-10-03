// MHI BizMate — Idempotency helper.
// Prevents duplicate business records when the same request is replayed with
// the same idempotency key. Scoped per workspace + actor. Auditable via the
// idempotency_keys table (migration 0006).
//
// USAGE:
//   const result = await withIdempotency(ctx, req.headers["idempotency-key"],
//     "CREATE_ORDER", () => orderHandlers.create(ctx, body));
//
// BEHAVIOR:
//   * No key → executes normally (backwards compatible with frontend that
//     doesn't send one yet).
//   * Key exists, same action + actor, not expired → replays the stored result.
//   * Key exists, different action or actor → 409 Conflict.
//   * Key exists but expired → 409 Conflict (client must generate a new key).
//   * Key not found → executes, stores the result, returns it.
//   * Execution throws → nothing is stored; client can retry with the same key.
//   * Concurrent inserts → unique constraint resolves; loser replays winner's result.
import { supabase } from "./supabaseClient.js";
import { ConflictError } from "./errors.js";

const TTL_HOURS = 24;

export async function withIdempotency(ctx, key, action, fn) {
  if (!key) return fn();

  // 1. Check for an existing record
  const { data: existing, error: qErr } = await supabase
    .from("idempotency_keys")
    .select("action, actor_id, response_code, response_body, expires_at")
    .eq("workspace_id", ctx.workspaceId)
    .eq("key", key)
    .maybeSingle();

  if (qErr) {
    // Fail open for availability — proceed without idempotency
    console.error("[IDEMPOTENCY] Check failed:", qErr.message);
    return fn();
  }

  if (existing) {
    if (existing.action !== action) {
      throw new ConflictError("Idempotency key was already used for a different action.");
    }
    if (existing.actor_id !== ctx.userId) {
      throw new ConflictError("Idempotency key was already used by a different user.");
    }
    if (new Date(existing.expires_at) < new Date()) {
      throw new ConflictError("Idempotency key has expired. Please generate a new one.");
    }
    return { __idempotentReplay: true, code: existing.response_code, body: existing.response_body };
  }

  // 2. Execute the function (errors are NOT stored — client can retry)
  const result = await fn();

  // 3. Store the result (unique constraint prevents duplicates)
  const { error: storeErr } = await supabase.from("idempotency_keys").insert({
    workspace_id: ctx.workspaceId,
    key,
    action,
    actor_id: ctx.userId,
    response_code: 201,
    response_body: result,
    expires_at: new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString(),
  });

  if (storeErr) {
    // 23505 = unique violation — a concurrent request completed first
    if (storeErr.code === "23505") {
      const { data: replay } = await supabase
        .from("idempotency_keys")
        .select("response_code, response_body")
        .eq("workspace_id", ctx.workspaceId)
        .eq("key", key)
        .maybeSingle();
      if (replay) {
        return { __idempotentReplay: true, code: replay.response_code, body: replay.response_body };
      }
    }
    console.error("[IDEMPOTENCY] Store failed:", storeErr.message);
  }

  return result;
}