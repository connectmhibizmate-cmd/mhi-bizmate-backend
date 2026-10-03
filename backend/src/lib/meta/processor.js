// MHI BizMate — Meta Connector: Event processor.
//
// This is the bridge between the Meta Connector and the AI Employees. It:
//   1. Atomically claims the webhook event (concurrent-duplicate safe).
//   2. Resolves the workspace from the trusted page→workspace mapping.
//   3. For Messenger: finds/creates conversation + stores the message.
//   4. Resolves customer identity (finds existing; AI creates new via Heart).
//   5. Routes to the appropriate AI Employee (Facebook Comment AI or Messenger AI).
//   6. The AI generates a reply + optional structured action.
//   7. Structured actions go through the Heart of BizMate (validation + execution).
//   8. Sends the reply back to Meta via the reply service.
//   9. Stores the outgoing message in the conversations table.
//  10. Updates the event status based on the real reply outcome.
//
// SECURITY:
//   - workspace_id is ALWAYS resolved from the trusted meta_pages mapping,
//     NEVER from the webhook payload.
//   - The AI never sees the raw Meta payload — only the normalized event.
//   - The AI never chooses the page token or recipient — the reply service
//     validates everything.
//   - The Heart validates all business actions — the processor never writes
//     business data directly (only conversation/message persistence, which
//     is connector-level, not business-level).
//   - PURCHASE INTENT ≠ CONFIRMED ORDER. The Messenger AI can only create
//     PENDING orders. No confirmed orders are ever created from webhooks.
//
// IDEMPOTENCY:
//   - The event is atomically claimed (status='processing') BEFORE any work.
//     A concurrent duplicate delivery gets a unique-violation and is skipped.
//   - The event is only marked 'processed' after the reply outcome is known.
//     A failed reply is marked 'failed' (recoverable), never 'processed'.
//   - Duplicate delivery after success is deduplicated (claim already exists).

import { supabase } from "../supabaseClient.js";
import { getWorkspaceForPage } from "./connection.js";
import { normalizeWebhookPayload, buildEventReference } from "./events.js";
import { replyToComment, sendPrivateReplyToComment, replyMessengerMessage } from "./replies.js";
import { getMessengerProfile } from "./client.js";
import { decryptToken } from "./crypto.js";
import { getEmployee } from "../ai/employees/index.js";
import { generateCorrelationId } from "./crypto.js";
import { MetaUnknownPageError, MetaInactivePageError, MetaError } from "./errors.js";

// Process a raw webhook payload (already signature-verified).
// Returns a summary of processed events.
export async function processWebhookPayload(rawPayload) {
  const events = normalizeWebhookPayload(rawPayload);
  const results = [];

  for (const event of events) {
    const correlationId = generateCorrelationId();
    try {
      const result = await _processSingleEvent(event, correlationId);
      results.push(result);
    } catch (e) {
      // A thrown error means processing failed — mark the event as failed so
      // it is not incorrectly recorded as successful.
      await _updateEventStatus(event, null, "failed", correlationId, {
        error: e.category || "UNKNOWN",
        message: e.message || "Unknown error",
      }).catch(() => {});
      results.push({
        event_id: event.external_event_id,
        event_type: event.event_type,
        status: "failed",
        error: e.category || "UNKNOWN",
        correlationId,
      });
      console.error(`[META] Event processing failed (${correlationId}):`, e.message);
    }
  }

  return { processed: results.length, results };
}

// Process a single normalized event.
async function _processSingleEvent(event, correlationId) {
  // 1. Atomic claim: insert with status='processing'. If the unique
  //    (external_event_id, source) constraint rejects the insert, this is a
  //    duplicate delivery — skip processing entirely.
  const claim = await _claimEvent(event, correlationId);
  if (claim.duplicate) {
    return {
      event_id: event.external_event_id,
      event_type: event.event_type,
      status: "deduplicated",
      correlationId,
    };
  }

  // 2. Resolve workspace from the trusted page→workspace mapping
  const pageMapping = await getWorkspaceForPage(event.page_id);
  if (!pageMapping) {
    await _updateEventStatus(event, null, "ignored", correlationId);
    return { event_id: event.external_event_id, event_type: event.event_type, status: "unknown_page", correlationId };
  }
  if (!pageMapping.isActive) {
    await _updateEventStatus(event, pageMapping.workspaceId, "ignored", correlationId);
    return { event_id: event.external_event_id, event_type: event.event_type, status: "inactive_page", correlationId };
  }

  const workspaceId = pageMapping.workspaceId;

  // 3. Build the server-side context (never trusts webhook payload for workspace)
  const ctx = {
    workspaceId,
    userId: null, // System/connector context — no user actor
    role: "MEMBER", // Connector acts at MEMBER level for AI actions
    platformRole: null,
    correlationId,
  };

  // 4. Route to the appropriate AI employee
  let result;
  try {
    if (event.event_type === "facebook_comment") {
      result = await _processCommentEvent(ctx, event, pageMapping);
    } else if (event.event_type === "messenger_message") {
      result = await _processMessengerEvent(ctx, event, pageMapping);
    } else {
      await _updateEventStatus(event, workspaceId, "ignored", correlationId);
      return { event_id: event.external_event_id, event_type: event.event_type, status: "ignored", correlationId };
    }
  } catch (e) {
    // Processing threw — mark failed (recoverable), not processed.
    await _updateEventStatus(event, workspaceId, "failed", correlationId, {
      error: e.category || "UNKNOWN",
      message: e.message || "Unknown error",
    });
    return {
      event_id: event.external_event_id,
      event_type: event.event_type,
      status: "failed",
      error: e.category || "UNKNOWN",
      correlationId,
    };
  }

  // 5. Update the event status based on the REAL reply outcome.
  //    'processed' only when the reply was sent (or no reply was needed and
  //    processing completed without error). 'failed' when a reply was
  //    attempted but Meta rejected it.
  const finalStatus = result.replyFailed ? "failed" : "processed";
  await _updateEventStatus(event, workspaceId, finalStatus, correlationId, {
    action: result.action || null,
    reply_sent: result.replySent || false,
    reply_failed: result.replyFailed || false,
  });

  return {
    event_id: event.external_event_id,
    event_type: event.event_type,
    status: finalStatus,
    action: result.action || null,
    reply_sent: result.replySent || false,
    correlationId,
  };
}

// ---- Atomic claim: insert a 'processing' row for the event ----
// Returns { duplicate: true } if the event was already claimed/processed.
async function _claimEvent(event, correlationId) {
  const { error } = await supabase.from("meta_webhook_events").insert({
    workspace_id: null, // resolved after claim
    external_event_id: event.external_event_id,
    event_type: event.event_type,
    source: event.source,
    status: "processing",
    correlation_id: correlationId,
    metadata: buildEventReference(event),
  });

  if (error) {
    if (error.code === "23505") {
      // Unique violation — duplicate delivery, already claimed/processed.
      return { duplicate: true };
    }
    // Other insert error — log and proceed best-effort (claim unprotected).
    console.error("[META] Failed to claim webhook event:", error.message);
  }
  return { duplicate: false };
}

// ---- Update an existing claimed event's status + workspace ----
async function _updateEventStatus(event, workspaceId, status, correlationId, metadata = {}) {
  try {
    await supabase
      .from("meta_webhook_events")
      .update({
        workspace_id: workspaceId,
        status,
        metadata: {
          ...buildEventReference(event),
          ...metadata,
        },
      })
      .eq("external_event_id", event.external_event_id)
      .eq("source", event.source);
  } catch (e) {
    // Best-effort — status update failure should not break the flow.
    console.error("[META] Failed to update webhook event status:", e.message);
  }
}

// ---- Facebook Comment processing ----
async function _processCommentEvent(ctx, event, pageMapping) {
  const employee = getEmployee("facebook_comment_ai");
  if (!employee) throw new MetaError("Facebook Comment AI not found.", "UNKNOWN");

  // Build the AI input from the normalized event
  const aiInput = {
    event_type: "facebook_comment",
    comment_text: event.text,
    comment_id: event.comment_id,
    customer_identity: {
      name: event.sender_name || "Facebook User",
      facebook_id: event.sender_id,
    },
    product_hint: {
      post_id: event.post_id,
    },
    taskType: "comment_reply",
  };

  // Execute through the AI pipeline (structured mode)
  const aiResult = await employee.execute(ctx, aiInput);

  // Send the reply back to Meta
  let replySent = false;
  let replyFailed = false;
  if (aiResult.reply) {
    try {
      await replyToComment(ctx, event.comment_id, aiResult.reply, ctx.correlationId);
      replySent = true;
    } catch (e) {
      console.error(`[META] Comment reply failed (${ctx.correlationId}):`, e.message);
      // If comment reply fails (e.g., rate limited), try private reply as fallback
      try {
        await sendPrivateReplyToComment(ctx, event.comment_id, aiResult.reply, ctx.correlationId);
        replySent = true;
      } catch (e2) {
        console.error(`[META] Private reply also failed (${ctx.correlationId}):`, e2.message);
        replyFailed = true;
      }
    }
  }

  return {
    action: aiResult.action?.proposed || null,
    replySent,
    replyFailed,
  };
}

// ---- Messenger message processing ----
async function _processMessengerEvent(ctx, event, pageMapping) {
  const employee = getEmployee("messenger_ai");
  if (!employee) throw new MetaError("Messenger AI not found.", "UNKNOWN");

  // 1. Find or create the conversation
  const conversation = await _findOrCreateConversation(ctx, event, pageMapping);

  // 2. Store the incoming customer message
  await _storeMessage(ctx, conversation.id, "customer", event.text, {
    externalMessageId: event.message_id,
    facebookId: event.sender_id,
    source: "messenger",
  });

  // 3. Resolve customer identity (find existing by facebook_id).
  //    Does NOT create a customer here — the AI proposes CREATE_CUSTOMER
  //    through the Heart when no match exists and enough info is collected.
  const customer = await _findCustomer(ctx, event);

  // 4. Get the sender's profile (best-effort) for the customer name
  let senderName = event.sender_name;
  if (!senderName) {
    try {
      const pageToken = decryptToken(pageMapping.encryptedPageToken);
      const profile = await getMessengerProfile(event.sender_id, pageToken);
      senderName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Facebook User";
    } catch {
      senderName = "Facebook User";
    }
  }

  // 5. Build the AI input. customerId is null for a new customer — the AI
  //    contextBuilder will load an empty customer context and the AI should
  //    propose CREATE_CUSTOMER through the Heart.
  const aiInput = {
    event_type: "messenger_message",
    message: event.text,
    conversationId: conversation.id,
    facebookId: event.sender_id,
    customerId: customer?.id || null,
    customerName: customer?.name || senderName,
    taskType: "messenger_reply",
  };

  // 6. Execute through the AI pipeline (structured mode)
  const aiResult = await employee.execute(ctx, aiInput);

  // 7. Store the AI reply in the conversation
  if (aiResult.reply) {
    await _storeMessage(ctx, conversation.id, "ai", aiResult.reply, {
      source: "messenger",
      correlationId: ctx.correlationId,
    });
  }

  // 8. Send the reply back to Meta
  let replySent = false;
  let replyFailed = false;
  if (aiResult.reply) {
    try {
      await replyMessengerMessage(ctx, event.sender_id, aiResult.reply, ctx.correlationId);
      replySent = true;
    } catch (e) {
      console.error(`[META] Messenger reply failed (${ctx.correlationId}):`, e.message);
      replyFailed = true;
    }
  }

  // 9. Update conversation last_message
  if (aiResult.reply || event.text) {
    await supabase
      .from("conversations")
      .update({
        last_message: aiResult.reply || event.text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
  }

  return {
    action: aiResult.action?.proposed || null,
    replySent,
    replyFailed,
    conversationId: conversation.id,
  };
}

// ---- Internal: find or create a conversation by facebook_id ----
async function _findOrCreateConversation(ctx, event, pageMapping) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, name, facebook_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("facebook_id", event.sender_id)
    .maybeSingle();

  if (existing) return existing;

  // Create a new conversation
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: ctx.workspaceId,
      facebook_id: event.sender_id,
      name: event.sender_name || "Facebook User",
      last_message: event.text,
      status: "open",
      page_id: event.page_id,
      source: "messenger",
    })
    .select("id, name, facebook_id")
    .single();

  if (error) {
    throw new MetaError("Failed to create conversation.", "API_ERROR", { details: error.message });
  }

  return newConv;
}

// ---- Internal: find an existing customer by facebook_id (does NOT create) ----
// Customer creation is proposed by the AI through the Heart (CREATE_CUSTOMER)
// so that it is workspace-scoped, validated, and duplicate-safe.
async function _findCustomer(ctx, event) {
  if (!event.sender_id) return null;
  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, phone, facebook_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("facebook_id", event.sender_id)
    .maybeSingle();

  return existing || null;
}

// ---- Internal: store a message in the conversation ----
async function _storeMessage(ctx, conversationId, senderType, content, meta = {}) {
  try {
    await supabase.from("messages").insert({
      workspace_id: ctx.workspaceId,
      conversation_id: conversationId,
      sender_type: senderType,
      content: content || "",
      facebook_id: meta.facebookId || null,
      external_message_id: meta.externalMessageId || null,
      source: meta.source || "messenger",
    });
  } catch (e) {
    // Best-effort — message storage failure should not break the reply
    console.error("[META] Failed to store message:", e.message);
  }
}