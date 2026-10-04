// MHI BizMate — AI Employee execution pipeline.
//
// This is the COMMON pipeline every AI Employee uses:
//   Incoming Task → Employee → Context Builder → AI Gateway →
//   Provider Adapter → Structured/Safe Output → Schema Validation →
//   Employee Permission → Workspace → Heart of BizMate →
//   Business Rules → Execution → Audit/Usage Logging
//
// Two modes:
//   1. TEXT mode (executeTextTask): for read-only employees (BI AI, Admin AI).
//      Returns { reply, action: null }.
//   2. STRUCTURED mode (executeStructuredTask): for customer-facing employees
//      (Messenger AI, Facebook Comment AI). Returns { reply, action: {...} }.
//      The AI may return a conversational reply OR a reply + structured action.
//      If an action is proposed, it is validated and sent to the Heart.
//
// SECURITY:
//   - AI Employee code NEVER calls Gemini/Grok directly — only through the Gateway.
//   - AI Employee code NEVER accesses Supabase service-role credentials.
//   - AI Employee code NEVER executes SQL — all writes go through the Heart.
//   - workspace_id comes from ctx (authenticated workspace context), NEVER
//     from customer input.
//   - If the Heart rejects an action, the AI's original reply is replaced with
//     a safe fallback — the AI must NEVER claim an action succeeded when it
//     did not.
//   - Customer input is treated as untrusted — the system prompt enforces
//     prompt-injection defense, and the pipeline validates all structured
//     output against strict schemas before it reaches the Heart.

import { generateText, generateStructuredOutput } from "./gateway.js";
import { validateActionProposal } from "./actions/index.js";
import { AiError, AiForbiddenActionError } from "./errors.js";
import { execute as heartExecute } from "../heart/index.js";
import { CONVERSATION_RESPONSE_SCHEMA } from "./actions/schemas.js";
import { getConfiguredProviders } from "./providers/index.js";

// Resolve a fallback provider: the first configured provider that is not the
// primary. This wires the Gateway's existing fallback path so a transient
// failure on the primary (e.g. Groq rate-limit) transparently retries on the
// next configured provider (e.g. Gemini) instead of surfacing a 503.
function _resolveFallback(primaryProviderId) {
  const configured = getConfiguredProviders();
  const fallback = configured.find((p) => p.id !== primaryProviderId);
  return fallback ? fallback.id : null;
}

// ---- Safe fallback replies (Bangla) for when the Heart rejects an action ----
// The AI must never tell a customer an action succeeded when it failed.
const SAFE_FALLBACK_REPLIES = {
  VALIDATION: "দুঃখিত, আমার কিছু তথ্য প্রয়োজন যা এখনো সম্পূর্ণ নয়। আপনি কি আবার একটু বিস্তারিত বলবেন?",
  PERMISSION: "আমি এই মুহূর্তে এটি সম্পূর্ণ করতে পারছি না। আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।",
  NOT_FOUND: "দুঃখিত, আমি আপনার অনুরোধ প্রক্রিয়া করতে পারিনি। অনুগ্রহ করে আবার চেষ্টা করুন।",
  CONFLICT: "এই তথ্য ইতিমধ্যে বিদ্যমান। আপনি কি নিশ্চিত যে এটি আবার করতে চান?",
  DEFAULT: "আমি আপনার অনুরোধ প্রক্রিয়া করতে পারিনি। একটু পরে আবার চেষ্টা করুন অথবা আমাদের সাথে কথা বলুন।",
};

function _safeReplyForError(error) {
  if (!error) return SAFE_FALLBACK_REPLIES.DEFAULT;
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("validation") || msg.includes("required") || msg.includes("invalid"))
    return SAFE_FALLBACK_REPLIES.VALIDATION;
  if (msg.includes("permission") || msg.includes("forbidden") || msg.includes("role"))
    return SAFE_FALLBACK_REPLIES.PERMISSION;
  if (msg.includes("not found") || msg.includes("notfound") || msg.includes("no such"))
    return SAFE_FALLBACK_REPLIES.NOT_FOUND;
  if (msg.includes("already exists") || msg.includes("conflict") || msg.includes("duplicate"))
    return SAFE_FALLBACK_REPLIES.CONFLICT;
  return SAFE_FALLBACK_REPLIES.DEFAULT;
}

// ---- Success note for owner-facing structured actions ----
// Appends a concise, Bangla success line derived from the Heart's result so
// the owner sees the real outcome (order number, total) without a frontend
// change. Only used for owner-audience employees on successful actions.
function _appendSuccessNote(reply, result) {
  if (!result || typeof result !== "object") return reply;
  const notes = [];
  // Order creation result (heart_create_order RPC returns the order row)
  if (result.order_number) {
    const total = Number(result.total || 0);
    notes.push(`অর্ডার তৈরি হয়েছে — অর্ডার নম্বর: ${result.order_number}${total ? `, টোটাল: ৳${total}` : ""}।`);
  } else if (result.name) {
    notes.push(`প্রোডাক্ট যোগ হয়েছে — ${result.name}।`);
  } else {
    notes.push("সম্পন্ন হয়েছে।");
  }
  const base = (reply || "").trim();
  return base ? `${base}\n\n${notes.join(" ")}` : notes.join(" ");
}

// ---- Text mode: for read-only employees (BI AI, Admin Panel AI) ----
// Returns: { reply, action: null, provider, model, correlationId }
export async function executeTextTask(employee, ctx, input) {
  const context = await employee.buildContext(ctx, input);
  const userPrompt = _buildUserPrompt(input, context, employee);

  const result = await generateText(ctx, {
    employee: employee.id,
    taskType: input.taskType || employee.taskTypes[0] || "conversation",
    systemPrompt: employee.systemPrompt,
    userPrompt,
    model: employee.defaultModel,
    provider: employee.defaultProvider,
    fallbackProvider: _resolveFallback(employee.defaultProvider),
    temperature: input.temperature ?? 0.4,
    maxTokens: input.maxTokens ?? 2048,
  });

  return {
    reply: result.text || "",
    action: null,
    provider: result.provider,
    model: result.model,
    correlationId: result.correlationId,
  };
}

// ---- Structured mode: for customer-facing employees (Messenger, Facebook Comment) ----
// Returns: { reply, action: { proposed, result, error } | null, provider, model, correlationId }
export async function executeStructuredTask(employee, ctx, input) {
  const context = await employee.buildContext(ctx, input);
  const userPrompt = _buildUserPrompt(input, context, employee);

  const result = await generateStructuredOutput(ctx, {
    employee: employee.id,
    taskType: input.taskType || employee.taskTypes[0] || "customer_interaction",
    systemPrompt: employee.systemPrompt,
    userPrompt,
    schema: CONVERSATION_RESPONSE_SCHEMA,
    model: employee.defaultModel,
    provider: employee.defaultProvider,
    fallbackProvider: _resolveFallback(employee.defaultProvider),
    temperature: input.temperature ?? 0.4,
    maxTokens: input.maxTokens ?? 1024,
  });

  const output = result.data || {};
  const aiReply = output.reply || "";
  const proposedAction = output.action || null;
  let actionOutcome = null;

  if (proposedAction) {
    actionOutcome = await _processAction(employee, ctx, proposedAction, output.data);
    // If the Heart rejected the action, replace the AI's reply with a safe fallback.
    // The AI must never claim success when the Heart rejected the proposal.
    if (actionOutcome.error) {
      return {
        reply: _safeReplyForError(actionOutcome.error),
        action: actionOutcome,
        provider: result.provider,
        model: result.model,
        correlationId: result.correlationId,
      };
    }
  }

  // For owner-facing employees, append a concise success note derived from
  // the Heart's result so the owner sees the real outcome (e.g. created order
  // number) without any frontend change. Customer-facing employees are
  // untouched — their AI reply goes to the customer as-is.
  let finalReply = aiReply;
  if (actionOutcome && !actionOutcome.error && employee.audience === "owner") {
    finalReply = _appendSuccessNote(aiReply, actionOutcome.result);
  }

  return {
    reply: finalReply,
    action: actionOutcome,
    provider: result.provider,
    model: result.model,
    correlationId: result.correlationId,
  };
}

// ---- Internal: process a proposed action through the Heart ----
async function _processAction(employee, ctx, action, data) {
  // 1. Schema validation (catches malformed AI output early)
  let validated;
  try {
    validated = validateActionProposal({ action, data });
  } catch (e) {
    return {
      proposed: action,
      result: null,
      error: { message: e.message, category: e.category || "SCHEMA" },
    };
  }

  // 2. Employee permission check (employee can only propose its allowed actions)
  if (!employee.canPropose(validated.action)) {
    const err = new AiForbiddenActionError(employee.id, validated.action);
    return {
      proposed: validated.action,
      result: null,
      error: { message: err.message, category: "PERMISSION" },
    };
  }

  // 3. Propose to the Heart — the Heart validates workspace, permissions,
  //    business rules, required fields, duplicates, and executes atomically.
  try {
    const heartResult = await heartExecute(validated.action, ctx, validated.data);
    return {
      proposed: validated.action,
      result: heartResult,
      error: null,
    };
  } catch (e) {
    return {
      proposed: validated.action,
      result: null,
      error: { message: e.message, category: e.code || e.category || "BACKEND" },
    };
  }
}

// ---- Internal: build the user prompt from input + context ----
function _buildUserPrompt(input, context, employee) {
  const parts = [];
  const userLabel = employee.audience === "owner" ? "Owner" : "Customer";

  // Prior conversation turns (enables multi-turn flows like order creation,
  // where the AI gathers info and waits for explicit confirmation).
  if (input.history && Array.isArray(input.history) && input.history.length > 0) {
    parts.push(`--- Conversation so far ---`);
    for (const turn of input.history) {
      const who = turn.role === "user" ? userLabel : "Assistant";
      parts.push(`${who}: ${turn.content}`);
    }
  }

  // The task/message from the user
  if (input.message) {
    parts.push(`${userLabel} message: ${input.message}`);
  } else if (input.question) {
    parts.push(`Question: ${input.question}`);
  } else if (input.task) {
    parts.push(`Task: ${input.task}`);
  } else if (input.comment_text) {
    parts.push(`Facebook comment: ${input.comment_text}`);
  }

  // Structured context (workspace-scoped, minimal)
  if (context && Object.keys(context).length > 0) {
    parts.push(`\n--- Context (workspace-scoped, from database) ---`);
    parts.push(JSON.stringify(context, null, 2));
  }

  // Instructions for output format
  if (employee.outputMode === "structured") {
    const audienceLabel = employee.audience === "owner" ? "the owner" : "the customer";
    parts.push(`\n--- Output format ---`);
    parts.push(`For a normal response to ${audienceLabel}, return { "reply": "<your response>", "action": null }. Use actual JSON null, never the strings "null" or "NONE"; omit "data".`);
    parts.push(`The only permitted actions for this employee are: ${employee.allowedActions.join(", ") || "none"}.`);
    parts.push(`Only when an authorized action is ready, return { "reply": "<your response>", "action": "<permitted HEART_ACTION>", "data": {<validated action payload>} }. Respect this employee's information-gathering and confirmation requirements.`);
  }

  return parts.join("\n");
}