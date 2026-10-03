// MHI BizMate — Meta Connector: Token encryption (AES-256-GCM).
//
// Page Access Tokens and User Access Tokens are encrypted at the application
// layer before being stored in Supabase. Even if an attacker gains read
// access to the database, the tokens cannot be decrypted without the
// META_TOKEN_ENCRYPTION_KEY (a backend-only secret).
//
// Format: "base64(iv):base64(ciphertext):base64(authTag)"
//
// SECURITY:
//   - The encryption key NEVER leaves the backend.
//   - The key is NEVER logged, sent to the frontend, or included in AI context.
//   - If the key is not configured, encrypt/decrypt throw immediately.

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const KEY_LENGTH = 32; // 256 bits

let _keyCache = null;

function _getKey() {
  if (_keyCache) return _keyCache;

  const keyB64 = process.env.META_TOKEN_ENCRYPTION_KEY?.trim();
  if (!keyB64) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY is not configured. Token encryption is unavailable.");
  }

  let keyBuffer;
  try {
    keyBuffer = Buffer.from(keyB64, "base64");
  } catch {
    throw new Error("META_TOKEN_ENCRYPTION_KEY is not valid base64.");
  }

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`META_TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64-encoded), got ${keyBuffer.length}.`);
  }

  _keyCache = keyBuffer;
  return _keyCache;
}

// Encrypt a plaintext token string. Returns the formatted ciphertext string.
export function encryptToken(plaintext) {
  if (!plaintext) return "";
  const key = _getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${authTag.toString("base64")}`;
}

// Decrypt a ciphertext token string. Returns the plaintext string.
// Throws if the key is wrong, the auth tag is invalid, or the data is corrupted.
export function decryptToken(ciphertext) {
  if (!ciphertext) return "";
  const key = _getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid token ciphertext format.");
  }
  const [ivB64, encB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// Generate a cryptographically strong random state token for OAuth.
export function generateStateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Generate a random correlation ID for webhook event tracking.
export function generateCorrelationId() {
  return `meta_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}