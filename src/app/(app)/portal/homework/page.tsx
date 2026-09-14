import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as homeworkService from "@/services/homework.service";
import { requireSession } from "@/lib/tenancy";
import { ParentHomeworkClient } from "@/app/(app)/portal/homework/homework-list-client";

export default async function ParentHomeworkPage() {
  const session = await requireSession();
  const [children, classes, subjects, allHomework] = await Promise.all([
    studentService.listMyChildren(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    homeworkService.listHomeworkForParent(session),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));
  const today = new Date().toISOString().slice(0, 10);

  const childRows = await Promise.all(
    children.map(async (child) => {
      const cls = classById.get(child.classId);
      const homeworkForChild = allHomework.filter((h) => h.classId === child.classId);
      const entries = await Promise.all(
        homeworkForChild.map(async (h) => {
          const { submission } = await homeworkService.getHomeworkWithStatus(session, h.id);
          return {
            id: h.id,
            subjectName: subjectById.get(h.subjectId) ?? "—",
            title: h.title,
            dueDate: h.dueDate,
            status: submission?.status ?? "not_submitted",
            grade: submission?.grade ?? "",
            overdue: !submission && h.dueDate < today,
          };
        }),
      );
      return {
        id: child.id,
        name: child.name,
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        entries: entries.sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1)),
      };
    }),
  );

  return <ParentHomeworkClient childRows={childRows} />;
}
