import * as examService from "@/services/exam.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as schoolService from "@/services/school.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { ResultCardClient } from "@/app/(app)/exams/results/[id]/result-card-client";

export default async function StudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let data;
  try {
    data = await examService.getResultCardData(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="person_off" title="Student not found" description="It may have been removed, or you don't have access to it." />
          <Link href="/exams" className="text-label-md text-secondary hover:underline">
            Back to Exams
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [classes, subjects, gradeBands, school] = await Promise.all([
    classService.listClasses(session),
    subjectService.listSubjects(session),
    examService.listGradeBands(session),
    schoolService.getMySchool(session).catch(() => null),
  ]);

  const cls = classes.find((c) => c.id === data.student.classId);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const canSeeUnpublished = session.role !== "parent";

  const examOptions = data.exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    term: exam.term,
    startDate: exam.startDate,
    passingMarks: exam.passingMarks,
    resultsPublished: exam.resultsPublished,
    entries: data.marks
      .filter((m) => m.examId === exam.id)
      .map((m) => ({ id: m.id, subjectId: m.subjectId, subjectName: subjectById.get(m.subjectId)?.name ?? "Subject", obtainedMarks: m.obtainedMarks, totalMarks: m.totalMarks })),
  }));

  return (
    <ResultCardClient
      studentName={data.student.name}
      classLabel={cls ? `${cls.grade}-${cls.section}` : ""}
      rollNumber={data.student.rollNumber}
      exams={examOptions}
      canSeeUnpublished={canSeeUnpublished}
      gradeBands={gradeBands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage }))}
      schoolName={school?.name ?? "School"}
      schoolTagline={school?.tagline ?? ""}
      schoolAddress={school?.address ?? ""}
      schoolLogoEmoji={school?.logoEmoji ?? "🎓"}
      showSignatureLines={school?.showSignatureLines ?? true}
      reportCardFooter={school?.reportCardFooter ?? ""}
    />
  );
}
