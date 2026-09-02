import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { inquiryStageEnum } from "@/db/schema/enums";
import { campuses } from "@/db/schema/campuses";
import { students } from "@/db/schema/students";

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "restrict" }),
    childName: text("child_name").notNull(),
    gradeAppliedFor: text("grade_applied_for").notNull(),
    parentName: text("parent_name").notNull().default(""),
    parentPhone: text("parent_phone").notNull().default(""),
    parentEmail: text("parent_email").notNull().default(""),
    stage: inquiryStageEnum("stage").notNull().default("inquiry"),
    source: text("source").notNull().default(""),
    notes: text("notes"),
    convertedStudentId: uuid("converted_student_id").references(() => students.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inquiries_campus_id_idx").on(table.campusId)],
);

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
