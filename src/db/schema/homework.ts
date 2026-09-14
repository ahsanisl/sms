import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { homeworkSubmissionStatusEnum } from "@/db/schema/enums";
import { classes } from "@/db/schema/classes";
import { subjects } from "@/db/schema/subjects";
import { teachers } from "@/db/schema/teachers";
import { students } from "@/db/schema/students";
import { users } from "@/db/schema/users";

export const homework = pgTable(
  "homework",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    assignedDate: date("assigned_date").notNull(),
    dueDate: date("due_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("homework_class_id_idx").on(table.classId)],
);

/**
 * No row is pre-created for every roster student when homework is posted —
 * a student with no row here is simply "not_submitted" (the service derives
 * this), and a real row is only inserted on first submission. The unique
 * index lets a resubmission UPDATE the same row instead of inserting a
 * duplicate.
 */
export const homeworkSubmissions = pgTable(
  "homework_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    homeworkId: uuid("homework_id")
      .notNull()
      .references(() => homework.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: homeworkSubmissionStatusEnum("status").notNull().default("submitted"),
    submissionText: text("submission_text").notNull().default(""),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    /** Free text like "18/20" or "A" — matches this app's existing preference for a simple text field over a rigid numeric-only one (e.g. FeeCategory). */
    grade: text("grade"),
    teacherComment: text("teacher_comment"),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    gradedBy: uuid("graded_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [uniqueIndex("homework_submissions_homework_student_idx").on(table.homeworkId, table.studentId)],
);

export type Homework = typeof homework.$inferSelect;
export type NewHomework = typeof homework.$inferInsert;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;
export type NewHomeworkSubmission = typeof homeworkSubmissions.$inferInsert;
