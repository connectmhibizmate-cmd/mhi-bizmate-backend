// MHI BizMate — AI Gateway: Provider adapter contract.
//
// Each AI provider (Gemini, Grok, future) implements this interface.
// AI Employees NEVER call provider SDKs directly — they go through the
// AI Gateway, which selects a provider adapter.
//
// A provider adapter:
//   1. Reads credentials from server-side env vars ONLY (never client).
//   2. Reports isConfigured() — false when credentials are absent.
//   3. Throws AiProviderNotConfiguredError when called unconfigured.
//   4. Normalizes all responses to the GatewayResponse shape.
//   5. Never logs or exposes credentials in responses/errors.
//
// GatewayResponse shape (normalized):
//   { text: string, usage: { inputTokens: int, outputTokens: int } }
//
// StructuredOutputResponse shape:
//   { data: object, usage: { inputTokens: int, outputTokens: int } }

import { AiProviderNotConfiguredError } from "../errors.js";

export class ProviderAdapter {
  constructor({ id, name, models, envKey, envKeyAlias }) {
    this.id = id;
    this.name = name;
    this.models = models; // string[] of supported model IDs
    this.envKey = envKey;
    this.envKeyAlias = envKeyAlias; // optional secondary env var name
  }

  get apiKey() {
    return (process.env[this.envKey]?.trim() || (this.envKeyAlias ? process.env[this.envKeyAlias]?.trim() || "" : ""));
  }

  isConfigured() {
    return !!this.apiKey;
  }

  // generateText(request) → { text, usage }
  // request: { model, systemPrompt, userPrompt, temperature, maxTokens, timeout }
  async generateText(_request) {
    throw new AiProviderNotConfiguredError(this.id);
  }

  // generateStructuredOutput(request) → { data, usage }
  // request: { model, systemPrompt, userPrompt, schema, temperature, maxTokens, timeout }
  async generateStructuredOutput(_request) {
    throw new AiProviderNotConfiguredError(this.id);
  }
}