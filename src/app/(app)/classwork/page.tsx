import * as classworkService from "@/services/classwork.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { ClassworkClient } from "@/app/(app)/classwork/classwork-client";

export default async function ClassworkPage() {
  const session = await requireSession();
  const [rows, classes, subjects, teachers, canManage] = await Promise.all([
    classworkService.listClasswork(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
    can(session, "classworkCreate"),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));
  const teacherById = new Map(teachers.map((t) => [t.id, t.name]));

  return (
    <ClassworkClient
      rows={rows
        .map((r) => {
          const cls = classById.get(r.classId);
          return {
            id: r.id,
            classId: r.classId,
            classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
            subjectId: r.subjectId,
            subjectName: subjectById.get(r.subjectId) ?? "—",
            teacherId: r.teacherId,
            teacherName: teacherById.get(r.teacherId) ?? "—",
            date: r.date,
            title: r.title,
            description: r.description,
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1))}
      classes={classes.filter((c) => c.status === "active").map((c) => ({ id: c.id, label: `${c.grade}-${c.section}`, subjectIds: c.subjectIds, campusId: c.campusId }))}
      subjects={subjects.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: s.name }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.name, campusId: t.campusId }))}
      canManage={canManage}
      isTeacher={session.role === "teacher"}
    />
  );
}
