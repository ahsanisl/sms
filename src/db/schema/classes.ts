import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum } from "@/db/schema/enums";
import { campuses } from "@/db/schema/campuses";
import { teachers } from "@/db/schema/teachers";
import { subjects } from "@/db/schema/subjects";

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "restrict" }),
    grade: text("grade").notNull(),
    section: text("section").notNull(),
    classTeacherId: uuid("class_teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    studentCapacity: integer("student_capacity").notNull().default(35),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("classes_campus_id_idx").on(table.campusId),
    uniqueIndex("classes_campus_id_grade_section_idx").on(table.campusId, table.grade, table.section),
  ],
);

export const classSubjects = pgTable(
  "class_subjects",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [index("class_subjects_class_id_idx").on(table.classId)],
);

export type ClassSection = typeof classes.$inferSelect;
export type NewClassSection = typeof classes.$inferInsert;
