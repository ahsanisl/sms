import * as homeworkService from "@/services/homework.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { HomeworkListClient } from "@/app/(app)/homework/homework-list-client";

export default async function HomeworkPage() {
  const session = await requireSession();
  const [rows, classes, subjects, teachers, canManage] = await Promise.all([
    homeworkService.listHomework(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
    can(session, "homeworkCreate"),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));
  const teacherById = new Map(teachers.map((t) => [t.id, t.name]));

  return (
    <HomeworkListClient
      rows={rows
        .map((r) => {
          const cls = classById.get(r.classId);
          return {
            id: r.id,
            classId: r.classId,
            classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
            subjectName: subjectById.get(r.subjectId) ?? "—",
            teacherName: teacherById.get(r.teacherId) ?? "—",
            title: r.title,
            assignedDate: r.assignedDate,
            dueDate: r.dueDate,
          };
        })
        .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))}
      classes={classes.filter((c) => c.status === "active").map((c) => ({ id: c.id, label: `${c.grade}-${c.section}` }))}
      canManage={canManage}
    />
  );
}
