// MHI BizMate — Auth middleware.
// Validates the Supabase access token server-side via supabase.auth.getUser(),
// then resolves the user's workspace + role independently (never trusts the
// client). Attaches the resolved context to req.ctx.
import { supabase } from "../lib/supabaseClient.js";
import { resolveContext } from "../lib/workspace.js";
import { AuthError } from "../lib/errors.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new AuthError("Missing or malformed Authorization header.");

    const token = match[1];

    // Validate the token against Supabase Auth
    const { data: userData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !userData?.user) {
      throw new AuthError("Invalid or expired session.");
    }

    // Resolve workspace + role server-side
    const ctx = await resolveContext(userData.user.id);
    ctx.token = token;
    req.ctx = ctx;
    next();
  } catch (e) {
    if (e instanceof AuthError) {
      return res.status(401).json({ error: e.message, code: e.code });
    }
    if (e.status) {
      return res.status(e.status).json({ error: e.message, code: e.code || null });
    }
    console.error("[AUTH] Unexpected error:", e);
    return res.status(500).json({ error: "Authentication failed.", code: "AUTH_ERROR" });
  }
}