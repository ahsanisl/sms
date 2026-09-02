import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Minimal audit trail for financial/academic/tenant-management actions
 * (spec §26). userId/schoolId are plain uuid columns, not FKs — an audit row
 * must survive even if the referenced user/school is later removed.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    schoolId: uuid("school_id"),
    action: text("action").notNull(), // e.g. "payment.recorded", "marks.published"
    entity: text("entity").notNull(), // e.g. "FeeInvoice"
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_school_id_idx").on(table.schoolId),
    index("audit_logs_entity_idx").on(table.entity, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
