import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { findUserById } from "@/repositories/users.repository";
import type { Role } from "@/lib/types";

/** The tenant-scoped identity every service call authorizes against — never trust a schoolId/campusId supplied by the client instead of this. */
export interface AuthSession {
  userId: string;
  role: Role;
  schoolId: string | null;
  campusId: string | null;
  teacherId: string | null;
  /** The school role whose permissions apply (null = the school's default role for `role`) — see lib/authorization.ts. */
  schoolRoleId: string | null;
  /** Signed in with an admin-issued temporary password — must choose their own before using the app (see components/layout/auth-guard.tsx). */
  mustChangePassword: boolean;
  name: string;
  email: string;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthenticatedError";
  }
}

export class PermissionError extends Error {
  constructor(moduleKey: string) {
    super(`Your role doesn't have access to "${moduleKey}".`);
    this.name = "PermissionError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found.`);
    this.name = "NotFoundError";
  }
}

/**
 * The signed-in user for this request — from the session cookie (web) or an
 * `Authorization: Bearer <token>` header (mobile app), checked against the
 * database's session table, so a revoked or expired session is refused.
 * Throws if not signed in. Every service should call this first, and never
 * accept a schoolId/campusId from the caller instead.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await loadSession();
  if (!session?.user) throw new UnauthenticatedError();
  // The session only proves who this is. Role, school, campus and linked
  // teacher are re-read from the database (once per request), so a role
  // change or a removed account takes effect immediately.
  const user = await loadUser(session.user.id);
  if (!user) throw new UnauthenticatedError();
  return {
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId,
    campusId: user.campusId,
    teacherId: user.teacherId,
    schoolRoleId: user.schoolRoleId,
    mustChangePassword: user.mustChangePassword,
    name: user.name,
    email: user.email,
  };
}

/** Per-request caches — requireSession runs many times while rendering one page. */
const loadSession = cache(async () => auth.api.getSession({ headers: await headers() }));
const loadUser = cache((userId: string) => findUserById(userId));

/** The current session's token (to keep this device signed in when revoking the others). */
export async function currentSessionToken(): Promise<string | null> {
  return (await loadSession())?.session.token ?? null;
}

/** For platform_admin-only actions where no school context should exist. Throws NotFoundError-shaped errors are handled by callers; this just asserts the shape callers actually need. */
export function requireSchoolId(session: AuthSession): string {
  if (!session.schoolId) throw new UnauthenticatedError();
  return session.schoolId;
}
