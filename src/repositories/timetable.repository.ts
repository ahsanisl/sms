import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { periods, timetableConfigs, timetableDrafts, timetableSlots, timetableStatus, type NewTimetableSlot } from "@/db/schema";

export async function getConfig(schoolId: string) {
  const [config] = await db.select().from(timetableConfigs).where(eq(timetableConfigs.schoolId, schoolId)).limit(1);
  const periodRows = await db.select().from(periods).where(eq(periods.schoolId, schoolId)).orderBy(asc(periods.period));
  return { workingDays: config?.workingDays ?? [], breakAfterPeriod: config?.breakAfterPeriod ?? 0, periods: periodRows };
}

export async function setWorkingDays(schoolId: string, workingDays: string[]) {
  await db
    .insert(timetableConfigs)
    .values({ schoolId, workingDays })
    .onConflictDoUpdate({ target: timetableConfigs.schoolId, set: { workingDays } });
}

export async function setPeriods(schoolId: string, periodsInput: { period: number; startTime: string; endTime: string }[], breakAfterPeriod: number) {
  await db.transaction(async (tx) => {
    await tx.delete(periods).where(eq(periods.schoolId, schoolId));
    if (periodsInput.length > 0) {
      await tx.insert(periods).values(periodsInput.map((p) => ({ ...p, schoolId })));
    }
    await tx
      .insert(timetableConfigs)
      .values({ schoolId, breakAfterPeriod })
      .onConflictDoUpdate({ target: timetableConfigs.schoolId, set: { breakAfterPeriod } });
  });
}

export async function listSlotsForClasses(classIds: string[]) {
  if (classIds.length === 0) return [];
  return db.select().from(timetableSlots).where(inArray(timetableSlots.classId, classIds));
}

/** Every published slot a teacher is assigned to, across any class — backs the Teacher Profile's Timetable tab. */
export async function listSlotsForTeacher(teacherId: string) {
  return db.select().from(timetableSlots).where(eq(timetableSlots.teacherId, teacherId));
}

/** Another PUBLISHED slot where this teacher is already booked at the same day/period, across any class — excludes the slot currently being edited. */
export async function findTeacherConflict(teacherId: string, day: string, period: number, excludeSlotId?: string) {
  const conditions = [eq(timetableSlots.teacherId, teacherId), eq(timetableSlots.day, day as never), eq(timetableSlots.period, period)];
  if (excludeSlotId) conditions.push(ne(timetableSlots.id, excludeSlotId));
  const [row] = await db.select().from(timetableSlots).where(and(...conditions)).limit(1);
  return row ?? null;
}

export async function findRoomConflict(roomId: string, day: string, period: number, excludeSlotId?: string) {
  const conditions = [eq(timetableSlots.roomId, roomId), eq(timetableSlots.day, day as never), eq(timetableSlots.period, period)];
  if (excludeSlotId) conditions.push(ne(timetableSlots.id, excludeSlotId));
  const [row] = await db.select().from(timetableSlots).where(and(...conditions)).limit(1);
  return row ?? null;
}

export async function createSlot(input: NewTimetableSlot) {
  const [row] = await db.insert(timetableSlots).values(input).returning();
  return row;
}

export async function updateSlot(slotId: string, input: Partial<NewTimetableSlot>) {
  const [row] = await db.update(timetableSlots).set(input).where(eq(timetableSlots.id, slotId)).returning();
  return row ?? null;
}

export async function deleteSlot(slotId: string) {
  await db.delete(timetableSlots).where(eq(timetableSlots.id, slotId));
}

export async function getStatusForClass(classId: string) {
  const [row] = await db.select().from(timetableStatus).where(eq(timetableStatus.classId, classId)).limit(1);
  return row?.status ?? "published";
}

export async function getDraftForClass(classId: string) {
  const [row] = await db.select().from(timetableDrafts).where(eq(timetableDrafts.classId, classId)).limit(1);
  return row?.slots ?? null;
}

/** Batch form of getDraftForClass, for computing every OTHER class's currently-effective (draft-or-published) slots at once. */
export async function listDraftsForClasses(classIds: string[]) {
  if (classIds.length === 0) return [];
  return db.select().from(timetableDrafts).where(inArray(timetableDrafts.classId, classIds));
}

export async function saveDraft(classId: string, slots: NonNullable<Awaited<ReturnType<typeof getDraftForClass>>>) {
  await db.transaction(async (tx) => {
    await tx
      .insert(timetableDrafts)
      .values({ classId, slots, updatedAt: new Date() })
      .onConflictDoUpdate({ target: timetableDrafts.classId, set: { slots, updatedAt: new Date() } });
    await tx
      .insert(timetableStatus)
      .values({ classId, status: "draft" })
      .onConflictDoUpdate({ target: timetableStatus.classId, set: { status: "draft" } });
  });
}

export async function discardDraft(classId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(timetableDrafts).where(eq(timetableDrafts.classId, classId));
    await tx
      .insert(timetableStatus)
      .values({ classId, status: "published" })
      .onConflictDoUpdate({ target: timetableStatus.classId, set: { status: "published" } });
  });
}

export async function publishDraft(classId: string, slots: NewTimetableSlot[]) {
  await db.transaction(async (tx) => {
    await tx.delete(timetableSlots).where(eq(timetableSlots.classId, classId));
    if (slots.length > 0) await tx.insert(timetableSlots).values(slots);
    await tx.delete(timetableDrafts).where(eq(timetableDrafts.classId, classId));
    await tx
      .insert(timetableStatus)
      .values({ classId, status: "published" })
      .onConflictDoUpdate({ target: timetableStatus.classId, set: { status: "published" } });
  });
}
