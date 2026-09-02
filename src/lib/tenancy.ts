import "server-only";
import { auth } from "@/auth";
import type { Role } from "@/lib/types";

/** The tenant-scoped identity every service call authorizes against — never trust a schoolId/campusId supplied by the client instead of this. */
export interface AuthSession {
  userId: string;
  role: Role;
  schoolId: string | null;
  campusId: string | null;
  teacherId: string | null;
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

/** Reads the real Auth.js session server-side. Throws if not signed in — every service should call this first, never accept schoolId/campusId as a plain function argument from the caller. */
export async function requireSession(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user) throw new UnauthenticatedError();
  return {
    userId: session.user.id,
    role: session.user.role,
    schoolId: session.user.schoolId,
    campusId: session.user.campusId,
    teacherId: session.user.teacherId,
    name: session.user.name,
    email: session.user.email,
  };
}

/** For platform_admin-only actions where no school context should exist. Throws NotFoundError-shaped errors are handled by callers; this just asserts the shape callers actually need. */
export function requireSchoolId(session: AuthSession): string {
  if (!session.schoolId) throw new UnauthenticatedError();
  return session.schoolId;
}
