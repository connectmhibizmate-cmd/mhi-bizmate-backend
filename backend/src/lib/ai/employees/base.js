// MHI BizMate — AI Gateway: AI Employee base contract.
//
// An AI Employee is a logical role with a permanent identity, a set of
// allowed actions, a context builder, and a system prompt. The provider
// and model are REPLACEABLE — the employee's role and permissions are NOT.
//
// Contract:
//   id            — stable identifier (e.g. "messenger_ai")
//   name          — display name (e.g. "Messenger AI")
//   role          — human-readable role description
//   audience      — who interacts with this employee ("customer" | "owner" | "admin")
//   allowedActions — Heart actions this employee may propose (subset of AI_ALLOWED_ACTIONS)
//   contextBuilder — async (ctx, input) → structured context object
//   systemPrompt  — permanent system instructions (role, rules, boundaries)
//   taskTypes     — named tasks this employee can perform
//   outputMode   — "text" (read-only, conversational) or "structured" (may propose actions)
//   defaultProvider — preferred provider id (replaceable)
//   defaultModel  — preferred model id (replaceable)
//
// The execute() method runs the common pipeline:
//   Context → Gateway → Schema Validation → Permission → Heart → Result
//
// Employees do NOT call providers directly. They do NOT access Supabase
// credentials. They do NOT execute SQL. All writes go through the Heart.

import { executeTextTask, executeStructuredTask } from "../pipeline.js";

export class AiEmployee {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.audience = config.audience; // "customer" | "owner" | "admin"
    this.allowedActions = config.allowedActions || [];
    this.contextBuilder = config.contextBuilder || null;
    this.systemPrompt = config.systemPrompt || "";
    this.taskTypes = config.taskTypes || [];
    this.outputMode = config.outputMode || "text"; // "text" | "structured"
    this.defaultModel = config.defaultModel || null;
    this.defaultProvider = config.defaultProvider || null;
  }

  // Check if this employee is allowed to propose a given Heart action.
  canPropose(action) {
    return this.allowedActions.includes(action);
  }

  // Build the context for this employee. Returns a structured, minimal,
  // workspace-scoped context object. Never the full database.
  async buildContext(ctx, input) {
    if (!this.contextBuilder) return {};
    return this.contextBuilder(ctx, input);
  }

  // Execute a task through the common pipeline.
  //   Text mode (read-only employees): returns { reply, action: null, ... }
  //   Structured mode (customer-facing): returns { reply, action: {...}|null, ... }
  // If the Heart rejects a proposed action, the reply is replaced with a
  // safe fallback — the AI never claims an action succeeded when it did not.
  async execute(ctx, input) {
    if (this.outputMode === "structured") {
      return executeStructuredTask(this, ctx, input);
    }
    return executeTextTask(this, ctx, input);
  }

  // Serialize for the admin panel registry (no secrets, no prompts leaked
  // to non-admin callers — the route layer enforces audience access).
  toSummary() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      audience: this.audience,
      outputMode: this.outputMode,
      status: "configured",
      provider: this.defaultProvider || "",
      model: this.defaultModel || "",
      allowedActions: this.allowedActions,
      taskTypes: this.taskTypes,
    };
  }
}