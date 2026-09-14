import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as classworkService from "@/services/classwork.service";
import { requireSession } from "@/lib/tenancy";
import { ParentClassworkClient } from "@/app/(app)/portal/classwork/classwork-client";

export default async function ParentClassworkPage() {
  const session = await requireSession();
  const [children, classes, subjects, allClasswork] = await Promise.all([
    studentService.listMyChildren(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    classworkService.listClassworkForParent(session),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));

  const childRows = children.map((child) => {
    const cls = classById.get(child.classId);
    const entries = allClasswork
      .filter((r) => r.classId === child.classId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((r) => ({ id: r.id, date: r.date, subjectName: subjectById.get(r.subjectId) ?? "—", title: r.title, description: r.description }));
    return {
      id: child.id,
      name: child.name,
      classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
      entries,
    };
  });

  return <ParentClassworkClient childRows={childRows} />;
}
