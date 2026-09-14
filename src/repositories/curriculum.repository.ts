import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { curriculumTopics, type NewCurriculumTopic } from "@/db/schema";

export async function listTopics(classId: string, subjectId: string, academicSessionId: string) {
  return db
    .select()
    .from(curriculumTopics)
    .where(
      and(
        eq(curriculumTopics.classId, classId),
        eq(curriculumTopics.subjectId, subjectId),
        eq(curriculumTopics.academicSessionId, academicSessionId),
      ),
    )
    .orderBy(asc(curriculumTopics.orderIndex));
}

export async function getTopic(topicId: string) {
  const [row] = await db.select().from(curriculumTopics).where(eq(curriculumTopics.id, topicId)).limit(1);
  return row ?? null;
}

export async function createTopic(input: NewCurriculumTopic) {
  const [row] = await db.insert(curriculumTopics).values(input).returning();
  return row;
}

export async function updateTopic(topicId: string, input: Partial<Omit<NewCurriculumTopic, "id">>) {
  const [row] = await db.update(curriculumTopics).set(input).where(eq(curriculumTopics.id, topicId)).returning();
  return row ?? null;
}

export async function updateStatus(topicId: string, status: "not_started" | "in_progress" | "completed", completedDate: string | null) {
  const [row] = await db
    .update(curriculumTopics)
    .set({ status, completedDate, updatedAt: new Date() })
    .where(eq(curriculumTopics.id, topicId))
    .returning();
  return row ?? null;
}

export async function deleteTopic(topicId: string) {
  const [row] = await db.delete(curriculumTopics).where(eq(curriculumTopics.id, topicId)).returning();
  return row ?? null;
}

/** Bulk order-index update after a drag-free up/down reorder in the UI. */
export async function reorderTopics(orderedIds: string[]) {
  return db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(curriculumTopics).set({ orderIndex: i }).where(eq(curriculumTopics.id, orderedIds[i]));
    }
  });
}
