// MHI BizMate — Meta Connector: Event processor.
//
// This is the bridge between the Meta Connector and the AI Employees. It:
//   1. Takes a normalized Meta event.
//   2. Resolves the workspace from the trusted page→workspace mapping.
//   3. Performs webhook event idempotency (deduplication).
//   4. For Messenger: finds/creates conversation + customer, stores the message.
//   5. Routes to the appropriate AI Employee (Facebook Comment AI or Messenger AI).
//   6. The AI generates a reply + optional structured action.
//   7. Structured actions go through the Heart of BizMate (validation + execution).
//   8. Sends the reply back to Meta via the reply service.
//   9. Stores the outgoing message in the conversations table.
//
// SECURITY:
//   - workspace_id is ALWAYS resolved from the trusted meta_pages mapping,
//     NEVER from the webhook payload.
//   - The AI never sees the raw Meta payload — only the normalized event.
//   - The AI never chooses the page token or recipient — the reply service
//     validates everything.
//   - The Heart validates all business actions — the processor never writes
//     to the database directly (except conversation/message persistence,
//     which is connector-level, not business-level).
//   - PURCHASE INTENT ≠ CONFIRMED ORDER. The Messenger AI can only create
//     PENDING orders. No confirmed orders are ever created from webhooks.

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
      // Log the failure but continue processing other events
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
  // 1. Idempotency: check if this event was already processed
  const { data: existing } = await supabase
    .from("meta_webhook_events")
    .select("id, status")
    .eq("external_event_id", event.external_event_id)
    .eq("source", event.source)
    .maybeSingle();

  if (existing) {
    return {
      event_id: event.external_event_id,
      event_type: event.event_type,
      status: existing.status === "processed" ? "deduplicated" : existing.status,
      correlationId,
    };
  }

  // 2. Resolve workspace from the trusted page→workspace mapping
  const pageMapping = await getWorkspaceForPage(event.page_id);
  if (!pageMapping) {
    await _recordEvent(event, null, "ignored", correlationId);
    return { event_id: event.external_event_id, event_type: event.event_type, status: "unknown_page", correlationId };
  }
  if (!pageMapping.isActive) {
    await _recordEvent(event, pageMapping.workspaceId, "ignored", correlationId);
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
  if (event.event_type === "facebook_comment") {
    result = await _processCommentEvent(ctx, event, pageMapping);
  } else if (event.event_type === "messenger_message") {
    result = await _processMessengerEvent(ctx, event, pageMapping);
  } else {
    await _recordEvent(event, workspaceId, "ignored", correlationId);
    return { event_id: event.external_event_id, event_type: event.event_type, status: "ignored", correlationId };
  }

  // 5. Record the event as processed
  await _recordEvent(event, workspaceId, "processed", correlationId, {
    action: result?.action || null,
    reply_sent: result?.replySent || false,
  });

  return {
    event_id: event.external_event_id,
    event_type: event.event_type,
    status: "processed",
    action: result?.action || null,
    reply_sent: result?.replySent || false,
    correlationId,
  };
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
      }
    }
  }

  return {
    action: aiResult.action?.proposed || null,
    actionResult: aiResult.action?.result || null,
    actionError: aiResult.action?.error || null,
    replySent,
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

  // 3. Find or create the customer (by facebook_id)
  const customer = await _findOrCreateCustomer(ctx, event);

  // 4. Get the sender's profile (best-effort)
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

  // 5. Build the AI input
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
  if (aiResult.reply) {
    try {
      await replyMessengerMessage(ctx, event.sender_id, aiResult.reply, ctx.correlationId);
      replySent = true;
    } catch (e) {
      console.error(`[META] Messenger reply failed (${ctx.correlationId}):`, e.message);
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
    actionResult: aiResult.action?.result || null,
    actionError: aiResult.action?.error || null,
    replySent,
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

// ---- Internal: find or create a customer by facebook_id ----
async function _findOrCreateCustomer(ctx, event) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, phone, facebook_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("facebook_id", event.sender_id)
    .maybeSingle();

  if (existing) return existing;

  // Don't create a customer yet — the AI will propose CREATE_LEAD or
  // UPDATE_CUSTOMER through the Heart when enough info is collected.
  // We return null and let the AI decide.
  return null;
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

// ---- Internal: record a webhook event for idempotency ----
async function _recordEvent(event, workspaceId, status, correlationId, metadata = {}) {
  try {
    await supabase.from("meta_webhook_events").insert({
      workspace_id: workspaceId,
      external_event_id: event.external_event_id,
      event_type: event.event_type,
      source: event.source,
      status,
      correlation_id: correlationId,
      metadata: {
        ...buildEventReference(event),
        ...metadata,
      },
    });
  } catch (e) {
    // Best-effort — if this fails (e.g., unique constraint from a race),
    // the event was already recorded by a concurrent request.
    if (e.code !== "23505") {
      console.error("[META] Failed to record webhook event:", e.message);
    }
  }
}