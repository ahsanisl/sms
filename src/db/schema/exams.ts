import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { examStatusEnum, marksStatusEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";
import { classes } from "@/db/schema/classes";
import { subjects } from "@/db/schema/subjects";
import { students } from "@/db/schema/students";

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    term: text("term").notNull().default(""),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalMarks: integer("total_marks").notNull().default(100),
    passingMarks: integer("passing_marks").notNull().default(40),
    status: examStatusEnum("status").notNull().default("scheduled"),
    /** Whether entered marks are visible to Teachers/Parents on the result card — admins/teachers can still review while entering. */
    resultsPublished: boolean("results_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("exams_campus_id_idx").on(table.campusId)],
);

export const examClasses = pgTable(
  "exam_classes",
  {
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
  },
  (table) => [index("exam_classes_exam_id_idx").on(table.examId)],
);

export const examSubjects = pgTable(
  "exam_subjects",
  {
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [index("exam_subjects_exam_id_idx").on(table.examId)],
);

/**
 * DRAFT (teacher entering) → SUBMITTED (teacher done, awaiting review) →
 * PUBLISHED (admin approved, visible to parents) — a real workflow replacing
 * the mock's single resultsPublished boolean on Exam, per spec §24.
 */
export const marksEntries = pgTable(
  "marks_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    obtainedMarks: integer("obtained_marks").notNull(),
    totalMarks: integer("total_marks").notNull(),
    status: marksStatusEnum("status").notNull().default("draft"),
  },
  (table) => [
    index("marks_entries_exam_id_idx").on(table.examId),
    index("marks_entries_student_id_idx").on(table.studentId),
  ],
);

/** One letter-grade band — a percentage earns this grade once it's >= minPercentage and no higher band's minPercentage is also met. */
export const gradeBands = pgTable(
  "grade_bands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    grade: text("grade").notNull(),
    minPercentage: integer("min_percentage").notNull(),
  },
  (table) => [index("grade_bands_school_id_idx").on(table.schoolId)],
);

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type MarksEntry = typeof marksEntries.$inferSelect;
export type GradeBand = typeof gradeBands.$inferSelect;
