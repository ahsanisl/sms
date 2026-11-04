import * as payrollService from "@/services/payroll.service";
import * as teacherService from "@/services/teacher.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { PayrollClient, type ProfileRow, type RunRow } from "@/app/(app)/payroll/payroll-client";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const [runs, profiles, teachers, campuses, taxSlabs, unpaidLeave] = await Promise.all([
    payrollService.listRuns(session),
    payrollService.listProfiles(session),
    teacherService.listTeachers(session),
    campusService.listCampuses(session),
    payrollService.getTaxSlabs(session),
    payrollService.listStaffUnpaidLeave(session),
  ]);
  const campusName = new Map(campuses.map((c) => [c.id, c.name]));

  const runRows: RunRow[] = runs.map((r) => ({
    id: r.id,
    month: r.month,
    status: r.status,
    staffCount: r.staffCount,
    totalNet: r.totalNet,
    paidNet: r.paidNet,
    paidCount: r.paidCount,
  }));
  const profileRows: ProfileRow[] = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    designation: p.designation,
    campusId: p.campusId ?? "",
    campusName: p.campusId ? (campusName.get(p.campusId) ?? "—") : "Whole school",
    teacherId: p.teacherId ?? "",
    basicSalary: p.basicSalary,
    allowances: p.allowances,
    deductions: p.deductions,
    bankAccount: p.bankAccount,
    autoIncomeTax: p.autoIncomeTax,
    status: p.status,
  }));
  const linkedTeacherIds = new Set(profiles.filter((p) => p.status === "active" && p.teacherId).map((p) => p.teacherId));

  return (
    <PayrollClient
      initialTab={params.tab === "staff" || params.tab === "tax" ? params.tab : "runs"}
      taxSlabs={taxSlabs}
      unpaidLeave={unpaidLeave.map((l) => ({ id: l.id, profileId: l.profileId, name: profiles.find((p) => p.id === l.profileId)?.name ?? "—", startDate: l.startDate, endDate: l.endDate, note: l.note }))}
      runs={runRows}
      profiles={profileRows}
      teachers={teachers.filter((t) => t.status === "active").map((t) => ({ id: t.id, name: t.name, campusId: t.campusId, hasSalary: linkedTeacherIds.has(t.id) }))}
      campuses={campuses.map((c) => ({ id: c.id, name: c.name }))}
      canManage={session.role !== "campus_admin"}
    />
  );
}
