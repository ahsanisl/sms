import "server-only";
import * as leaveRepo from "@/repositories/leaves.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, type AuthSession } from "@/lib/tenancy";
import { LeaveRequestInputSchema, ReviewLeaveRequestSchema } from "@/lib/validation/leave";
import { logAudit } from "@/services/audit.service";
import { scopedCampusIds } from "@/services/scope";

/** A teacher's own leave history — "My Leave" view. */
export async function listMyLeaveRequests(session: AuthSession) {
  await requirePermission(session, "leave");
  if (!session.teacherId) throw new PermissionError("leave");
  return leaveRepo.listByTeacher(session.teacherId);
}

export async function requestLeave(session: AuthSession, input: unknown) {
  await requirePermission(session, "leave");
  if (!session.teacherId) throw new PermissionError("leave");
  const data = LeaveRequestInputSchema.parse(input);
  const request = await leaveRepo.createLeaveRequest({ ...data, teacherId: session.teacherId });
  await logAudit(session, "leave.requested", "StaffLeaveRequest", request.id);
  return request;
}

/**
 * Admin / Campus Admin / Owner approval queue — scoped to teachers within the
 * caller's own campus scope, same as every other campus-scoped list. Never
 * callable by a teacher (they get listMyLeaveRequests instead) — the mock UI
 * never renders this view for a teacher session, and the server must not
 * rely on that alone.
 */
export async function listLeaveRequests(session: AuthSession) {
  await requirePermission(session, "leave");
  if (session.role === "teacher") throw new PermissionError("leave");
  const campusIds = await scopedCampusIds(session);
  const teachers = await teacherRepo.listTeachers(campusIds);
  return leaveRepo.listByTeachers(teachers.map((t) => t.id));
}

/** Approve/reject — never a teacher action, and the target teacher must be within the caller's own campus scope. */
export async function reviewLeaveRequest(session: AuthSession, requestId: string, input: unknown) {
  await requirePermission(session, "leave");
  if (session.role === "teacher") throw new PermissionError("leave");
  const { status, reviewNote } = ReviewLeaveRequestSchema.parse(input);

  const request = await leaveRepo.getLeaveRequest(requestId);
  if (!request) throw new NotFoundError("Leave request");
  const campusIds = await scopedCampusIds(session);
  const teacher = await teacherRepo.getTeacher(campusIds, request.teacherId);
  if (!teacher) throw new NotFoundError("Leave request");

  const reviewed = await leaveRepo.reviewLeaveRequest(requestId, status, session.userId, reviewNote);
  if (!reviewed) throw new NotFoundError("Leave request");
  await logAudit(session, "leave.reviewed", "StaffLeaveRequest", requestId, { status });
  return reviewed;
}
