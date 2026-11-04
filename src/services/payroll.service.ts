import "server-only";
import * as payrollRepo from "@/repositories/payroll.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import * as timetableRepo from "@/repositories/timetable.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { CreatePayrollRunInputSchema, MarkPayslipsPaidInputSchema, PayslipAdjustmentInputSchema, SalaryProfileInputSchema } from "@/lib/validation/payroll";
import { DEFAULT_WORKING_DAYS } from "@/lib/constants";
import { countWorkingDays, leaveDeductionFor, monthKeyLabel, monthRange, payslipTotals } from "@/lib/finance";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";
import type { Payslip, SalaryProfile } from "@/db/schema";

/**
 * Salaries. Each person on the payroll has a salary profile (standing
 * monthly pay); each month a payroll run copies those into payslips, deducts
 * approved unpaid leave, and lets the school adjust bonuses/deductions while
 * it's a draft. Finalizing locks the figures; payslips are then marked paid
 * as salaries go out — paid payslips are what the Income & Expenses report
 * counts as salary cost.
 *
 * Scope: payroll is run for the whole school. A campus-limited role that is
 * granted "payroll" (a Campus Admin, or a custom role based on it) can view
 * and mark paid only its own campus's payslips; setting salaries and running
 * or finalizing payroll needs whole-school access.
 */
const WHOLE_SCHOOL_ONLY = "Only staff with whole-school access can change salaries or run payroll.";

function campusLimit(session: AuthSession): string | null | undefined {
  // undefined = no limit; a string = that campus only.
  return session.role === "campus_admin" ? (session.campusId ?? "none") : undefined;
}

function assertWholeSchool(session: AuthSession) {
  if (campusLimit(session) !== undefined) throw new Error(WHOLE_SCHOOL_ONLY);
}

function visibleTo<T extends { campusId: string | null }>(session: AuthSession, rows: T[]): T[] {
  const limit = campusLimit(session);
  return limit === undefined ? rows : rows.filter((r) => r.campusId === limit);
}

async function workingDaysFor(schoolId: string): Promise<string[]> {
  const config = await timetableRepo.getConfig(schoolId);
  return config.workingDays.length ? config.workingDays : DEFAULT_WORKING_DAYS;
}

// -- Salary profiles --------------------------------------------------------
export async function listProfiles(session: AuthSession) {
  await requirePermission(session, "payroll");
  return visibleTo(session, await payrollRepo.listProfiles(requireSchoolId(session)));
}

async function resolveProfileInput(session: AuthSession, input: unknown, exceptProfileId?: string) {
  const schoolId = requireSchoolId(session);
  const data = SalaryProfileInputSchema.parse(input);
  if (data.teacherId) {
    const teacher = await teacherRepo.getTeacher(await scopedCampusIds(session), data.teacherId);
    if (!teacher) throw new NotFoundError("Teacher");
    const existing = await payrollRepo.listProfiles(schoolId);
    if (existing.some((p) => p.teacherId === data.teacherId && p.status === "active" && p.id !== exceptProfileId)) {
      throw new Error(`${teacher.name} already has a salary set up.`);
    }
    // A teacher's pay is booked to the campus they teach at.
    data.campusId ??= teacher.campusId;
  }
  if (data.campusId) await assertCampusInScope(session, data.campusId);
  return { schoolId, data };
}

export async function createProfile(session: AuthSession, input: unknown) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const { schoolId, data } = await resolveProfileInput(session, input);
  const [profile] = await payrollRepo.createProfiles([{ ...data, schoolId }]);
  await logAudit(session, "salary_profile.created", "SalaryProfile", profile.id, { name: profile.name, basicSalary: profile.basicSalary });
  return profile;
}

export async function updateProfile(session: AuthSession, profileId: string, input: unknown) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const existing = await payrollRepo.getProfile(requireSchoolId(session), profileId);
  if (!existing) throw new NotFoundError("Salary");
  const { schoolId, data } = await resolveProfileInput(session, input, profileId);
  const updated = await payrollRepo.updateProfile(schoolId, profileId, data);
  await logAudit(session, "salary_profile.updated", "SalaryProfile", profileId, {
    name: data.name,
    basicSalary: data.basicSalary,
    previousBasicSalary: existing.basicSalary,
  });
  return updated;
}

export async function setProfileArchived(session: AuthSession, profileId: string, archived: boolean) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const updated = await payrollRepo.updateProfile(requireSchoolId(session), profileId, { status: archived ? "archived" : "active" });
  if (!updated) throw new NotFoundError("Salary");
  await logAudit(session, archived ? "salary_profile.archived" : "salary_profile.restored", "SalaryProfile", profileId, { name: updated.name });
  return updated;
}

// -- Runs --------------------------------------------------------
export async function listRuns(session: AuthSession) {
  await requirePermission(session, "payroll");
  const runs = await payrollRepo.listRuns(requireSchoolId(session));
  const slips = visibleTo(session, await payrollRepo.listPayslipsForRuns(runs.map((r) => r.id)));
  return runs.map((run) => {
    const own = slips.filter((s) => s.runId === run.id);
    return {
      ...run,
      staffCount: own.length,
      totalNet: own.reduce((sum, s) => sum + s.netPay, 0),
      paidNet: own.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.netPay, 0),
      paidCount: own.filter((s) => s.status === "paid").length,
    };
  });
}

export async function getRun(session: AuthSession, runId: string) {
  await requirePermission(session, "payroll");
  const run = await payrollRepo.getRun(requireSchoolId(session), runId);
  if (!run) throw new NotFoundError("Payroll");
  const slips = visibleTo(session, await payrollRepo.listPayslipsForRuns([run.id]));
  return { run, payslips: slips };
}

/** Unpaid leave working-days for each teacher within the month. */
async function unpaidLeaveDays(teacherIds: string[], month: string, workingDays: string[]) {
  const { from, to } = monthRange(month);
  const leaves = await payrollRepo.listUnpaidLeave(teacherIds, from, to);
  const days = new Map<string, number>();
  for (const leave of leaves) {
    const start = leave.startDate < from ? from : leave.startDate;
    const end = leave.endDate > to ? to : leave.endDate;
    days.set(leave.teacherId, (days.get(leave.teacherId) ?? 0) + countWorkingDays(start, end, workingDays));
  }
  return days;
}

function payslipFor(profile: SalaryProfile, unpaidDays: number, workingDaysInMonth: number) {
  const leaveDeduction = leaveDeductionFor(profile.basicSalary, profile.allowances, unpaidDays, workingDaysInMonth);
  const amounts = {
    basicSalary: profile.basicSalary,
    allowances: profile.allowances,
    fixedDeductions: profile.deductions,
    leaveDeduction,
    bonus: 0,
    otherDeduction: 0,
  };
  return {
    profileId: profile.id,
    campusId: profile.campusId,
    name: profile.name,
    designation: profile.designation,
    ...amounts,
    unpaidLeaveDays: unpaidDays,
    netPay: payslipTotals(amounts).net,
  };
}

export async function createRun(session: AuthSession, input: unknown) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const schoolId = requireSchoolId(session);
  const { month } = CreatePayrollRunInputSchema.parse(input);
  if (await payrollRepo.getRunByMonth(schoolId, month)) throw new Error(`Payroll for ${monthKeyLabel(month)} has already been created.`);

  const profiles = (await payrollRepo.listProfiles(schoolId)).filter((p) => p.status === "active");
  if (profiles.length === 0) throw new Error("Nobody is on the payroll yet. Add staff salaries first.");

  const workingDays = await workingDaysFor(schoolId);
  const { from, to } = monthRange(month);
  const workingDaysInMonth = countWorkingDays(from, to, workingDays);
  const leaveDays = await unpaidLeaveDays(profiles.map((p) => p.teacherId).filter((id): id is string => !!id), month, workingDays);

  const run = await payrollRepo.createRunWithPayslips(
    schoolId,
    month,
    session.userId,
    profiles.map((p) => payslipFor(p, p.teacherId ? (leaveDays.get(p.teacherId) ?? 0) : 0, workingDaysInMonth)),
  );
  await logAudit(session, "payroll.created", "PayrollRun", run.id, { month, staff: profiles.length });
  return run;
}

async function getDraftPayslip(session: AuthSession, payslipId: string) {
  const schoolId = requireSchoolId(session);
  const payslip = await payrollRepo.getPayslip(payslipId);
  const run = payslip ? await payrollRepo.getRun(schoolId, payslip.runId) : null;
  if (!payslip || !run) throw new NotFoundError("Payslip");
  if (run.status !== "draft") throw new Error("This payroll has been finalized, so its payslips can't be changed.");
  return { payslip, run, schoolId };
}

export async function adjustPayslip(session: AuthSession, payslipId: string, input: unknown) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const { payslip, run, schoolId } = await getDraftPayslip(session, payslipId);
  const data = PayslipAdjustmentInputSchema.parse(input);
  const { from, to } = monthRange(run.month);
  const workingDaysInMonth = countWorkingDays(from, to, await workingDaysFor(schoolId));
  const leaveDeduction = leaveDeductionFor(payslip.basicSalary, payslip.allowances, data.unpaidLeaveDays, workingDaysInMonth);
  const amounts = { ...payslip, leaveDeduction, bonus: data.bonus, otherDeduction: data.otherDeduction };
  const updated = await payrollRepo.updatePayslip(payslipId, {
    unpaidLeaveDays: data.unpaidLeaveDays,
    leaveDeduction,
    bonus: data.bonus,
    otherDeduction: data.otherDeduction,
    note: data.note,
    netPay: payslipTotals(amounts).net,
  });
  await logAudit(session, "payslip.updated", "Payslip", payslipId, { name: payslip.name, month: run.month, netPay: updated?.netPay });
  return updated;
}

export async function finalizeRun(session: AuthSession, runId: string) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const run = await payrollRepo.finalizeRun(requireSchoolId(session), runId, session.userId);
  if (!run) throw new Error("This payroll is already finalized.");
  const slips = await payrollRepo.listPayslipsForRuns([runId]);
  await logAudit(session, "payroll.finalized", "PayrollRun", runId, { month: run.month, total: slips.reduce((s, p) => s + p.netPay, 0) });
  return run;
}

export async function deleteRun(session: AuthSession, runId: string) {
  await requirePermission(session, "payroll");
  assertWholeSchool(session);
  const deleted = await payrollRepo.deleteDraftRun(requireSchoolId(session), runId);
  if (!deleted) throw new Error("Only a draft payroll can be deleted.");
  await logAudit(session, "payroll.deleted", "PayrollRun", runId, { month: deleted.month });
}

export async function markPaid(session: AuthSession, runId: string, input: unknown) {
  await requirePermission(session, "payroll");
  const { run, payslips } = await getRun(session, runId); // already campus-filtered for campus-limited roles
  if (run.status !== "finalized") throw new Error("Finalize this payroll before marking salaries as paid.");
  const data = MarkPayslipsPaidInputSchema.parse(input);
  const allowedIds = new Set(payslips.map((p) => p.id));
  const ids = data.payslipIds.filter((id) => allowedIds.has(id));
  const changed = await payrollRepo.markPaid(run.id, ids, { paidDate: data.paidDate, method: data.method, reference: data.reference, paidBy: session.userId });
  if (changed.length === 0) throw new Error("Those salaries are already marked as paid.");
  await logAudit(session, "payslip.paid", "PayrollRun", run.id, {
    month: run.month,
    count: changed.length,
    total: changed.reduce((s, p) => s + p.netPay, 0),
    method: data.method,
  });
  return changed;
}

/** One payslip with its run, for the printable payslip page. */
export async function getPayslip(session: AuthSession, payslipId: string): Promise<{ payslip: Payslip; month: string; runStatus: "draft" | "finalized" }> {
  await requirePermission(session, "payroll");
  const payslip = await payrollRepo.getPayslip(payslipId);
  const run = payslip ? await payrollRepo.getRun(requireSchoolId(session), payslip.runId) : null;
  if (!payslip || !run || visibleTo(session, [payslip]).length === 0) throw new NotFoundError("Payslip");
  return { payslip, month: run.month, runStatus: run.status };
}
