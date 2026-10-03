// MHI BizMate — Meta Connector: Event normalization.
//
// Transforms raw Meta webhook payloads into a normalized internal event format
// that is independent of Meta's raw structure. The AI layer and Heart receive
// only this normalized format — they never see the raw Meta payload.
//
// Normalized event:
//   {
//     provider: "meta",
//     event_type: "facebook_comment" | "messenger_message",
//     page_id: "...",
//     external_event_id: "...",   // Meta's message_id or comment_id
//     sender_id: "...",            // Facebook user PSID or commenter ID
//     sender_name: "...",           // Best-effort name
//     recipient_id: "...",         // Page ID receiving the event
//     message_id: "...",            // Messenger message ID (if messenger)
//     comment_id: "...",            // Facebook comment ID (if comment)
//     post_id: "...",               // Post the comment is on (if comment)
//     timestamp: number,            // Meta timestamp (ms)
//     text: "...",                   // The message/comment text
//     source: "facebook_comment" | "messenger",
//     raw_reference: "safe internal reference"  // never the full payload
//   }
//
// Only relevant normalized information is passed to the AI layer. The raw
// payload is NOT passed to AI context, prompts, or logs.

// Normalize a raw Meta webhook payload into individual events.
// Returns an array of normalized events (a single webhook may contain
// multiple entries/changes).
export function normalizeWebhookPayload(payload) {
  if (!payload || !payload.object || !Array.isArray(payload.entry)) {
    return [];
  }

  const events = [];

  for (const entry of payload.entry) {
    const pageId = entry.id;

    // ---- Messenger messages ----
    if (Array.isArray(entry.messaging)) {
      for (const msg of entry.messaging) {
        const normalized = _normalizeMessengerMessage(msg, pageId);
        if (normalized) events.push(normalized);
      }
    }

    // ---- Facebook Page feed changes (comments) ----
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === "feed" && change.value?.item === "comment" && change.value?.verb === "add") {
          const normalized = _normalizeComment(change.value, pageId);
          if (normalized) events.push(normalized);
        }
      }
    }
  }

  return events;
}

function _normalizeMessengerMessage(msg, pageId) {
  if (!msg?.message?.text) return null; // Ignore non-text messages (attachments, reactions, etc.)

  return {
    provider: "meta",
    event_type: "messenger_message",
    page_id: pageId,
    external_event_id: msg.message.mid || `m_${pageId}_${msg.sender?.id}_${msg.timestamp}`,
    sender_id: msg.sender?.id || "",
    sender_name: msg.sender?.name || "",
    recipient_id: msg.recipient?.id || pageId,
    message_id: msg.message.mid || "",
    comment_id: "",
    post_id: "",
    timestamp: msg.timestamp || Date.now(),
    text: msg.message.text || "",
    source: "messenger",
    raw_reference: `messenger:${msg.message.mid || "unknown"}`,
  };
}

function _normalizeComment(value, pageId) {
  if (!value?.comment_id || !value?.message) return null;

  return {
    provider: "meta",
    event_type: "facebook_comment",
    page_id: pageId,
    external_event_id: value.comment_id,
    sender_id: value.from?.id || "",
    sender_name: value.from?.name || "",
    recipient_id: pageId,
    message_id: "",
    comment_id: value.comment_id,
    post_id: value.post_id || "",
    timestamp: value.created_time ? new Date(value.created_time).getTime() : Date.now(),
    text: value.message || "",
    source: "facebook_comment",
    raw_reference: `comment:${value.comment_id}`,
  };
}

// Build a minimal, safe context reference for audit logging.
// This does NOT include the full raw payload — just enough to trace the event.
export function buildEventReference(event) {
  return {
    event_type: event.event_type,
    external_event_id: event.external_event_id,
    page_id: event.page_id,
    sender_id: event.sender_id,
    source: event.source,
  };
}