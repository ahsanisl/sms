import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum } from "@/db/schema/enums";
import { campuses } from "@/db/schema/campuses";
import { teachers } from "@/db/schema/teachers";
import { subjects } from "@/db/schema/subjects";

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    headTeacherId: uuid("head_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("departments_campus_id_idx").on(table.campusId)],
);

export const departmentSubjects = pgTable(
  "department_subjects",
  {
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [index("department_subjects_department_id_idx").on(table.departmentId)],
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
