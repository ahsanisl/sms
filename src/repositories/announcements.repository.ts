import "server-only";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements, type NewAnnouncement } from "@/db/schema";

/** School-wide (campusId null) announcements plus any scoped to one of the caller's campuses — never announcements scoped to a campus outside campusIds. */
export async function listAnnouncements(schoolId: string, campusIds: string[]) {
  return db
    .select()
    .from(announcements)
    .where(and(eq(announcements.schoolId, schoolId), or(isNull(announcements.campusId), campusIds.length > 0 ? inArray(announcements.campusId, campusIds) : undefined)));
}

export async function createAnnouncement(input: NewAnnouncement) {
  const [row] = await db.insert(announcements).values(input).returning();
  return row;
}

export async function deleteAnnouncement(schoolId: string, announcementId: string) {
  await db.delete(announcements).where(and(eq(announcements.id, announcementId), eq(announcements.schoolId, schoolId)));
}
