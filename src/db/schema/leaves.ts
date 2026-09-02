import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { leaveStatusEnum, leaveTypeEnum } from "@/db/schema/enums";
import { teachers } from "@/db/schema/teachers";

export const staffLeaveRequests = pgTable(
  "staff_leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    type: leaveTypeEnum("type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull().default(""),
    status: leaveStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: uuid("reviewed_by"),
    reviewNote: text("review_note"),
  },
  (table) => [index("staff_leave_requests_teacher_id_idx").on(table.teacherId)],
);

export type StaffLeaveRequest = typeof staffLeaveRequests.$inferSelect;
export type NewStaffLeaveRequest = typeof staffLeaveRequests.$inferInsert;
