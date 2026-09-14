import "server-only";
import { and, count, desc, eq, gte, lte, lt } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export interface AuditLogFilters {
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildWhere(schoolId: string, filters: AuditLogFilters) {
  const conditions = [eq(auditLogs.schoolId, schoolId)];
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.entity) conditions.push(eq(auditLogs.entity, filters.entity));
  if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(`${filters.dateFrom}T00:00:00`)));
  if (filters.dateTo) conditions.push(lte(auditLogs.createdAt, new Date(`${filters.dateTo}T23:59:59.999`)));
  return and(...conditions);
}

export async function listAuditLogs(schoolId: string, filters: AuditLogFilters, page: { limit: number; offset: number }) {
  const where = buildWhere(schoolId, filters);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(page.limit).offset(page.offset),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);
  return { rows, total };
}

/** Backs the filter dropdowns — derived from real data so a future domain's new logAudit action/entity shows up automatically, never a hardcoded list. */
export async function listDistinctActions(schoolId: string) {
  const rows = await db.selectDistinct({ action: auditLogs.action }).from(auditLogs).where(eq(auditLogs.schoolId, schoolId));
  return rows.map((r) => r.action).sort();
}

export async function listDistinctEntities(schoolId: string) {
  const rows = await db.selectDistinct({ entity: auditLogs.entity }).from(auditLogs).where(eq(auditLogs.schoolId, schoolId));
  return rows.map((r) => r.entity).sort();
}

/** The only deletion path for audit rows — age-based, never an arbitrary single row. Returns how many were removed. */
export async function deleteOlderThan(schoolId: string, cutoff: Date) {
  const deleted = await db
    .delete(auditLogs)
    .where(and(eq(auditLogs.schoolId, schoolId), lt(auditLogs.createdAt, cutoff)))
    .returning({ id: auditLogs.id });
  return deleted.length;
}
