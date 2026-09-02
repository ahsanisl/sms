import * as examService from "@/services/exam.service";
import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { ExamsClient } from "@/app/(app)/exams/exams-client";
import type { ExamStatus } from "@/lib/types";

export default async function ExamsPage() {
  const session = await requireSession();
  const [exams, classes, students, canPublish] = await Promise.all([
    examService.listExams(session),
    classService.listClasses(session),
    studentService.listStudents(session),
    can(session.role, "examsCreate"),
  ]);

  const classLabelById = new Map(classes.map((c) => [c.id, `${c.grade}-${c.section}`]));

  const completedExams = exams.filter((e) => e.status === "completed");
  const marksByExam = await Promise.all(completedExams.map((e) => examService.listMarksForExam(session, e.id)));
  const marksByExamId = new Map(completedExams.map((e, i) => [e.id, marksByExam[i]]));

  let pendingMarksCount = 0;
  for (const exam of completedExams) {
    const marks = marksByExamId.get(exam.id) ?? [];
    for (const classId of exam.classIds) {
      const roster = students.filter((s) => s.classId === classId && s.status === "active");
      const hasAllMarks = roster.every((s) => marks.some((m) => m.studentId === s.id));
      if (!hasAllMarks) pendingMarksCount++;
    }
  }

  return (
    <ExamsClient
      exams={exams.map((e) => ({
        id: e.id,
        name: e.name,
        term: e.term,
        classIds: e.classIds,
        startDate: e.startDate,
        endDate: e.endDate,
        status: e.status as ExamStatus,
        resultsPublished: e.resultsPublished,
      }))}
      classLabelById={classLabelById}
      pendingMarksCount={pendingMarksCount}
      canPublish={canPublish}
    />
  );
}
