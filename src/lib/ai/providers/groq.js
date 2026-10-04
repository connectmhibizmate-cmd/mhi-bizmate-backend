// MHI BizMate — AI Gateway: Groq provider adapter.
//
// Uses Groq's OpenAI-compatible REST API. Credentials are read from
// GROQ_API_KEY (server-side env only). When not configured, every call
// fails safely with AiProviderNotConfiguredError — the Gateway handles this
// and can fall back to another provider or return a safe error.
//
// API docs: https://console.groq.com/docs/openai
//
// SECURITY: The API key is NEVER included in logs, responses, or AI context.
// It is used only to authenticate the server-to-provider HTTP request.
//
// Structured output uses response_format "json_object" (guarantees valid
// JSON across all Groq chat models). The pipeline validates the parsed JSON
// against the action schema, so json_object + pipeline validation is robust
// without requiring model-specific json_schema support.

import { ProviderAdapter } from "./base.js";
import { AiProviderNotConfiguredError, AiProviderTimeoutError, AiProviderUnavailableError, AiMalformedOutputError, AiRateLimitError } from "../errors.js";

const GROQ_BASE = "https://api.groq.com/openai/v1";

export class GroqAdapter extends ProviderAdapter {
  constructor() {
    super({
      id: "groq",
      name: "Groq",
      models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "allam-2-7b"],
      envKey: "GROQ_API_KEY",
    });
  }

  async generateText(req) {
    if (!this.isConfigured()) throw new AiProviderNotConfiguredError(this.id);
    const body = this._buildBody(req, false);
    const resp = await this._call("/chat/completions", body, req.timeout);
    return {
      text: this._extractText(resp),
      usage: this._extractUsage(resp),
    };
  }

  async generateStructuredOutput(req) {
    if (!this.isConfigured()) throw new AiProviderNotConfiguredError(this.id);
    const body = this._buildBody(req, true);
    const resp = await this._call("/chat/completions", body, req.timeout);
    return {
      data: this._extractStructured(resp),
      usage: this._extractUsage(resp),
    };
  }

  _buildBody(req, forceJson) {
    const messages = [];
    if (req.systemPrompt) messages.push({ role: "system", content: req.systemPrompt });
    messages.push({ role: "user", content: req.userPrompt });
    const body = {
      model: req.model || this.models[0],
      messages,
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 2048,
    };
    if (forceJson) {
      body.response_format = { type: "json_object" };
    }
    return body;
  }

  async _call(path, body, timeoutMs = 30000) {
    const url = `${GROQ_BASE}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status === 429) throw new AiRateLimitError(this.id);
      if (res.status >= 500) throw new AiProviderUnavailableError(this.id, res.status, await res.text().catch(() => ""));
      if (!res.ok) throw new AiProviderUnavailableError(this.id, res.status, await res.text().catch(() => ""));
      const data = await res.json();
      if (!data?.choices?.length) throw new AiMalformedOutputError(this.id, "No choices in response");
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw new AiProviderTimeoutError(this.id, timeoutMs);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  _extractText(resp) {
    return resp.choices?.[0]?.message?.content?.trim() || "";
  }

  _extractStructured(resp) {
    const text = this._extractText(resp);
    try {
      return JSON.parse(text);
    } catch {
      throw new AiMalformedOutputError(this.id, "Structured output is not valid JSON");
    }
  }

  _extractUsage(resp) {
    const u = resp.usage || {};
    return {
      inputTokens: u.prompt_tokens || 0,
      outputTokens: u.completion_tokens || 0,
    };
  }
}