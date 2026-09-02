import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { attendanceStatusEnum, correctionStatusEnum } from "@/db/schema/enums";
import { students } from "@/db/schema/students";
import { classes } from "@/db/schema/classes";

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    markedBy: uuid("marked_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("attendance_records_class_id_idx").on(table.classId),
    index("attendance_records_date_idx").on(table.date),
    uniqueIndex("attendance_records_student_date_idx").on(table.studentId, table.date),
  ],
);

/** A teacher's request to change an already-saved record — approving it edits the AttendanceRecord and leaves this as the audit trail. */
export const attendanceCorrections = pgTable(
  "attendance_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    currentStatus: attendanceStatusEnum("current_status").notNull(),
    requestedStatus: attendanceStatusEnum("requested_status").notNull(),
    reason: text("reason").notNull().default(""),
    status: correctionStatusEnum("status").notNull().default("pending"),
    requestedBy: uuid("requested_by").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: uuid("reviewed_by"),
    reviewNote: text("review_note"),
  },
  (table) => [index("attendance_corrections_class_id_idx").on(table.classId)],
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type AttendanceCorrection = typeof attendanceCorrections.$inferSelect;
