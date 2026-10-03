// MHI BizMate — Meta Connector: Barrel export.
//
// The Meta Connector is an independent layer. It handles Meta (Facebook Page
// + Messenger) integration. It does NOT depend on the AI Gateway — it
// consumes the AI Employee interface and the Heart of BizMate, but changing
// the Meta implementation must NOT require rebuilding the AI system.
//
// Public interface:
//   OAuth:           generateOAuthUrl, exchangeCodeAndConnect
//   Connection:      connectPage, disconnectPage, changePage, reconnectPage,
//                    getConnectionStatus, getConnectionHealth, getActivePage,
//                    getWorkspaceForPage
//   Webhook:         verifyChallenge, verifySignature, parseWebhookBody,
//                    processWebhookPayload
//   Events:          normalizeWebhookPayload, buildEventReference
//   Replies:         replyToComment, sendPrivateReplyToComment, replyMessengerMessage
//   Crypto:          encryptToken, decryptToken, generateStateToken

export { generateOAuthUrl, consumeState, exchangeCodeAndConnect } from "./oauth.js";
export {
  connectPage,
  disconnectPage,
  changePage,
  reconnectPage,
  getConnectionStatus,
  getConnectionHealth,
  getActivePage,
  getWorkspaceForPage,
} from "./connection.js";
export { verifyChallenge, verifySignature, parseWebhookBody } from "./webhook.js";
export { processWebhookPayload } from "./processor.js";
export { normalizeWebhookPayload, buildEventReference } from "./events.js";
export { replyToComment, sendPrivateReplyToComment, replyMessengerMessage } from "./replies.js";
export { encryptToken, decryptToken, generateStateToken } from "./crypto.js";
export * as MetaErrors from "./errors.js";