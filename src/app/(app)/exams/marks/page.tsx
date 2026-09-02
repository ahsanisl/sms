import * as examService from "@/services/exam.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";
import { MarksClient } from "@/app/(app)/exams/marks/marks-client";

export default async function EnterMarksPage({ searchParams }: { searchParams: Promise<{ examId?: string; classId?: string }> }) {
  const { examId: requestedExamId, classId: requestedClassId } = await searchParams;
  const session = await requireSession();

  const [exams, classes, subjects, students] = await Promise.all([
    examService.listExams(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    studentService.listStudents(session),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const examId = requestedExamId && exams.some((e) => e.id === requestedExamId) ? requestedExamId : (exams[0]?.id ?? "");
  const activeExam = exams.find((e) => e.id === examId);

  const classOptions = (activeExam?.classIds ?? []).map((id) => classById.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const classId = requestedClassId && classOptions.some((c) => c.id === requestedClassId) ? requestedClassId : (classOptions[0]?.id ?? "");
  const cls = classById.get(classId);

  const subjectIds = (cls?.subjectIds ?? []).filter((sid) => activeExam?.subjectIds.includes(sid));
  const roster = students.filter((s) => s.classId === classId && s.status === "active");

  const existingMarks = activeExam ? await examService.listMarksForExam(session, activeExam.id) : [];
  const initialMarks: Record<string, number> = {};
  for (const m of existingMarks) {
    if (roster.some((s) => s.id === m.studentId) && subjectIds.includes(m.subjectId)) {
      initialMarks[`${m.studentId}|${m.subjectId}`] = m.obtainedMarks;
    }
  }

  return (
    <MarksClient
      key={`${examId}-${classId}`}
      exams={exams.map((e) => ({ id: e.id, name: e.name, term: e.term }))}
      examId={examId}
      examName={activeExam?.name ?? ""}
      totalMarks={activeExam?.totalMarks ?? 100}
      classOptions={classOptions.map((c) => ({ id: c.id, label: `${c.grade}-${c.section}` }))}
      classId={classId}
      classLabel={cls ? `${cls.grade}-${cls.section}` : ""}
      subjects={subjectIds.map((sid) => ({ id: sid, name: subjectById.get(sid)?.name ?? "Subject" }))}
      roster={roster.map((s) => ({ id: s.id, name: s.name }))}
      initialMarks={initialMarks}
    />
  );
}
