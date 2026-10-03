// MHI BizMate — AI Gateway: Gemini provider adapter.
//
// Uses Google's Generative Language REST API. Credentials are read from
// GEMINI_API_KEY (server-side env only). When not configured, every call
// fails safely with AiProviderNotConfiguredError — the Gateway handles this
// and can fall back to another provider or return a safe error.
//
// API docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
//
// SECURITY: The API key is NEVER included in logs, responses, or AI context.
// It is used only to authenticate the server-to-provider HTTP request.

import { ProviderAdapter } from "./base.js";
import { AiProviderNotConfiguredError, AiProviderTimeoutError, AiProviderUnavailableError, AiMalformedOutputError, AiRateLimitError } from "../errors.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiAdapter extends ProviderAdapter {
  constructor() {
    super({
      id: "gemini",
      name: "Google Gemini",
      models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
      envKey: "GEMINI_API_KEY",
      envKeyAlias: "GOOGLE_AI_API_KEY",
    });
  }

  async generateText(req) {
    if (!this.isConfigured()) throw new AiProviderNotConfiguredError(this.id);
    const model = req.model || this.models[0];
    const body = this._buildBody(req);
    const resp = await this._call(model, body, req.timeout);
    return {
      text: this._extractText(resp),
      usage: this._extractUsage(resp),
    };
  }

  async generateStructuredOutput(req) {
    if (!this.isConfigured()) throw new AiProviderNotConfiguredError(this.id);
    const model = req.model || this.models[0];
    const body = this._buildBody(req, req.schema);
    const resp = await this._call(model, body, req.timeout);
    return {
      data: this._extractStructured(resp),
      usage: this._extractUsage(resp),
    };
  }

  _buildBody(req, schema) {
    const contents = [{ role: "user", parts: [{ text: req.userPrompt }] }];
    const body = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 2048,
      },
    };
    if (req.systemPrompt) {
      body.systemInstruction = { parts: [{ text: req.systemPrompt }] };
    }
    if (schema) {
      body.generationConfig.responseMimeType = "application/json";
      body.generationConfig.responseSchema = schema;
    }
    return body;
  }

  async _call(model, body, timeoutMs = 30000) {
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status === 429) throw new AiRateLimitError(this.id);
      if (res.status >= 500) throw new AiProviderUnavailableError(this.id, res.status, await res.text().catch(() => ""));
      if (!res.ok) throw new AiProviderUnavailableError(this.id, res.status, await res.text().catch(() => ""));
      const data = await res.json();
      if (!data?.candidates?.length) throw new AiMalformedOutputError(this.id, "No candidates in response");
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw new AiProviderTimeoutError(this.id, timeoutMs);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  _extractText(resp) {
    const parts = resp.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p.text || "").join("").trim();
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
    const u = resp.usageMetadata || {};
    return {
      inputTokens: u.promptTokenCount || 0,
      outputTokens: u.candidatesTokenCount || 0,
    };
  }
}