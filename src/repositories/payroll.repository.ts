import "server-only";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { payrollRuns, payslips, salaryProfiles, schools, staffLeaveRequests, staffUnpaidLeave, type NewPayslip, type NewSalaryProfile, type Payslip } from "@/db/schema";
import type { TaxSlab } from "@/lib/finance";

// -- Salary profiles --------------------------------------------------------
export async function listProfiles(schoolId: string) {
  return db.select().from(salaryProfiles).where(eq(salaryProfiles.schoolId, schoolId)).orderBy(asc(salaryProfiles.name));
}

export async function getProfile(schoolId: string, profileId: string) {
  const [row] = await db
    .select()
    .from(salaryProfiles)
    .where(and(eq(salaryProfiles.id, profileId), eq(salaryProfiles.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function createProfiles(rows: NewSalaryProfile[]) {
  if (rows.length === 0) return [];
  return db.insert(salaryProfiles).values(rows).returning();
}

export async function updateProfile(schoolId: string, profileId: string, input: Partial<NewSalaryProfile>) {
  const [row] = await db
    .update(salaryProfiles)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(salaryProfiles.id, profileId), eq(salaryProfiles.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

// -- Runs --------------------------------------------------------
export async function listRuns(schoolId: string) {
  return db.select().from(payrollRuns).where(eq(payrollRuns.schoolId, schoolId)).orderBy(desc(payrollRuns.month));
}

export async function getRun(schoolId: string, runId: string) {
  const [row] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function getRunByMonth(schoolId: string, month: string) {
  const [row] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.month, month)))
    .limit(1);
  return row ?? null;
}

export async function createRunWithPayslips(schoolId: string, month: string, createdBy: string, slips: Omit<NewPayslip, "runId">[]) {
  return db.transaction(async (tx) => {
    const [run] = await tx.insert(payrollRuns).values({ schoolId, month, createdBy }).returning();
    if (slips.length) await tx.insert(payslips).values(slips.map((s) => ({ ...s, runId: run.id })));
    return run;
  });
}

/** Only a draft run can be finalized; returns null if it wasn't (already finalized, or gone). */
export async function finalizeRun(schoolId: string, runId: string, userId: string) {
  const [row] = await db
    .update(payrollRuns)
    .set({ status: "finalized", finalizedBy: userId, finalizedAt: new Date() })
    .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "draft")))
    .returning();
  return row ?? null;
}

export async function deleteDraftRun(schoolId: string, runId: string) {
  const [row] = await db
    .delete(payrollRuns)
    .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "draft")))
    .returning();
  return row ?? null;
}

// -- Payslips --------------------------------------------------------
export async function listPayslipsForRuns(runIds: string[]) {
  if (runIds.length === 0) return [];
  return db.select().from(payslips).where(inArray(payslips.runId, runIds)).orderBy(asc(payslips.name));
}

export async function getPayslip(payslipId: string) {
  const [row] = await db.select().from(payslips).where(eq(payslips.id, payslipId)).limit(1);
  return row ?? null;
}

export async function updatePayslip(payslipId: string, input: Partial<Payslip>) {
  const [row] = await db.update(payslips).set(input).where(eq(payslips.id, payslipId)).returning();
  return row ?? null;
}

/** Marks unpaid payslips of one run as paid. Returns the rows actually changed (already-paid ones are skipped). */
export async function markPaid(runId: string, payslipIds: string[], paid: { paidDate: string; method: Payslip["method"]; reference: string | null; paidBy: string }) {
  if (payslipIds.length === 0) return [];
  return db
    .update(payslips)
    .set({ status: "paid", ...paid })
    .where(and(eq(payslips.runId, runId), inArray(payslips.id, payslipIds), eq(payslips.status, "unpaid")))
    .returning();
}

// -- Tax brackets (stored on the school) --------------------------------------------------------
export async function getTaxSlabs(schoolId: string): Promise<TaxSlab[] | null> {
  const [row] = await db.select({ slabs: schools.incomeTaxSlabs }).from(schools).where(eq(schools.id, schoolId)).limit(1);
  return row?.slabs ?? null;
}

export async function setTaxSlabs(schoolId: string, slabs: TaxSlab[] | null) {
  await db.update(schools).set({ incomeTaxSlabs: slabs }).where(eq(schools.id, schoolId));
}

// -- Staff unpaid leave (recorded on the Salaries page) --------------------------------------------------------
export async function listStaffUnpaidLeave(schoolId: string) {
  return db.select().from(staffUnpaidLeave).where(eq(staffUnpaidLeave.schoolId, schoolId)).orderBy(desc(staffUnpaidLeave.startDate));
}

export async function createStaffUnpaidLeave(input: typeof staffUnpaidLeave.$inferInsert) {
  const [row] = await db.insert(staffUnpaidLeave).values(input).returning();
  return row;
}

export async function deleteStaffUnpaidLeave(schoolId: string, id: string) {
  const [row] = await db.delete(staffUnpaidLeave).where(and(eq(staffUnpaidLeave.id, id), eq(staffUnpaidLeave.schoolId, schoolId))).returning();
  return row ?? null;
}

/** Recorded unpaid leave overlapping [from, to] for these salary profiles. */
export async function listStaffUnpaidLeaveInRange(profileIds: string[], from: string, to: string) {
  if (profileIds.length === 0) return [];
  return db
    .select()
    .from(staffUnpaidLeave)
    .where(and(inArray(staffUnpaidLeave.profileId, profileIds), lte(staffUnpaidLeave.startDate, to), gte(staffUnpaidLeave.endDate, from)));
}

// -- Unpaid leave --------------------------------------------------------
/** Approved unpaid leave overlapping [from, to] for these teachers. */
export async function listUnpaidLeave(teacherIds: string[], from: string, to: string) {
  if (teacherIds.length === 0) return [];
  return db
    .select()
    .from(staffLeaveRequests)
    .where(
      and(
        inArray(staffLeaveRequests.teacherId, teacherIds),
        eq(staffLeaveRequests.type, "unpaid"),
        eq(staffLeaveRequests.status, "approved"),
        lte(staffLeaveRequests.startDate, to),
        gte(staffLeaveRequests.endDate, from),
      ),
    );
}
