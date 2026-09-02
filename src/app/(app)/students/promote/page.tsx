import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as attendanceService from "@/services/attendance.service";
import { requireSession } from "@/lib/tenancy";
import { PromoteClient } from "@/app/(app)/students/promote/promote-client";
import { GRADE_ORDER } from "@/lib/mock/reference-data";
import type { ClassSection } from "@/lib/types";

function suggestTargetClassId(source: ClassSection, classes: ClassSection[]): string | "alumni" {
  const nextGradeIndex = GRADE_ORDER.indexOf(source.grade) + 1;
  if (nextGradeIndex >= GRADE_ORDER.length) return "alumni";
  const nextGrade = GRADE_ORDER[nextGradeIndex];
  const candidatesAtCampus = classes.filter((c) => c.status === "active" && c.campusId === source.campusId && c.grade === nextGrade);
  const sameSection = candidatesAtCampus.find((c) => c.section === source.section);
  return (sameSection ?? candidatesAtCampus[0])?.id ?? "alumni";
}

export default async function PromoteStudentsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId: requestedClassId } = await searchParams;
  const session = await requireSession();

  const [allClasses, allStudents] = await Promise.all([classService.listClasses(session), studentService.listStudents(session)]);
  const activeClasses = allClasses.filter((c) => c.status === "active");
  const orderedClasses = GRADE_ORDER.flatMap((grade) => activeClasses.filter((c) => c.grade === grade));

  if (orderedClasses.length === 0) {
    return <PromoteClient orderedClasses={[]} classId="" sourceClassLabel="" targetOptions={[]} suggestedTargetClassId="alumni" roster={[]} />;
  }

  const classId = requestedClassId && orderedClasses.some((c) => c.id === requestedClassId) ? requestedClassId : orderedClasses[0].id;
  const sourceClass = activeClasses.find((c) => c.id === classId)!;
  const suggested = suggestTargetClassId(sourceClass, activeClasses);
  const targetOptions = activeClasses.filter((c) => c.campusId === sourceClass.campusId && c.id !== classId);

  const roster = allStudents.filter((s) => s.classId === classId && s.status === "active");
  const rosterWithAttendance = await Promise.all(
    roster.map(async (s) => {
      const attendance = await attendanceService.listByStudent(session, s.id);
      const rate = attendance.length
        ? Math.round((attendance.filter((a) => a.status === "present" || a.status === "late").length / attendance.length) * 100)
        : 0;
      return { id: s.id, name: s.name, rollNumber: s.rollNumber, attendanceRate: rate };
    }),
  );

  return (
    <PromoteClient
      key={classId}
      orderedClasses={orderedClasses.map((c) => ({ id: c.id, label: `${c.grade}-${c.section}` }))}
      classId={classId}
      sourceClassLabel={`${sourceClass.grade}-${sourceClass.section}`}
      targetOptions={targetOptions.map((c) => ({ id: c.id, label: `${c.grade}-${c.section}` }))}
      suggestedTargetClassId={suggested}
      roster={rosterWithAttendance}
    />
  );
}
