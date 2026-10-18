import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { syllabusTopics, type NewSyllabusTopic } from "@/db/schema";

export async function listTopics(classId: string, subjectId: string, academicSessionId: string) {
  return db
    .select()
    .from(syllabusTopics)
    .where(
      and(
        eq(syllabusTopics.classId, classId),
        eq(syllabusTopics.subjectId, subjectId),
        eq(syllabusTopics.academicSessionId, academicSessionId),
      ),
    )
    .orderBy(asc(syllabusTopics.orderIndex));
}

export async function getTopic(topicId: string) {
  const [row] = await db.select().from(syllabusTopics).where(eq(syllabusTopics.id, topicId)).limit(1);
  return row ?? null;
}

export async function createTopic(input: NewSyllabusTopic) {
  const [row] = await db.insert(syllabusTopics).values(input).returning();
  return row;
}

export async function updateTopic(topicId: string, input: Partial<Omit<NewSyllabusTopic, "id">>) {
  const [row] = await db.update(syllabusTopics).set(input).where(eq(syllabusTopics.id, topicId)).returning();
  return row ?? null;
}

export async function updateStatus(topicId: string, status: "not_started" | "in_progress" | "completed", completedDate: string | null) {
  const [row] = await db
    .update(syllabusTopics)
    .set({ status, completedDate, updatedAt: new Date() })
    .where(eq(syllabusTopics.id, topicId))
    .returning();
  return row ?? null;
}

export async function deleteTopic(topicId: string) {
  const [row] = await db.delete(syllabusTopics).where(eq(syllabusTopics.id, topicId)).returning();
  return row ?? null;
}

/** Bulk order-index update after a drag-free up/down reorder in the UI. */
export async function reorderTopics(orderedIds: string[]) {
  return db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(syllabusTopics).set({ orderIndex: i }).where(eq(syllabusTopics.id, orderedIds[i]));
    }
  });
}
