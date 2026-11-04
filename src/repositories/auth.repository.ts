import "server-only";
import { and, desc, eq, gt, like, ne } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, authVerifications } from "@/db/schema";

// -- Sessions (Better Auth's table; see src/auth.ts) --------------------------------------------------------
export async function listActiveSessions(userId: string) {
  return db
    .select({ id: authSessions.id, token: authSessions.token, createdAt: authSessions.createdAt, updatedAt: authSessions.updatedAt, userAgent: authSessions.userAgent, ipAddress: authSessions.ipAddress })
    .from(authSessions)
    .where(and(eq(authSessions.userId, userId), gt(authSessions.expiresAt, new Date())))
    .orderBy(desc(authSessions.updatedAt));
}

/** Signs a user out everywhere — or everywhere except the session with `keepToken`. Returns how many were ended. */
export async function deleteSessionsForUser(userId: string, keepToken?: string | null) {
  const rows = await db
    .delete(authSessions)
    .where(keepToken ? and(eq(authSessions.userId, userId), ne(authSessions.token, keepToken)) : eq(authSessions.userId, userId))
    .returning({ id: authSessions.id });
  return rows.length;
}

// -- Password-reset tokens (stored hashed in auth_verifications) --------------------------------------------------------
const RESET_PREFIX = "password-reset:";

export async function replacePasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  await db.transaction(async (tx) => {
    await tx.delete(authVerifications).where(eq(authVerifications.identifier, RESET_PREFIX + userId));
    await tx.insert(authVerifications).values({ identifier: RESET_PREFIX + userId, value: tokenHash, expiresAt });
  });
}

export async function latestPasswordResetRequest(userId: string) {
  const [row] = await db.select().from(authVerifications).where(eq(authVerifications.identifier, RESET_PREFIX + userId)).orderBy(desc(authVerifications.createdAt)).limit(1);
  return row ?? null;
}

/** The user a still-valid reset token belongs to, or null. */
export async function findPasswordResetToken(tokenHash: string) {
  const [row] = await db
    .select()
    .from(authVerifications)
    .where(and(eq(authVerifications.value, tokenHash), like(authVerifications.identifier, `${RESET_PREFIX}%`), gt(authVerifications.expiresAt, new Date())))
    .limit(1);
  return row ? { id: row.id, userId: row.identifier.slice(RESET_PREFIX.length) } : null;
}

export async function deletePasswordResetTokens(userId: string) {
  await db.delete(authVerifications).where(eq(authVerifications.identifier, RESET_PREFIX + userId));
}
