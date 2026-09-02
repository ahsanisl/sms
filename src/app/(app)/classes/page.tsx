import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as teacherService from "@/services/teacher.service";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { ClassesClient } from "@/app/(app)/classes/classes-client";

export default async function ClassesPage() {
  const session = await requireSession();
  const [classes, campuses, teachers, students, canManageClasses] = await Promise.all([
    classService.listClasses(session),
    campusService.listCampuses(session),
    teacherService.listTeachers(session),
    studentService.listStudents(session),
    can(session.role, "classesManage"),
  ]);

  const campusById = new Map(campuses.map((c) => [c.id, c]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));

  const activeClasses = classes
    .filter((c) => c.status === "active")
    .map((c) => ({
      id: c.id,
      grade: c.grade,
      section: c.section,
      campusId: c.campusId,
      campusName: campusById.get(c.campusId)?.name ?? "—",
      classTeacherId: c.classTeacherId,
      classTeacherName: teacherById.get(c.classTeacherId)?.name ?? "Unassigned",
      subjectIds: c.subjectIds,
      studentCount: students.filter((s) => s.classId === c.id).length,
      status: c.status,
    }));

  return (
    <ClassesClient
      classes={activeClasses}
      totalStudents={students.filter((s) => activeClasses.some((c) => c.id === s.classId)).length}
      canManageClasses={canManageClasses}
      campuses={campuses}
      teachers={teachers.map((t) => ({ ...t, classIds: [], joinDate: t.joinDate ?? "" }))}
    />
  );
}
