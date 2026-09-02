import * as teacherService from "@/services/teacher.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as studentService from "@/services/student.service";
import * as subjectService from "@/services/subject.service";
import * as timetableService from "@/services/timetable.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { TeacherDetailClient } from "@/app/(app)/teachers/[id]/teacher-detail-client";
import type { TimetableDay } from "@/lib/types";

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let teacher;
  try {
    teacher = await teacherService.getTeacher(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="person_off" title="Teacher not found" description="This teacher may have been removed, or you don't have access to it." />
          <Link href="/teachers" className="text-label-md text-secondary hover:underline">
            Back to Teachers
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [classes, campuses, students, subjects, config, slots] = await Promise.all([
    classService.listClasses(session),
    campusService.listCampuses(session),
    studentService.listStudents(session),
    subjectService.listSubjects(session),
    timetableService.getConfig(session),
    timetableService.listSlotsForTeacher(session, teacher.id),
  ]);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const classById = new Map(classes.map((c) => [c.id, c]));

  const assignedClasses = classes.filter((c) => c.classTeacherId === teacher.id && c.status === "active");
  const classRows = assignedClasses.map((c) => ({
    id: c.id,
    label: `${c.grade}-${c.section}`,
    studentCount: students.filter((s) => s.classId === c.id && s.status === "active").length,
  }));
  const totalStudents = students.filter((s) => assignedClasses.some((c) => c.id === s.classId) && s.status === "active").length;

  return (
    <TeacherDetailClient
      teacher={{ ...teacher, joinDate: teacher.joinDate ?? "", classIds: assignedClasses.map((c) => c.id) }}
      subjectNames={teacher.subjectIds.map((sid) => subjectById.get(sid)?.name).filter(Boolean).join(", ")}
      totalStudents={totalStudents}
      classRows={classRows}
      workingDays={config.workingDays as TimetableDay[]}
      slots={slots.map((s) => ({
        id: s.id,
        day: s.day as TimetableDay,
        period: s.period,
        startTime: s.startTime,
        subjectName: subjectById.get(s.subjectId)?.name ?? "Subject",
        classLabel: classById.get(s.classId) ? `${classById.get(s.classId)!.grade}-${classById.get(s.classId)!.section}` : "—",
      }))}
      campuses={campuses.filter((c) => c.status === "active")}
      subjects={subjects.filter((s) => s.status === "active")}
    />
  );
}
