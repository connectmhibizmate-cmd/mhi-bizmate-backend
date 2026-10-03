// MHI BizMate — AI Gateway: Provider registry.
//
// Central registry of all available provider adapters. The Gateway uses this
// to resolve the active/fallback provider by ID. New providers are added here
// only — AI Employees and the Gateway never import provider adapters directly.
//
// A provider appears in the registry regardless of whether it is configured.
// The Gateway checks isConfigured() at call time and fails safely if the
// selected provider has no credentials.

import { GeminiAdapter } from "./gemini.js";
import { GrokAdapter } from "./grok.js";

const _providers = [new GeminiAdapter(), new GrokAdapter()];
const _byId = new Map(_providers.map((p) => [p.id, p]));

export function listProviders() {
  return _providers;
}

export function getProvider(id) {
  return _byId.get(id) || null;
}

export function getConfiguredProviders() {
  return _providers.filter((p) => p.isConfigured());
}

// Resolve the first configured provider from a preference list.
// Returns { provider, source } or null if none are configured.
export function resolveProvider(preferenceIds = []) {
  for (const id of preferenceIds) {
    const p = _byId.get(id);
    if (p && p.isConfigured()) return { provider: p, source: id };
  }
  // Fall back to any configured provider
  for (const p of _providers) {
    if (p.isConfigured()) return { provider: p, source: p.id };
  }
  return null;
}