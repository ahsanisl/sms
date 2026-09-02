import { boolean, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "@/db/schema/schools";

export const academicSessions = pgTable(
  "academic_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // e.g. "2026 – 2027"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("academic_sessions_school_id_idx").on(table.schoolId)],
);

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
  },
  (table) => [index("terms_session_id_idx").on(table.sessionId)],
);

export type AcademicSession = typeof academicSessions.$inferSelect;
export type NewAcademicSession = typeof academicSessions.$inferInsert;
export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;
