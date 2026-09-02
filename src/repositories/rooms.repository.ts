import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { rooms, type NewRoom } from "@/db/schema";

export async function listRooms(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  return db.select().from(rooms).where(inArray(rooms.campusId, campusIds));
}

export async function getRoom(campusIds: string[], roomId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.id, roomId), inArray(rooms.campusId, campusIds)))
    .limit(1);
  return row ?? null;
}

export async function createRoom(campusId: string, input: Omit<NewRoom, "campusId">) {
  const [row] = await db
    .insert(rooms)
    .values({ ...input, campusId })
    .returning();
  return row;
}

/** Unlike Class (whose campus is fixed at creation), a Room may be reassigned to a different campus — matches the existing Room Edit form. */
export async function updateRoom(campusIds: string[], roomId: string, input: Partial<Omit<NewRoom, "id">>) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .update(rooms)
    .set(input)
    .where(and(eq(rooms.id, roomId), inArray(rooms.campusId, campusIds)))
    .returning();
  return row ?? null;
}

export async function archiveRoom(campusIds: string[], roomId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .update(rooms)
    .set({ status: "archived" })
    .where(and(eq(rooms.id, roomId), inArray(rooms.campusId, campusIds)))
    .returning();
  return row ?? null;
}
