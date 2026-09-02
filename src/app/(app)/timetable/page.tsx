import * as classService from "@/services/class.service";
import * as teacherService from "@/services/teacher.service";
import * as roomService from "@/services/room.service";
import * as subjectService from "@/services/subject.service";
import * as timetableService from "@/services/timetable.service";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { TimetableViewClient } from "@/app/(app)/timetable/timetable-view-client";
import { GRADE_ORDER } from "@/lib/mock/reference-data";
import type { TimetableDay } from "@/lib/types";

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId: requestedClassId } = await searchParams;
  const session = await requireSession();

  const [classes, teachersRaw, rooms, subjects, config, canBuild] = await Promise.all([
    classService.listClasses(session),
    teacherService.listTeachers(session),
    roomService.listRooms(session),
    subjectService.listSubjects(session),
    timetableService.getConfig(session),
    can(session.role, "timetableBuilder"),
  ]);
  const teachers = teachersRaw.map((t) => ({ ...t, classIds: [], joinDate: t.joinDate ?? "" }));

  const activeClasses = classes.filter((c) => c.status === "active");
  const orderedClasses = GRADE_ORDER.flatMap((grade) => activeClasses.filter((c) => c.grade === grade));

  // A parent's default view is their own child's class, not just "first class in the school".
  const defaultClassId = session.role === "parent" ? (await studentService.listMyChildren(session))[0]?.classId : undefined;
  const classId =
    requestedClassId && activeClasses.some((c) => c.id === requestedClassId)
      ? requestedClassId
      : (defaultClassId ?? orderedClasses[0]?.id ?? "");

  const [status, slots] = classId
    ? await Promise.all([timetableService.getStatusForClass(session, classId), timetableService.listPublishedSlots(session, [classId])])
    : ["published" as const, []];

  return (
    <TimetableViewClient
      classId={classId}
      classes={orderedClasses}
      teachers={teachers}
      rooms={rooms}
      subjects={subjects}
      workingDays={config.workingDays as TimetableDay[]}
      periods={config.periods.map((p) => ({ period: p.period, startTime: p.startTime, endTime: p.endTime }))}
      breakAfterPeriod={config.breakAfterPeriod}
      status={status}
      slots={slots.map((s) => ({ day: s.day as TimetableDay, period: s.period, subjectId: s.subjectId, teacherId: s.teacherId, roomId: s.roomId ?? undefined }))}
      canBuild={canBuild}
    />
  );
}
