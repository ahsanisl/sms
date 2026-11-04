import * as payrollService from "@/services/payroll.service";
import * as campusService from "@/services/campus.service";
import * as userService from "@/services/user.service";
import { requireSession } from "@/lib/tenancy";
import { RunClient } from "@/app/(app)/payroll/[runId]/run-client";

export default async function PayrollRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const [session, { runId }] = await Promise.all([requireSession(), params]);
  const [{ run, payslips }, campuses, users, profiles] = await Promise.all([
    payrollService.getRun(session, runId),
    campusService.listCampuses(session),
    userService.listUsersBySchool(session),
    payrollService.listProfiles(session),
  ]);
  const campusName = new Map(campuses.map((c) => [c.id, c.name]));
  const bankAccount = new Map(profiles.map((p) => [p.id, p.bankAccount]));
  const finalizedBy = run.finalizedBy ? users.find((u) => u.id === run.finalizedBy)?.name : undefined;

  return (
    <RunClient
      run={{ id: run.id, month: run.month, status: run.status, finalizedBy, finalizedAt: run.finalizedAt?.toISOString() }}
      payslips={payslips.map((p) => ({
        id: p.id,
        name: p.name,
        designation: p.designation,
        campusName: p.campusId ? (campusName.get(p.campusId) ?? "—") : "Whole school",
        basicSalary: p.basicSalary,
        allowances: p.allowances,
        fixedDeductions: p.fixedDeductions,
        unpaidLeaveDays: p.unpaidLeaveDays,
        leaveDeduction: p.leaveDeduction,
        bonus: p.bonus,
        otherDeduction: p.otherDeduction,
        incomeTax: p.incomeTax,
        netPay: p.netPay,
        note: p.note,
        status: p.status,
        paidDate: p.paidDate ?? undefined,
        method: p.method ?? undefined,
        bankAccount: bankAccount.get(p.profileId) ?? "",
      }))}
      canManage={session.role !== "campus_admin"}
    />
  );
}
