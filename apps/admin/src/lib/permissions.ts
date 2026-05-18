import { User, connectDB, type UserRole } from "@store/db";
import { SESSION_CACHE_TTL_MS, logger } from "@store/shared";

import { auth } from "@/lib/auth";
import { ROLE_PERMISSIONS, type PermissionKey } from "@/lib/permissionsCatalog";

/**
 * Authenticated actor enriched with current DB state. Returned by
 * `getVerifiedSession()`. Routes should always pass this to permission checks
 * — never read claims off the JWT directly.
 */
export interface VerifiedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin: boolean;
  isActive: boolean;
}

interface CacheEntry {
  user: VerifiedUser;
  cachedAt: number;
}

/**
 * Process-local enrichment cache. JWT verification is fast; the DB round-trip
 * for `findById` is what we save. TTL is intentionally short so role/active
 * changes propagate within a few requests (security.md § Session Enrichment).
 *
 * Note: in a multi-instance deployment each pod has its own cache — that's
 * acceptable because `SESSION_CACHE_TTL_MS` is short. For instant
 * invalidation, swap this for Redis with the same key shape.
 */
const sessionCache = new Map<string, CacheEntry>();

/** Drop a single user's cached session — call after role/active changes. */
export function invalidateSessionCache(userId: string): void {
  sessionCache.delete(userId);
}

/**
 * Verify the caller's session and re-load the user from the database. The
 * JWT proves identity; the DB lookup proves current state (active flag, role,
 * super-admin status) so a session that pre-dates a role change can't keep
 * acting on stale claims.
 *
 * Result is cached in-process for {@link SESSION_CACHE_TTL_MS} so that a single
 * page load (which can fan out to multiple data fetches) only pays the DB
 * cost once.
 */
export async function getVerifiedSession(): Promise<VerifiedUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;
  const cached = sessionCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return cached.user;
  }

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user || user.isActive === false) {
    sessionCache.delete(userId);
    logger.info({ userId }, "Session rejected: user not found or inactive");
    return null;
  }

  const verified: VerifiedUser = {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin === true,
    isActive: user.isActive,
  };
  sessionCache.set(userId, { user: verified, cachedAt: Date.now() });
  return verified;
}

/** Whether `actor` holds `permission`. Super-admins implicitly hold every key. */
export function hasPermission(actor: VerifiedUser, permission: PermissionKey): boolean {
  if (actor.isSuperAdmin) {
    return true;
  }
  const allowed = ROLE_PERMISSIONS[actor.role] ?? [];
  return allowed.includes(permission);
}

