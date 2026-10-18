import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { classes } from "@/db/schema/classes";
import { subjects } from "@/db/schema/subjects";
import { teachers } from "@/db/schema/teachers";
import { syllabusTopics } from "@/db/schema/syllabus";

/** A same-day log of what a class covered/did in a subject period — teacher-authored, never "submitted" by students (unlike Homework). */
export const classwork = pgTable(
  "classwork",
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
    /** Optional cross-link — "this classwork covered Topic X" — never required, since Syllabus topics may not exist yet for every class/subject. */
    syllabusTopicId: uuid("syllabus_topic_id").references(() => syllabusTopics.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("classwork_class_id_idx").on(table.classId), index("classwork_date_idx").on(table.date)],
);

export type Classwork = typeof classwork.$inferSelect;
export type NewClasswork = typeof classwork.$inferInsert;
