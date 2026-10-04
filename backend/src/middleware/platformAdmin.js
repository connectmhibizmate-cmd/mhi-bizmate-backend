// MHI BizMate — Platform-admin guard.
//
// Restricts a route to platform admins (SUPER_ADMIN, ADMIN, MANAGER) — the
// global role stored on profiles.platform_role, resolved server-side by the
// auth middleware into ctx.platformRole. Workspace roles (FOUNDER, etc.) do
// NOT grant platform-admin access.
import { ForbiddenError } from "../lib/errors.js";

const PLATFORM_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGER"]);

export function requirePlatformAdmin(req, _res, next) {
  try {
    if (!req.ctx?.platformRole || !PLATFORM_ADMIN_ROLES.has(req.ctx.platformRole)) {
      throw new ForbiddenError("This area is restricted to platform administrators.");
    }
    next();
  } catch (e) {
    next(e);
  }
}