import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { teacherStatusEnum } from "@/db/schema/enums";
import { campuses } from "@/db/schema/campuses";
import { subjects } from "@/db/schema/subjects";

export const teachers = pgTable(
  "teachers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    employeeId: text("employee_id").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    qualification: text("qualification").notNull().default(""),
    joinDate: date("join_date"),
    status: teacherStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("teachers_campus_id_idx").on(table.campusId),
    uniqueIndex("teachers_campus_id_employee_id_idx").on(table.campusId, table.employeeId),
  ],
);

export const teacherSubjects = pgTable(
  "teacher_subjects",
  {
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [index("teacher_subjects_teacher_id_idx").on(table.teacherId)],
);

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
