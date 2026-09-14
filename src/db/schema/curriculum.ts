import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { curriculumTopicStatusEnum } from "@/db/schema/enums";
import { classes } from "@/db/schema/classes";
import { subjects } from "@/db/schema/subjects";
import { academicSessions } from "@/db/schema/academic-sessions";

/**
 * The syllabus/topic tracker: one row per topic within a (Class, Subject,
 * Academic Session). No direct campusId/schoolId column — scoped
 * transitively through classId, same as timetable_slots and
 * attendance_records already are.
 */
export const curriculumTopics = pgTable(
  "curriculum_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    academicSessionId: uuid("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    orderIndex: integer("order_index").notNull().default(0),
    plannedStartDate: date("planned_start_date"),
    plannedEndDate: date("planned_end_date"),
    status: curriculumTopicStatusEnum("status").notNull().default("not_started"),
    completedDate: date("completed_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("curriculum_topics_class_subject_session_idx").on(table.classId, table.subjectId, table.academicSessionId),
  ],
);

export type CurriculumTopic = typeof curriculumTopics.$inferSelect;
export type NewCurriculumTopic = typeof curriculumTopics.$inferInsert;
