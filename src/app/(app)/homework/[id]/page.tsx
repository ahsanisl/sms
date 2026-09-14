import * as homeworkService from "@/services/homework.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { HomeworkDetailClient } from "@/app/(app)/homework/[id]/homework-detail-client";

export default async function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const [{ homework }, attachments, classes, subjects, teachers, canManage] = await Promise.all([
    homeworkService.getHomeworkWithStatus(session, id),
    homeworkService.listAttachments(session, id),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
    can(session.role, "homeworkCreate"),
  ]);

  const cls = classes.find((c) => c.id === homework.classId);
  const subject = subjects.find((s) => s.id === homework.subjectId);
  const teacher = teachers.find((t) => t.id === homework.teacherId);

  const submissions = canManage ? await homeworkService.listSubmissionsWithRoster(session, id) : [];
  const submissionAttachmentEntries = canManage
    ? await Promise.all(
        submissions
          .filter((s) => s.submission)
          .map(async (s) => [s.submission!.id, await homeworkService.listSubmissionAttachments(session, s.submission!.id)] as const),
      )
    : [];
  const submissionAttachments = Object.fromEntries(
    submissionAttachmentEntries.map(([submissionId, rows]) => [submissionId, rows.map((a) => ({ id: a.id, fileName: a.fileName }))]),
  );

  return (
    <HomeworkDetailClient
      homework={{
        id: homework.id,
        title: homework.title,
        description: homework.description,
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        classId: homework.classId,
        subjectId: homework.subjectId,
        subjectName: subject?.name ?? "—",
        teacherId: homework.teacherId,
        teacherName: teacher?.name ?? "—",
        assignedDate: homework.assignedDate,
        dueDate: homework.dueDate,
      }}
      attachments={attachments.map((a) => ({ id: a.id, fileName: a.fileName, sizeBytes: a.sizeBytes }))}
      canManage={canManage}
      isTeacher={session.role === "teacher"}
      classes={classes.filter((c) => c.status === "active").map((c) => ({ id: c.id, label: `${c.grade}-${c.section}`, subjectIds: c.subjectIds, campusId: c.campusId }))}
      subjects={subjects.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: s.name }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.name, campusId: t.campusId }))}
      submissions={submissions.map(({ student, submission }) => ({
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        status: submission?.status ?? "not_submitted",
        submissionText: submission?.submissionText ?? "",
        submittedAt: submission?.submittedAt ? submission.submittedAt.toISOString() : "",
        grade: submission?.grade ?? "",
        teacherComment: submission?.teacherComment ?? "",
        submissionId: submission?.id ?? null,
      }))}
      submissionAttachments={submissionAttachments}
    />
  );
}
