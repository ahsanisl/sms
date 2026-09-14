import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "@/db/schema/schools";
import { users } from "@/db/schema/users";

/**
 * One polymorphic table for every real file attachment in the app —
 * Homework, Homework Submissions, Classwork, Curriculum Topics, and
 * anything future. `module`/`entityId` deliberately isn't a real FK (it
 * spans several unrelated tables) — same accepted pattern as
 * role_permissions.module being plain text instead of a pg enum, for the
 * same reason: this list grows over time without a migration.
 */
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    entityId: uuid("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageDriver: text("storage_driver").notNull().default("local"),
    storageKey: text("storage_key").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("attachments_module_entity_idx").on(table.module, table.entityId)],
);

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
