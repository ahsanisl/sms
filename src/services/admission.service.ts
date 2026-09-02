import "server-only";
import * as admissionRepo from "@/repositories/admissions.repository";
import * as studentRepo from "@/repositories/students.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, type AuthSession } from "@/lib/tenancy";
import { InquiryInputSchema, InquiryStageSchema } from "@/lib/validation/admission";
import { StudentInputSchema } from "@/lib/validation/student";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

export async function listInquiries(session: AuthSession) {
  await requirePermission(session, "admissions");
  const campusIds = await scopedCampusIds(session);
  return admissionRepo.listInquiries(campusIds);
}

export async function getInquiry(session: AuthSession, inquiryId: string) {
  await requirePermission(session, "admissions");
  const campusIds = await scopedCampusIds(session);
  const inquiry = await admissionRepo.getInquiry(campusIds, inquiryId);
  if (!inquiry) throw new NotFoundError("Inquiry");
  return inquiry;
}

export async function createInquiry(session: AuthSession, input: unknown) {
  await requirePermission(session, "admissions");
  const data = InquiryInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const { campusId, ...rest } = data;
  const inquiry = await admissionRepo.createInquiry(campusId, { ...rest, stage: "inquiry" });
  await logAudit(session, "inquiry.created", "Inquiry", inquiry.id);
  return inquiry;
}

export async function updateInquiryStage(session: AuthSession, inquiryId: string, stage: unknown, notes?: string) {
  await requirePermission(session, "admissions");
  const parsedStage = InquiryStageSchema.parse(stage);
  const campusIds = await scopedCampusIds(session);
  const updated = await admissionRepo.updateInquiryStage(campusIds, inquiryId, parsedStage, notes);
  if (!updated) throw new NotFoundError("Inquiry");
  await logAudit(session, "inquiry.stage_changed", "Inquiry", inquiryId, { stage: parsedStage });
  return updated;
}

/** Admit & Create Student Record — converts the inquiry into a real Student in one action. */
export async function convertInquiryToStudent(session: AuthSession, inquiryId: string, studentInput: unknown) {
  await requirePermission(session, "admissions");
  const campusIds = await scopedCampusIds(session);
  const inquiry = await admissionRepo.getInquiry(campusIds, inquiryId);
  if (!inquiry) throw new NotFoundError("Inquiry");
  const studentData = StudentInputSchema.parse(studentInput);
  await assertCampusInScope(session, studentData.campusId);
  const student = await studentRepo.createStudent(studentData);
  await admissionRepo.markConverted(inquiryId, student.id);
  await logAudit(session, "inquiry.converted", "Inquiry", inquiryId, { studentId: student.id });
  return student;
}
