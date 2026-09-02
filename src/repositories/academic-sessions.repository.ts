import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { academicSessions, terms, type NewAcademicSession, type NewTerm } from "@/db/schema";

export async function listSessions(schoolId: string) {
  const sessions = await db.select().from(academicSessions).where(eq(academicSessions.schoolId, schoolId));
  const withTerms = await Promise.all(
    sessions.map(async (session) => ({
      ...session,
      terms: await db.select().from(terms).where(eq(terms.sessionId, session.id)),
    })),
  );
  return withTerms;
}

export async function getSession(schoolId: string, sessionId: string) {
  const [row] = await db
    .select()
    .from(academicSessions)
    .where(and(eq(academicSessions.id, sessionId), eq(academicSessions.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function createSession(schoolId: string, input: Omit<NewAcademicSession, "schoolId">, termsInput: Omit<NewTerm, "sessionId">[]) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(academicSessions)
      .values({ ...input, schoolId })
      .returning();
    if (termsInput.length > 0) {
      await tx.insert(terms).values(termsInput.map((t) => ({ ...t, sessionId: session.id })));
    }
    return session;
  });
}

export async function updateSession(schoolId: string, sessionId: string, input: Partial<NewAcademicSession>) {
  const [row] = await db
    .update(academicSessions)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(academicSessions.id, sessionId), eq(academicSessions.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

/** Only one session is active at a time within a school — enforced here in a transaction, not left to the caller to remember. */
export async function setActiveSession(schoolId: string, sessionId: string) {
  await db.transaction(async (tx) => {
    await tx.update(academicSessions).set({ isActive: false }).where(eq(academicSessions.schoolId, schoolId));
    await tx
      .update(academicSessions)
      .set({ isActive: true })
      .where(and(eq(academicSessions.id, sessionId), eq(academicSessions.schoolId, schoolId)));
  });
}
