import "server-only";
import * as userRepo from "@/repositories/users.repository";
import { requireSchoolId, type AuthSession } from "@/lib/tenancy";

/**
 * Read-only staff directory for the caller's own school — used to resolve
 * actor ids (payment.receivedBy, concession.approvedBy, reversal.reversedBy,
 * audit logs) back to a display name. No permission gate: every authenticated
 * in-tenant user is allowed to see who processed a transaction, matching what
 * the mock UI already showed for these same fields.
 */
export async function listUsersBySchool(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  return userRepo.listUsersBySchool(schoolId);
}
