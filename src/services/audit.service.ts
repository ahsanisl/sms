import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import * as auditRepo from "@/repositories/audit.repository";
import * as schoolRepo from "@/repositories/schools.repository";
import * as userRepo from "@/repositories/users.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, type AuthSession } from "@/lib/tenancy";
import type { AuditLogFilters } from "@/repositories/audit.repository";

const PAGE_SIZE = 50;

/**
 * Prunes ~2% of the time a log is written, for whichever school that write
 * belongs to — a cheap, self-healing enforcement of the retention setting
 * with no cron/external scheduler needed (this project's only infra
 * dependency has stayed DATABASE_URL all session). "Clean Up Now" below is
 * the deterministic counterpart for an admin who wants it immediate.
 */
async function maybePruneInBackground(schoolId: string | null | undefined) {
  if (!schoolId) return;
  if (Math.random() >= 0.02) return;
  try {
    await pruneExpiredLogs(schoolId);
  } catch (error) {
    console.error("Background audit log prune failed", { schoolId, error });
  }
}

/** Fire-and-forget audit trail write — never blocks or fails the calling mutation (spec §26). */
export async function logAudit(
  session: AuthSession | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogs).values({
      userId: session?.userId ?? null,
      schoolId: session?.schoolId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      metadata: metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", { action, entity, entityId, error });
  }
  void maybePruneInBackground(session?.schoolId);
}

/** For events with no signed-in session (e.g. a password reset by email): recorded as that user, in their school's log. */
export async function logAuditForUser(user: { id: string; schoolId: string | null }, action: string, entity: string, entityId?: string, metadata?: Record<string, unknown>) {
  await logAudit({ userId: user.id, schoolId: user.schoolId } as AuthSession, action, entity, entityId, metadata);
}

/** Every governable action, view + retention config alike — owner/school_admin only, see the plan's Scope decisions on why campus_admin doesn't get this. */
export async function listAuditLogs(session: AuthSession, filters: AuditLogFilters, pageNumber: number) {
  await requirePermission(session, "auditLog");
  const schoolId = requireSchoolId(session);
  const page = { limit: PAGE_SIZE, offset: Math.max(0, pageNumber - 1) * PAGE_SIZE };
  const [{ rows, total }, users] = await Promise.all([auditRepo.listAuditLogs(schoolId, filters, page), userRepo.listUsersBySchool(schoolId)]);
  const userById = new Map(users.map((u) => [u.id, u]));
  return {
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      metadata: r.metadata,
      userName: r.userId ? (userById.get(r.userId)?.name ?? "Unknown user") : "System",
      userRole: r.userId ? (userById.get(r.userId)?.role ?? null) : null,
    })),
    total,
    page: pageNumber,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listFilterOptions(session: AuthSession) {
  await requirePermission(session, "auditLog");
  const schoolId = requireSchoolId(session);
  const [actions, entities, users] = await Promise.all([
    auditRepo.listDistinctActions(schoolId),
    auditRepo.listDistinctEntities(schoolId),
    userRepo.listUsersBySchool(schoolId),
  ]);
  return { actions, entities, users: users.map((u) => ({ id: u.id, name: u.name })) };
}

export async function getRetentionDays(session: AuthSession) {
  await requirePermission(session, "auditLog");
  const schoolId = requireSchoolId(session);
  const school = await schoolRepo.getSchool(schoolId);
  return school?.auditLogRetentionDays ?? null;
}

export async function setRetentionDays(session: AuthSession, days: number | null) {
  await requirePermission(session, "auditLog");
  const schoolId = requireSchoolId(session);
  if (days !== null && ![30, 40, 50, 60].includes(days)) {
    throw new Error("Retention must be Never, 30, 40, 50, or 60 days.");
  }
  await schoolRepo.updateSchool(schoolId, { auditLogRetentionDays: days });
  await logAudit(session, "audit_log.retention_updated", "School", schoolId, { days });
}

export async function pruneExpiredLogs(schoolId: string) {
  const school = await schoolRepo.getSchool(schoolId);
  const retentionDays = school?.auditLogRetentionDays;
  if (!retentionDays) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return auditRepo.deleteOlderThan(schoolId, cutoff);
}

/** The deterministic counterpart to the background prune — "Clean Up Now" on the retention settings card. Still only ever deletes by the configured age cutoff, never an arbitrary row. */
export async function cleanUpNow(session: AuthSession) {
  await requirePermission(session, "auditLog");
  const schoolId = requireSchoolId(session);
  const deletedCount = await pruneExpiredLogs(schoolId);
  await logAudit(session, "audit_log.cleaned_up", "School", schoolId, { deletedCount });
  return deletedCount;
}
