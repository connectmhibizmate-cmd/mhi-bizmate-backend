// MHI BizMate — AI Gateway: Grok (xAI) provider adapter.
//
// Uses xAI's OpenAI-compatible REST API. Credentials are read from
// XAI_API_KEY (server-side env only). When not configured, every call
// fails safely with AiProviderNotConfiguredError.
//
// API docs: https://docs.x.ai/docs/api-reference
//
// SECURITY: The API key is NEVER included in logs, responses, or AI context.

import { ProviderAdapter } from "./base.js";
import { AiProviderNotConfiguredError, AiProviderTimeoutError, AiProviderUnavailableError, AiMalformedOutputError, AiRateLimitError } from "../errors.js";

const XAI_BASE = "https://api.x.ai/v1";

export class GrokAdapter extends ProviderAdapter {
  constructor() {
    super({
      id: "grok",
      name: "xAI Grok",
      models: ["grok-3", "grok-3-mini", "grok-4"],
      envKey: "XAI_API_KEY",
      envKeyAlias: "GROK_API_KEY",
    });
  }

  async generateText(req) {
    if (!this.isConfigured()) throw new AiProviderNotConfiguredError(this.id);
    const body = this._buildBody(req);
    const resp = await this._call("/chat/completions", body, req.timeout);
    return {
      text: this._extractText(resp),
      usage: this._extractUsage(resp),
    };
  }

  async generateStructuredOutput(req) {
    if (!this.isConfigured()) throw new AiProviderNotConfiguredError(this.id);
    const body = this._buildBody(req, req.schema);
    const resp = await this._call("/chat/completions", body, req.timeout);
    return {
      data: this._extractStructured(resp),
      usage: this._extractUsage(resp),
    };
  }

  _buildBody(req, schema) {
    const messages = [];
    if (req.systemPrompt) messages.push({ role: "system", content: req.systemPrompt });
    messages.push({ role: "user", content: req.userPrompt });
    const body = {
      model: req.model || this.models[0],
      messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2048,
    };
    if (schema) {
      body.response_format = { type: "json_schema", json_schema: { name: "output", schema, strict: true } };
    }
    return body;
  }

  async _call(path, body, timeoutMs = 30000) {
    const url = `${XAI_BASE}${path}`;
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