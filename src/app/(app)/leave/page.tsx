import * as leaveService from "@/services/leave.service";
import * as teacherService from "@/services/teacher.service";
import * as campusService from "@/services/campus.service";
import * as userService from "@/services/user.service";
import { requireSession } from "@/lib/tenancy";
import { LeaveClient } from "@/app/(app)/leave/leave-client";

export default async function LeavePage() {
  const session = await requireSession();

  if (session.role === "teacher") {
    const requests = await leaveService.listMyLeaveRequests(session);
    const rows = requests.map((r) => ({
      id: r.id,
      teacherName: "",
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason,
      status: r.status,
      reviewedByName: undefined,
      reviewNote: r.reviewNote ?? undefined,
    }));
    return <LeaveClient view="teacher" requests={rows} isAllCampuses={false} />;
  }

  const [requests, teachers, campuses, users] = await Promise.all([
    leaveService.listLeaveRequests(session),
    teacherService.listTeachers(session),
    campusService.listCampuses(session),
    userService.listUsersBySchool(session),
  ]);
  const teacherNameById = new Map(teachers.map((t) => [t.id, t.name]));
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  const rows = requests.map((r) => ({
    id: r.id,
    teacherName: teacherNameById.get(r.teacherId) ?? "Unknown Teacher",
    type: r.type,
    startDate: r.startDate,
    endDate: r.endDate,
    reason: r.reason,
    status: r.status,
    reviewedByName: r.reviewedBy ? (userNameById.get(r.reviewedBy) ?? "Staff") : undefined,
    reviewNote: r.reviewNote ?? undefined,
  }));

  return <LeaveClient view="admin" requests={rows} isAllCampuses={campuses.length > 1 && session.role !== "campus_admin"} />;
}
