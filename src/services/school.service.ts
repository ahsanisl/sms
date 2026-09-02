import "server-only";
import bcrypt from "bcryptjs";
import * as schoolRepo from "@/repositories/schools.repository";
import * as campusRepo from "@/repositories/campuses.repository";
import * as studentRepo from "@/repositories/students.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import * as feeRepo from "@/repositories/fees.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import { CreateSchoolWithOwnerSchema, SchoolProfileInputSchema } from "@/lib/validation/school";
import { logAudit } from "@/services/audit.service";

/** The current viewer's own school — backs the Settings → School Profile screen. */
export async function getMySchool(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  const school = await schoolRepo.getSchool(schoolId);
  if (!school) throw new NotFoundError("School");
  return school;
}

export async function updateMySchoolProfile(session: AuthSession, input: unknown) {
  await requirePermission(session, "settings");
  const schoolId = requireSchoolId(session);
  const data = SchoolProfileInputSchema.parse(input);
  const updated = await schoolRepo.updateSchool(schoolId, data);
  await logAudit(session, "school.profile_updated", "School", schoolId);
  return updated;
}

/** Platform-admin only: every tenant on the platform. */
export async function listAllSchools(session: AuthSession) {
  await requirePermission(session, "settingsSchools");
  return schoolRepo.listSchools();
}

/**
 * Same as listAllSchools, plus a small cross-tenant stats rollup (campuses/
 * students/teachers/current-month fee collection) for the "Schools at a
 * Glance" cards — the platform console's only reason to ever look inside a
 * tenant's data, and even then only as an aggregate count, never a drill-in
 * (see the memory note on why a full impersonation-style view was scoped
 * out of v1).
 */
export async function listAllSchoolsWithStats(session: AuthSession) {
  await requirePermission(session, "settingsSchools");
  const allSchools = await schoolRepo.listSchools();
  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return Promise.all(
    allSchools.map(async (school) => {
      const campuses = await campusRepo.listCampuses(school.id);
      const campusIds = campuses.map((c) => c.id);
      const [students, teachers] = await Promise.all([studentRepo.listStudents(campusIds), teacherRepo.listTeachers(campusIds)]);
      const invoices = await feeRepo.listInvoicesForStudents(students.map((s) => s.id));
      const currentMonthInvoices = invoices.filter((i) => i.month === currentMonthLabel);
      const collected = currentMonthInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
      const outstanding = currentMonthInvoices.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);
      return { school, stats: { campuses: campusIds.length, students: students.length, teachers: teachers.length, collected, outstanding } };
    }),
  );
}

/** Platform-admin editing an arbitrary tenant's profile — unlike updateMySchoolProfile, not scoped to the caller's own school. */
export async function updateSchool(session: AuthSession, schoolId: string, input: unknown) {
  await requirePermission(session, "settingsSchools");
  const data = SchoolProfileInputSchema.parse(input);
  const updated = await schoolRepo.updateSchool(schoolId, data);
  if (!updated) throw new NotFoundError("School");
  await logAudit(session, "school.updated", "School", schoolId);
  return updated;
}

export async function createSchoolWithOwner(session: AuthSession, input: unknown) {
  await requirePermission(session, "settingsSchools");
  const data = CreateSchoolWithOwnerSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.ownerPassword, 12);
  const schoolFields = {
    name: data.name,
    tagline: data.tagline,
    address: data.address,
    phone: data.phone,
    email: data.email,
    logoEmoji: data.logoEmoji,
    reportCardFooter: data.reportCardFooter,
    showSignatureLines: data.showSignatureLines,
  };
  const result = await schoolRepo.createSchoolWithOwner(
    { ...schoolFields, status: "active", onboardingComplete: false },
    data.ownerName,
    data.ownerEmail,
    passwordHash,
  );
  await logAudit(session, "school.created_with_owner", "School", result.school.id, { ownerEmail: data.ownerEmail });
  return result;
}

export async function archiveSchool(session: AuthSession, schoolId: string) {
  await requirePermission(session, "settingsSchools");
  await schoolRepo.archiveSchool(schoolId);
  await logAudit(session, "school.archived", "School", schoolId);
}

export async function completeOnboarding(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  await schoolRepo.updateSchool(schoolId, { onboardingComplete: true });
  await logAudit(session, "school.onboarding_completed", "School", schoolId);
}
