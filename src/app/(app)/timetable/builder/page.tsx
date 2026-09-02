import * as classService from "@/services/class.service";
import * as teacherService from "@/services/teacher.service";
import * as roomService from "@/services/room.service";
import * as subjectService from "@/services/subject.service";
import * as timetableService from "@/services/timetable.service";
import { requireSession } from "@/lib/tenancy";
import { EmptyState } from "@/components/shared/empty-state";
import { BuilderClient } from "@/app/(app)/timetable/builder/builder-client";
import { GRADE_ORDER } from "@/lib/mock/reference-data";
import type { TimetableDay } from "@/lib/types";

export default async function TimetableBuilderPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId: requestedClassId } = await searchParams;
  const session = await requireSession();

  const [classes, teachers, rooms, config] = await Promise.all([
    classService.listClasses(session),
    teacherService.listTeachers(session),
    roomService.listRooms(session),
    timetableService.getConfig(session),
  ]);

  const activeClasses = classes.filter((c) => c.status === "active");
  const orderedClasses = GRADE_ORDER.flatMap((grade) => activeClasses.filter((c) => c.grade === grade));

  if (orderedClasses.length === 0) {
    return <EmptyState icon="event_busy" title="No classes to build a timetable for" description="Add a class under Classes & Sections first." />;
  }

  const classId = requestedClassId && orderedClasses.some((c) => c.id === requestedClassId) ? requestedClassId : orderedClasses[0].id;
  const schedule = await timetableService.getScheduleForClass(session, classId);

  const teachersWithSubjects = teachers.filter((t) => t.status === "active").map((t) => ({ ...t, classIds: [], joinDate: t.joinDate ?? "" }));
  const subjects = await subjectService.listSubjects(session);

  // Keyed by classId + a pure fingerprint of the loaded schedule, so switching
  // classes AND any server refresh triggered by this page's own Save/Discard/
  // Publish actions both force a clean remount — the grid must never keep
  // locally-edited state once the server has re-supplied fresh data.
  const scheduleFingerprint = JSON.stringify([schedule.hasDraft, schedule.slots.map((s) => [s.day, s.period, s.subjectId, s.teacherId, s.roomId]).sort()]);

  return (
    <BuilderClient
      key={`${classId}-${scheduleFingerprint}`}
      classId={classId}
      classes={orderedClasses}
      teachers={teachersWithSubjects}
      rooms={rooms.filter((r) => r.status === "active")}
      subjects={subjects.filter((s) => s.status === "active")}
      workingDays={config.workingDays as TimetableDay[]}
      periods={config.periods.map((p) => ({ period: p.period, startTime: p.startTime, endTime: p.endTime }))}
      breakAfterPeriod={config.breakAfterPeriod}
      status={schedule.status}
      hasDraft={schedule.hasDraft}
      initialSlots={schedule.slots.map((s) => ({ day: s.day as TimetableDay, period: s.period, subjectId: s.subjectId, teacherId: s.teacherId, roomId: s.roomId ?? "" }))}
      otherEffectiveSlots={schedule.otherEffectiveSlots.map((s) => ({ classId: s.classId, day: s.day as TimetableDay, period: s.period, teacherId: s.teacherId, roomId: s.roomId ?? undefined }))}
    />
  );
}
