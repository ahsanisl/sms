import "server-only";
import * as timetableRepo from "@/repositories/timetable.repository";
import * as classRepo from "@/repositories/classes.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import { TimetableSlotInputSchema } from "@/lib/validation/timetable";
import { scopedCampusIds } from "@/services/scope";
import { logAudit } from "@/services/audit.service";

export class TimetableConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimetableConflictError";
  }
}

export async function getConfig(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  return timetableRepo.getConfig(schoolId);
}

/** Backs the Teacher Profile's Timetable tab — verifies the teacher is in the caller's own scope before returning their slots (a plain teacherId lookup, unscoped, could otherwise cross a tenant boundary). */
export async function listSlotsForTeacher(session: AuthSession, teacherId: string) {
  const campusIds = await scopedCampusIds(session);
  const teacher = await teacherRepo.getTeacher(campusIds, teacherId);
  if (!teacher) throw new NotFoundError("Teacher");
  return timetableRepo.listSlotsForTeacher(teacherId);
}

export async function setWorkingDays(session: AuthSession, workingDays: string[]) {
  await requirePermission(session, "timetableBuilder");
  const schoolId = requireSchoolId(session);
  await timetableRepo.setWorkingDays(schoolId, workingDays);
  await logAudit(session, "timetable.working_days_updated", "TimetableConfig", schoolId);
}

export async function setPeriods(session: AuthSession, periodsInput: { period: number; startTime: string; endTime: string }[], breakAfterPeriod: number) {
  await requirePermission(session, "timetableBuilder");
  const schoolId = requireSchoolId(session);
  await timetableRepo.setPeriods(schoolId, periodsInput, breakAfterPeriod);
  await logAudit(session, "timetable.periods_updated", "TimetableConfig", schoolId);
}

async function assertClassInScope(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  return cls;
}

/**
 * The three conflicts required by the spec:
 * 1. Teacher double-booked at the same day/period (any class).
 * 2. Room double-booked at the same day/period (any class).
 * 3. Class already has a subject at that day/period — enforced for free by
 *    the timetable_slots unique index on (classId, day, period), so the
 *    caller just needs a friendly error instead of a raw DB constraint one.
 */
async function checkConflicts(input: { teacherId: string; roomId?: string; day: string; period: number }, excludeSlotId?: string) {
  const teacherConflict = await timetableRepo.findTeacherConflict(input.teacherId, input.day, input.period, excludeSlotId);
  if (teacherConflict) throw new TimetableConflictError("This teacher is already assigned to another class at this time.");

  if (input.roomId) {
    const roomConflict = await timetableRepo.findRoomConflict(input.roomId, input.day, input.period, excludeSlotId);
    if (roomConflict) throw new TimetableConflictError("This room is already occupied at this time.");
  }
}

export async function createSlot(session: AuthSession, input: unknown) {
  await requirePermission(session, "timetableBuilder");
  const data = TimetableSlotInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  await checkConflicts(data);
  const slot = await timetableRepo.createSlot(data);
  await logAudit(session, "timetable.slot_created", "TimetableSlot", slot.id);
  return slot;
}

export async function updateSlot(session: AuthSession, slotId: string, input: unknown) {
  await requirePermission(session, "timetableBuilder");
  const data = TimetableSlotInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  await checkConflicts(data, slotId);
  const updated = await timetableRepo.updateSlot(slotId, data);
  if (!updated) throw new NotFoundError("Timetable slot");
  await logAudit(session, "timetable.slot_updated", "TimetableSlot", slotId);
  return updated;
}

export async function deleteSlot(session: AuthSession, slotId: string) {
  await requirePermission(session, "timetableBuilder");
  await timetableRepo.deleteSlot(slotId);
  await logAudit(session, "timetable.slot_deleted", "TimetableSlot", slotId);
}

export async function getStatusForClass(session: AuthSession, classId: string) {
  await assertClassInScope(session, classId);
  return timetableRepo.getStatusForClass(classId);
}

/**
 * Loads everything the Builder/View pages need for one class in a single call:
 * the class's own editable grid (its draft if one exists, else its last
 * published slots), whether a draft exists, its publish status, and — for
 * conflict highlighting — every OTHER in-scope class's currently-effective
 * (draft-or-published) slots.
 */
export async function getScheduleForClass(session: AuthSession, classId: string) {
  const cls = await assertClassInScope(session, classId);
  const campusIds = await scopedCampusIds(session);
  const allClasses = await classRepo.listClasses(campusIds);
  const otherClassIds = allClasses.filter((c) => c.id !== classId).map((c) => c.id);

  const [status, draftSlots, publishedSlots, otherPublished, otherDrafts] = await Promise.all([
    timetableRepo.getStatusForClass(classId),
    timetableRepo.getDraftForClass(classId),
    timetableRepo.listSlotsForClasses([classId]),
    timetableRepo.listSlotsForClasses(otherClassIds),
    timetableRepo.listDraftsForClasses(otherClassIds),
  ]);

  // Normalized to a shared shape — the draft branch's jsonb slots have no `id`,
  // so both branches are mapped down to just the fields conflict-checking needs.
  const otherDraftByClass = new Map(otherDrafts.map((d) => [d.classId, d.slots]));
  const otherEffectiveSlots: { classId: string; day: string; period: number; teacherId: string; roomId: string | null }[] = otherClassIds.flatMap((id) => {
    const draft = otherDraftByClass.get(id);
    const source = draft ?? otherPublished.filter((s) => s.classId === id);
    return source.map((s) => ({ classId: id, day: s.day, period: s.period, teacherId: s.teacherId, roomId: s.roomId ?? null }));
  });

  return {
    cls,
    status,
    hasDraft: !!draftSlots,
    slots: draftSlots ?? publishedSlots,
    otherEffectiveSlots,
  };
}

/** Every currently-published slot across a set of already-scoped class ids — used by the read-only Timetable view. */
export async function listPublishedSlots(session: AuthSession, classIds: string[]) {
  const campusIds = await scopedCampusIds(session);
  const allClasses = await classRepo.listClasses(campusIds);
  const allowed = new Set(allClasses.map((c) => c.id));
  const validIds = classIds.filter((id) => allowed.has(id));
  return timetableRepo.listSlotsForClasses(validIds);
}

export async function saveDraft(session: AuthSession, classId: string, slots: unknown[]) {
  await requirePermission(session, "timetableBuilder");
  await assertClassInScope(session, classId);
  const parsed = slots.map((s) => TimetableSlotInputSchema.parse(s));
  await timetableRepo.saveDraft(classId, parsed);
  await logAudit(session, "timetable.draft_saved", "Class", classId);
}

export async function discardDraft(session: AuthSession, classId: string) {
  await requirePermission(session, "timetableBuilder");
  await assertClassInScope(session, classId);
  await timetableRepo.discardDraft(classId);
}

/**
 * Publishes the Builder's current in-memory grid directly, without requiring
 * a prior "Save Draft" — matches the Builder UI's Publish button, which
 * commits whatever is on screen. Re-validates every slot against every OTHER
 * class's published/draft slots first; publishing while conflicts exist is
 * blocked.
 */
export async function publishGrid(session: AuthSession, classId: string, slots: unknown[]) {
  await requirePermission(session, "timetableBuilder");
  await assertClassInScope(session, classId);
  const parsed = slots.map((s) => TimetableSlotInputSchema.parse(s));

  for (const slot of parsed) {
    await checkConflicts({ teacherId: slot.teacherId, roomId: slot.roomId, day: slot.day, period: slot.period });
  }

  await timetableRepo.publishDraft(
    classId,
    parsed.map((slot) => ({ ...slot, classId })),
  );
  await logAudit(session, "timetable.published", "Class", classId);
}

/** Re-validates every slot in the draft against every OTHER class's published slots before committing — publishing while conflicts exist is blocked. */
export async function publishDraft(session: AuthSession, classId: string) {
  await requirePermission(session, "timetableBuilder");
  await assertClassInScope(session, classId);
  const draft = await timetableRepo.getDraftForClass(classId);
  if (!draft) throw new NotFoundError("Timetable draft");

  for (const slot of draft) {
    await checkConflicts({ teacherId: slot.teacherId, roomId: slot.roomId, day: slot.day, period: slot.period });
  }

  await timetableRepo.publishDraft(
    classId,
    draft.map((slot) => ({ ...slot, classId })),
  );
  await logAudit(session, "timetable.published", "Class", classId);
}
