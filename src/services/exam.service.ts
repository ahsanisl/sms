import "server-only";
import * as examRepo from "@/repositories/exams.repository";
import * as studentRepo from "@/repositories/students.repository";
import * as userRepo from "@/repositories/users.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import { EnterMarksBulkSchema, ExamInputSchema } from "@/lib/validation/exam";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

/**
 * /exams/results/[id] is one of lib/permissions.ts's ALWAYS_ALLOWED_PREFIXES
 * (a single-record, read-mostly result card both admin pages and the future
 * Parent portal link into), so — same reasoning as fee.service's
 * assertStudentInScope — ownership is the real access boundary here, not a
 * role's blanket "exams" permission. A parent has no campusId of their own,
 * so their access is checked against parentChildren instead of campus
 * membership; everyone else keeps the normal campus-scoped lookup.
 */
async function getAccessibleStudent(session: AuthSession, studentId: string) {
  if (session.role === "parent") {
    const children = await userRepo.listChildrenForParent(session.userId);
    if (!children.some((c) => c.studentId === studentId)) throw new NotFoundError("Student");
    const student = await studentRepo.getStudentById(studentId);
    if (!student) throw new NotFoundError("Student");
    return student;
  }
  const campusIds = await scopedCampusIds(session);
  const student = await studentRepo.getStudent(campusIds, studentId);
  if (!student) throw new NotFoundError("Student");
  return student;
}

/** The result card's own combined read: the student record plus every exam (with marks) they have — published-only for parents, all for staff. */
export async function getResultCardData(session: AuthSession, studentId: string) {
  const student = await getAccessibleStudent(session, studentId);
  const campusIds = await scopedCampusIds(session);
  const [allExams, marks] = await Promise.all([examRepo.listExams(campusIds), examRepo.listMarksForStudent(studentId)]);
  const canSeeUnpublished = session.role !== "parent";
  const studentExams = allExams.filter((e) => (canSeeUnpublished || e.resultsPublished) && marks.some((m) => m.examId === e.id));
  return { student, exams: studentExams, marks };
}

export async function listExams(session: AuthSession) {
  await requirePermission(session, "exams");
  const campusIds = await scopedCampusIds(session);
  return examRepo.listExams(campusIds);
}

export async function getExam(session: AuthSession, examId: string) {
  await requirePermission(session, "exams");
  const campusIds = await scopedCampusIds(session);
  const exam = await examRepo.getExam(campusIds, examId);
  if (!exam) throw new NotFoundError("Exam");
  return exam;
}

export async function createExam(session: AuthSession, input: unknown) {
  await requirePermission(session, "examsCreate");
  const data = ExamInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const { campusId, classIds, subjectIds, ...rest } = data;
  // Status is set once at creation from today's date, same one-time heuristic
  // the mock used — nothing auto-transitions an exam through scheduled →
  // ongoing → completed afterward (in either the mock or here); an admin
  // would need an explicit "mark completed" action for that, which neither
  // version has.
  const today = new Date();
  const status = today < new Date(data.startDate) ? "scheduled" : today > new Date(data.endDate) ? "completed" : "ongoing";
  const exam = await examRepo.createExam(campusId, { ...rest, status }, classIds, subjectIds);
  await logAudit(session, "exam.created", "Exam", exam.id);
  return exam;
}

/** Teacher: enters marks — always lands in DRAFT, never visible to parents regardless of the exam's overall publish state. */
export async function enterMarksBulk(session: AuthSession, input: unknown) {
  await requirePermission(session, "examsMarks");
  const entries = EnterMarksBulkSchema.parse(input);
  await examRepo.enterMarksBulk(entries);
  await logAudit(session, "marks.entered", "MarksEntry", undefined, { examId: entries[0]?.examId, count: entries.length });
}

/** Teacher: done entering, hands off for admin review — still not visible to parents. */
export async function submitMarksForReview(session: AuthSession, examId: string) {
  await requirePermission(session, "examsMarks");
  await examRepo.setMarksStatusForExam(examId, "submitted");
  await logAudit(session, "marks.submitted", "Exam", examId);
}

/** Admin: publish — the only action that makes results visible to parents/students (spec §24). */
export async function publishResults(session: AuthSession, examId: string) {
  await requirePermission(session, "examsCreate");
  const schoolId = requireSchoolId(session);
  void schoolId;
  await examRepo.setMarksStatusForExam(examId, "published");
  await examRepo.setResultsPublished(examId, true);
  await logAudit(session, "marks.published", "Exam", examId);
}

/** Admin: reopen for correction — hides results again until re-published. */
export async function unpublishResults(session: AuthSession, examId: string) {
  await requirePermission(session, "examsCreate");
  await examRepo.setMarksStatusForExam(examId, "submitted");
  await examRepo.setResultsPublished(examId, false);
  await logAudit(session, "marks.unpublished", "Exam", examId);
}

export async function listMarksForExam(session: AuthSession, examId: string) {
  await requirePermission(session, "examsMarks");
  return examRepo.listMarksForExam(examId);
}

/** Parents/students only ever call this — results are already pre-filtered to published exams by the caller checking exam.resultsPublished first. */
export async function listMarksForStudent(session: AuthSession, studentId: string) {
  await requirePermission(session, "exams");
  return examRepo.listMarksForStudent(studentId);
}

/** Reports Center's cross-exam aggregates — needs marks scoped by campus, not one exam or one student. */
export async function listMarksForExams(session: AuthSession, examIds: string[]) {
  await requirePermission(session, "reports");
  return examRepo.listMarksForExams(examIds);
}

export async function listGradeBands(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  return examRepo.listGradeBands(schoolId);
}

export async function setGradeBands(session: AuthSession, bands: { grade: string; minPercentage: number }[]) {
  await requirePermission(session, "settings");
  const schoolId = requireSchoolId(session);
  await examRepo.setGradeBands(schoolId, bands);
  await logAudit(session, "grade_scale.updated", "GradeBand", schoolId);
}
