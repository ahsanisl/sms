import type { TimetableDay, TimetableSlot } from "@/lib/types";
import { mulberry32, pick } from "@/lib/mock/names";
import { CLASSES, TEACHERS, homeRoomFor, labRoomFor } from "@/lib/mock/reference-data";

const rand = mulberry32(505);

/** Seed defaults — the live, editable copies (configurable in Settings → Timetable) live in AppDataState. */
export const DAYS: TimetableDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const PERIODS = [
  { period: 1, startTime: "08:00", endTime: "08:40" },
  { period: 2, startTime: "08:40", endTime: "09:20" },
  { period: 3, startTime: "09:20", endTime: "10:00" },
  { period: 4, startTime: "10:20", endTime: "11:00" },
  { period: 5, startTime: "11:00", endTime: "11:40" },
  { period: 6, startTime: "11:40", endTime: "12:20" },
  { period: 7, startTime: "12:20", endTime: "13:00" },
];

/** Period 4 follows a 20-minute break (10:00–10:20), shown by the UI, not stored as a slot. */
export const BREAK_AFTER_PERIOD = 3;

function teacherForSubjectAtCampus(campusId: string, subjectId: string) {
  const candidates = TEACHERS.filter((t) => t.campusId === campusId && t.subjectIds.includes(subjectId));
  return candidates.length ? pick(candidates, rand) : TEACHERS.find((t) => t.campusId === campusId)!;
}

/**
 * Each campus has exactly one teacher per subject (see reference-data.ts), so two
 * sections of the same grade needing the same subject at the same moment would
 * otherwise double-book that teacher every time — since the subject-per-slot
 * formula below only depends on day/period, identical-grade sections would
 * always land on the same subject simultaneously without this. Building
 * sequentially and swapping to another subject in the class's own rotation
 * (searching for one whose teacher/room is still free that slot) keeps the
 * generated seed timetable realistic — i.e. close to conflict-free — while still
 * leaving the Timetable Builder's own conflict detection free to catch the rare
 * unavoidable one, and free to reintroduce conflicts once an admin edits it.
 */
function buildTimetable(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  const teacherBusy = new Set<string>();
  const roomBusy = new Set<string>();
  let seq = 1;

  for (const cls of CLASSES) {
    // Stagger same-grade sections (A, B, ...) so they don't all want the same subject at the same time.
    const sectionOffset = cls.section.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);

    for (const day of DAYS) {
      for (const p of PERIODS) {
        const baseIndex = p.period + DAYS.indexOf(day) + sectionOffset;
        let subjectId = cls.subjectIds[baseIndex % cls.subjectIds.length];
        let teacher = teacherForSubjectAtCampus(cls.campusId, subjectId);
        let room = labRoomFor(cls.id, subjectId) ?? homeRoomFor(cls.id);

        const isFree = (t: typeof teacher, r: typeof room) =>
          !teacherBusy.has(`${t.id}|${day}|${p.period}`) && (!r || !roomBusy.has(`${r.id}|${day}|${p.period}`));

        if (!isFree(teacher, room)) {
          const alternative = cls.subjectIds
            .map((sid, i) => ({ sid, i }))
            .find(({ i }) => {
              const altTeacher = teacherForSubjectAtCampus(cls.campusId, cls.subjectIds[i]);
              const altRoom = labRoomFor(cls.id, cls.subjectIds[i]) ?? homeRoomFor(cls.id);
              return isFree(altTeacher, altRoom);
            });
          if (alternative) {
            subjectId = alternative.sid;
            teacher = teacherForSubjectAtCampus(cls.campusId, subjectId);
            room = labRoomFor(cls.id, subjectId) ?? homeRoomFor(cls.id);
          }
        }

        teacherBusy.add(`${teacher.id}|${day}|${p.period}`);
        if (room) roomBusy.add(`${room.id}|${day}|${p.period}`);

        slots.push({
          id: `tt${seq++}`,
          classId: cls.id,
          day,
          period: p.period,
          startTime: p.startTime,
          endTime: p.endTime,
          subjectId,
          teacherId: teacher.id,
          roomId: room?.id,
        });
      }
    }
  }
  return slots;
}

// Mutable, like CLASSES/TEACHERS in reference-data.ts — AppDataProvider re-points
// this at the live, published timetable on every store change (see syncTimetable
// and the mirror-sync effect in lib/store/app-data-context.tsx) so Class Detail,
// Teacher Detail and the Teacher Dashboard reflect Timetable Builder publishes
// instead of forever showing this generated seed data.
export let TIMETABLE: TimetableSlot[] = buildTimetable();

export function syncTimetable(next: TimetableSlot[]) {
  TIMETABLE = next;
}

export function timetableForClass(classId: string) {
  return TIMETABLE.filter((t) => t.classId === classId);
}

export function timetableForTeacher(teacherId: string) {
  return TIMETABLE.filter((t) => t.teacherId === teacherId);
}
