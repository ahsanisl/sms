import "server-only";
import * as homeworkRepo from "@/repositories/homework.repository";
import * as classRepo from "@/repositories/classes.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import * as attachmentRepo from "@/repositories/attachments.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, type AuthSession } from "@/lib/tenancy";
import { GradeSubmissionSchema, HomeworkInputSchema, SubmitHomeworkSchema } from "@/lib/validation/homework";
import { logAudit } from "@/services/audit.service";
import { assertStudentAccessible, assertTeacherTeachesClassSubject, scopedCampusIds } from "@/services/scope";
import * as attachmentService from "@/services/attachment.service";
import * as studentService from "@/services/student.service";

const HOMEWORK_MODULE = "homework";
const SUBMISSION_MODULE = "homework_submission";

async function assertClassInScope(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  return cls;
}

/** Every class id within the caller's campus scope — homework.repository's functions filter by classId directly (not campusId, since homework has no campusId column of its own), so callers must resolve this first. */
async function scopedClassIds(session: AuthSession): Promise<string[]> {
  const campusIds = await scopedCampusIds(session);
  const classes = await classRepo.listClasses(campusIds);
  return classes.map((c) => c.id);
}

/** A teacher's own session.teacherId always wins — an admin picks who it's attributed to, validated against the class's campus. Same shape as classwork.service.ts's version. */
async function resolveTeacherId(session: AuthSession, campusId: string, submittedTeacherId?: string): Promise<string> {
  if (session.role === "teacher") {
    if (!session.teacherId) throw new PermissionError("homeworkCreate");
    return session.teacherId;
  }
  if (!submittedTeacherId) throw new Error("Select which teacher this is for.");
  const teacher = await teacherRepo.getTeacher([campusId], submittedTeacherId);
  if (!teacher) throw new NotFoundError("Teacher");
  return teacher.id;
}

/** Staff-only list — requires "homework", which a parent never holds (same shape as "exams"/"classwork"). */
export async function listHomework(session: AuthSession, classId?: string) {
  await requirePermission(session, "homework");
  const campusIds = await scopedCampusIds(session);
  const classes = await classRepo.listClasses(campusIds);
  const classIds = classId ? classes.filter((c) => c.id === classId).map((c) => c.id) : classes.map((c) => c.id);
  return homeworkRepo.listHomeworkForClasses(classIds);
}

/** Parent-only: every homework assigned to their own children's classes — no role-permission gate, ownership via listMyChildren. */
export async function listHomeworkForParent(session: AuthSession) {
  if (session.role !== "parent") throw new PermissionError("homework");
  const children = await studentService.listMyChildren(session);
  return homeworkRepo.listHomeworkForClasses(children.map((c) => c.classId));
}

/**
 * Single read used by the staff detail page, the parent portal detail page,
 * AND the /api/files ownership check — branches internally by role instead
 * of a blanket permission gate, exactly like exam.service.getResultCardData
 * (see the Curriculum/Classwork fix earlier this round for why that
 * distinction matters). For a parent, also folds in their own child's
 * submission so the portal page needs only one call.
 */
export async function getHomeworkWithStatus(session: AuthSession, homeworkId: string) {
  if (session.role === "parent") {
    const rows = await listHomeworkForParent(session);
    const hw = rows.find((r) => r.id === homeworkId);
    if (!hw) throw new NotFoundError("Homework");
    const children = await studentService.listMyChildren(session);
    const child = children.find((c) => c.classId === hw.classId);
    const submission = child ? await homeworkRepo.getSubmission(homeworkId, child.id) : null;
    return { homework: hw, submission, studentId: child?.id ?? null };
  }
  await requirePermission(session, "homework");
  const hw = await homeworkRepo.getHomework(await scopedClassIds(session), homeworkId);
  if (!hw) throw new NotFoundError("Homework");
  return { homework: hw, submission: null, studentId: null };
}

/** Backs the /api/files ownership check for a "homework_submission" attachment — resolves the submission back to its homework, then reuses the exact same check as viewing that homework would. */
export async function getSubmissionOwnerCheck(session: AuthSession, submissionId: string) {
  const submission = await homeworkRepo.getSubmissionById(submissionId);
  if (!submission) throw new NotFoundError("Submission");
  return getHomeworkWithStatus(session, submission.homeworkId);
}

export async function createHomework(session: AuthSession, input: unknown) {
  await requirePermission(session, "homeworkCreate");
  const data = HomeworkInputSchema.parse(input);
  const cls = await assertClassInScope(session, data.classId);
  await assertTeacherTeachesClassSubject(session, data.classId, data.subjectId);
  const teacherId = await resolveTeacherId(session, cls.campusId, data.teacherId);

  const created = await homeworkRepo.createHomework({
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId,
    title: data.title,
    description: data.description,
    assignedDate: data.assignedDate,
    dueDate: data.dueDate,
  });
  await logAudit(session, "homework.created", "Homework", created.id);
  return created;
}

export async function updateHomework(session: AuthSession, homeworkId: string, input: unknown) {
  await requirePermission(session, "homeworkCreate");
  const data = HomeworkInputSchema.parse(input);
  const cls = await assertClassInScope(session, data.classId);
  await assertTeacherTeachesClassSubject(session, data.classId, data.subjectId);
  const teacherId = await resolveTeacherId(session, cls.campusId, data.teacherId);

  const updated = await homeworkRepo.updateHomework(await scopedClassIds(session), homeworkId, {
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId,
    title: data.title,
    description: data.description,
    assignedDate: data.assignedDate,
    dueDate: data.dueDate,
  });
  if (!updated) throw new NotFoundError("Homework");
  await logAudit(session, "homework.updated", "Homework", homeworkId);
  return updated;
}

export async function deleteHomework(session: AuthSession, homeworkId: string) {
  await requirePermission(session, "homeworkCreate");
  const classIds = await scopedClassIds(session);
  const existing = await homeworkRepo.getHomework(classIds, homeworkId);
  if (!existing) throw new NotFoundError("Homework");
  for (const attachment of await attachmentRepo.listAttachments(HOMEWORK_MODULE, homeworkId)) {
    await attachmentService.deleteAttachment(session, attachment.id);
  }
  for (const submission of await homeworkRepo.listSubmissions(homeworkId)) {
    for (const attachment of await attachmentRepo.listAttachments(SUBMISSION_MODULE, submission.id)) {
      await attachmentService.deleteAttachment(session, attachment.id);
    }
  }
  await homeworkRepo.deleteHomework(classIds, homeworkId);
  await logAudit(session, "homework.deleted", "Homework", homeworkId);
}

export async function addAttachment(session: AuthSession, homeworkId: string, file: File) {
  await requirePermission(session, "homeworkCreate");
  const existing = await homeworkRepo.getHomework(await scopedClassIds(session), homeworkId);
  if (!existing) throw new NotFoundError("Homework");
  return attachmentService.saveAttachment(session, HOMEWORK_MODULE, homeworkId, file);
}

export async function listAttachments(session: AuthSession, homeworkId: string) {
  await getHomeworkWithStatus(session, homeworkId); // throws if not viewable, staff or parent
  return attachmentService.listAttachments(session, HOMEWORK_MODULE, homeworkId);
}

export async function listSubmissionAttachments(session: AuthSession, submissionId: string) {
  await getSubmissionOwnerCheck(session, submissionId); // throws if not viewable, staff or parent
  return attachmentService.listAttachments(session, SUBMISSION_MODULE, submissionId);
}

/**
 * Every roster student's submission status for one homework, including
 * students with no row yet (derived "not_submitted") — backs the teacher's
 * review table. No row is pre-created per student when homework is posted,
 * see homework.repository.ts.
 */
export async function listSubmissionsWithRoster(session: AuthSession, homeworkId: string) {
  await requirePermission(session, "homeworkCreate");
  const hw = await homeworkRepo.getHomework(await scopedClassIds(session), homeworkId);
  if (!hw) throw new NotFoundError("Homework");
  const [allStudents, submissions] = await Promise.all([
    studentService.listStudents(session),
    homeworkRepo.listSubmissions(homeworkId),
  ]);
  const roster = allStudents.filter((s) => s.classId === hw.classId && s.status === "active");
  const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
  return roster.map((student) => ({ student, submission: byStudent.get(student.id) ?? null }));
}

/** Parent/student-initiated — ownership-checked via assertStudentAccessible, not gated by any staff permission module (mirrors attendance-correction requests). */
export async function submitHomework(session: AuthSession, homeworkId: string, studentId: string, input: unknown, file?: File) {
  if (session.role !== "parent") throw new PermissionError("homework");
  await assertStudentAccessible(session, studentId);

  const hw = await homeworkRepo.getHomeworkById(homeworkId);
  if (!hw) throw new NotFoundError("Homework");
  const children = await studentService.listMyChildren(session);
  const child = children.find((c) => c.id === studentId);
  if (!child || child.classId !== hw.classId) throw new NotFoundError("Homework");

  const data = SubmitHomeworkSchema.parse(input);
  const submission = await homeworkRepo.upsertSubmission({
    homeworkId,
    studentId,
    status: "submitted",
    submissionText: data.submissionText,
    submittedAt: new Date(),
  });
  if (file) {
    await attachmentService.saveAttachment(session, SUBMISSION_MODULE, submission.id, file);
  }
  await logAudit(session, "homework.submitted", "HomeworkSubmission", submission.id);
  return submission;
}

export async function gradeSubmission(session: AuthSession, submissionId: string, input: unknown) {
  await requirePermission(session, "homeworkCreate");
  const submission = await homeworkRepo.getSubmissionById(submissionId);
  if (!submission) throw new NotFoundError("Submission");
  const hw = await homeworkRepo.getHomeworkById(submission.homeworkId);
  if (!hw) throw new NotFoundError("Homework");
  await assertClassInScope(session, hw.classId);
  await assertTeacherTeachesClassSubject(session, hw.classId, hw.subjectId);

  const data = GradeSubmissionSchema.parse(input);
  const graded = await homeworkRepo.gradeSubmission(submissionId, { grade: data.grade, teacherComment: data.teacherComment, gradedBy: session.userId });
  await logAudit(session, "homework.graded", "HomeworkSubmission", submissionId);
  return graded;
}
