import * as departmentService from "@/services/department.service";
import * as campusService from "@/services/campus.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import * as classService from "@/services/class.service";
import { requireSession } from "@/lib/tenancy";
import { DepartmentsClient } from "@/app/(app)/settings/departments/departments-client";

export default async function DepartmentsPage() {
  const session = await requireSession();
  const [departments, campuses, subjects, rawTeachers, classes] = await Promise.all([
    departmentService.listDepartments(session),
    campusService.listCampuses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
    classService.listClasses(session),
  ]);

  // classIds: same derived-not-stored fixup used on the real /teachers page.
  const teachers = rawTeachers.map((t) => ({
    ...t,
    joinDate: t.joinDate ?? "",
    classIds: classes.filter((c) => c.classTeacherId === t.id && c.status === "active").map((c) => c.id),
  }));

  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));
  const campusById = new Map(campuses.map((c) => [c.id, c.name]));
  const teacherById = new Map(teachers.map((t) => [t.id, t.name]));

  const rows = departments.map((d) => ({
    id: d.id,
    name: d.name,
    campusId: d.campusId,
    campusName: campusById.get(d.campusId) ?? "—",
    subjectIds: d.subjectIds,
    subjectNames: d.subjectIds.map((id) => subjectById.get(id)).filter(Boolean).join(", "),
    headTeacherId: d.headTeacherId ?? undefined,
    headTeacherName: d.headTeacherId ? (teacherById.get(d.headTeacherId) ?? "Unassigned") : "Unassigned",
    status: d.status,
    memberCount: teachers.filter((t) => t.status === "active" && t.campusId === d.campusId && t.subjectIds.some((s) => d.subjectIds.includes(s))).length,
  }));

  return (
    <DepartmentsClient
      departments={rows}
      campuses={campuses.filter((c) => c.status === "active")}
      subjects={subjects.filter((s) => s.status === "active")}
      teachers={teachers}
    />
  );
}
