"use server";

import { revalidatePath } from "next/cache";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";
import { normalizeAdmissionNo } from "@/lib/student-csv";
import { can } from "@/lib/authorization";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  // A ZodError's .message is a JSON dump of every issue — show the first issue's own message instead.
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const issue = (error as { issues: { message?: string }[] }).issues[0];
    if (issue?.message) return issue.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function updateStudentAction(studentId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.updateStudent(session, studentId, input);
    revalidatePath("/students");
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteStudentAction(studentId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.deleteStudent(session, studentId);
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

const MAX_IMPORT_ROWS = 500;

export interface ImportRowResult {
  /** Index of the row in the submitted array. */
  index: number;
  success: boolean;
  error?: string;
}

/**
 * Bulk import from the Students page's CSV dialog. Every row goes through the
 * same createStudent service as the Add Student form — same validation,
 * permission check (studentsManage), campus scoping and audit log entry — so
 * importing can't create anything the form couldn't. Rows are independent: a
 * bad row is reported back without blocking the rest.
 */
export async function importStudentsAction(rows: unknown[]): Promise<{ success: boolean; error?: string; results: ImportRowResult[] }> {
  try {
    const session = await requireSession();
    // Refuse up front — before the duplicate check, which would otherwise answer row-by-row.
    if (!(await can(session, "studentsManage"))) return { success: false, error: "Your role can't add students.", results: [] };
    if (!Array.isArray(rows) || rows.length === 0) return { success: false, error: "No rows to import.", results: [] };
    if (rows.length > MAX_IMPORT_ROWS) return { success: false, error: `Import at most ${MAX_IMPORT_ROWS} students at a time.`, results: [] };
    // Admission numbers aren't unique in the database, so re-importing an
    // exported file would silently duplicate everyone — skip any row whose
    // admission number already belongs to a student in the caller's scope,
    // or to an earlier row of this same file.
    const existing = await studentService.listStudents(session).catch(() => []);
    const takenBy = new Map(existing.filter((s) => normalizeAdmissionNo(s.admissionNo)).map((s) => [normalizeAdmissionNo(s.admissionNo), s.name]));
    const results: ImportRowResult[] = [];
    for (const [index, row] of rows.entries()) {
      const rawAdmissionNo = row && typeof row === "object" && "admissionNo" in row ? String((row as { admissionNo: unknown }).admissionNo ?? "") : "";
      const admissionKey = normalizeAdmissionNo(rawAdmissionNo);
      if (admissionKey && takenBy.has(admissionKey)) {
        results.push({ index, success: false, error: `Admission No. ${rawAdmissionNo.trim()} already belongs to ${takenBy.get(admissionKey)} — skipped to avoid a duplicate.` });
        continue;
      }
      try {
        const created = await studentService.createStudent(session, row);
        if (admissionKey) takenBy.set(admissionKey, created.name);
        results.push({ index, success: true });
      } catch (error) {
        results.push({ index, success: false, error: importErrorMessage(error) });
      }
    }
    revalidatePath("/students");
    return { success: true, results };
  } catch (error) {
    return { success: false, error: errorMessage(error), results: [] };
  }
}

/** Zod errors carry a JSON blob as their message — surface just the first human-readable issue. */
function importErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const issue = (error as { issues: { message?: string; path?: (string | number)[] }[] }).issues[0];
    if (issue?.message) return issue.path?.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message;
  }
  return errorMessage(error);
}
