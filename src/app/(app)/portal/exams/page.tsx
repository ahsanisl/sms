import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as examService from "@/services/exam.service";
import { requireSession } from "@/lib/tenancy";
import { ParentExamsClient } from "@/app/(app)/portal/exams/exams-client";

export default async function ParentAcademicsPage() {
  const session = await requireSession();
  const [children, classes, gradeBands] = await Promise.all([
    studentService.listMyChildren(session),
    classService.listClasses(session),
    examService.listGradeBands(session),
  ]);
  const classById = new Map(classes.map((c) => [c.id, c]));

  const rows = await Promise.all(
    children.map(async (child) => {
      const cls = classById.get(child.classId);
      // getResultCardData already enforces parent-ownership + published-only filtering — the same function the real result card page uses.
      const data = await examService.getResultCardData(session, child.id);
      return {
        id: child.id,
        name: child.name,
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        rollNumber: child.rollNumber,
        exams: data.exams.map((exam) => {
          const entries = data.marks.filter((m) => m.examId === exam.id);
          const obtained = entries.reduce((s, e) => s + e.obtainedMarks, 0);
          const outOf = entries.reduce((s, e) => s + e.totalMarks, 0);
          return { id: exam.id, name: exam.name, term: exam.term, endDate: exam.endDate, obtained, outOf, percentage: outOf ? Math.round((obtained / outOf) * 100) : 0 };
        }),
      };
    }),
  );

  return <ParentExamsClient childRows={rows} gradeBands={gradeBands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage }))} />;
}
