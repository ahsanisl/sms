import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import * as homeworkService from "@/services/homework.service";
import { requireSession } from "@/lib/tenancy";
import { ParentHomeworkDetailClient } from "@/app/(app)/portal/homework/[id]/homework-detail-client";

export default async function ParentHomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const { homework, submission, studentId } = await homeworkService.getHomeworkWithStatus(session, id);
  const [attachments, submissionAttachments, classes, subjects, teachers] = await Promise.all([
    homeworkService.listAttachments(session, id),
    submission ? homeworkService.listSubmissionAttachments(session, submission.id) : Promise.resolve([]),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
  ]);

  const cls = classes.find((c) => c.id === homework.classId);
  const subject = subjects.find((s) => s.id === homework.subjectId);
  const teacher = teachers.find((t) => t.id === homework.teacherId);

  return (
    <ParentHomeworkDetailClient
      homeworkId={homework.id}
      studentId={studentId ?? ""}
      title={homework.title}
      description={homework.description}
      classLabel={cls ? `${cls.grade}-${cls.section}` : "—"}
      subjectName={subject?.name ?? "—"}
      teacherName={teacher?.name ?? "—"}
      assignedDate={homework.assignedDate}
      dueDate={homework.dueDate}
      attachments={attachments.map((a) => ({ id: a.id, fileName: a.fileName }))}
      submission={
        submission
          ? {
              status: submission.status,
              submissionText: submission.submissionText,
              submittedAt: submission.submittedAt.toISOString(),
              grade: submission.grade ?? "",
              teacherComment: submission.teacherComment ?? "",
              attachments: submissionAttachments.map((a) => ({ id: a.id, fileName: a.fileName })),
            }
          : null
      }
    />
  );
}
