import { index, integer, jsonb, pgTable, time, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timetableDayEnum, timetableStatusEnum } from "@/db/schema/enums";

type TimetableDay = (typeof timetableDayEnum.enumValues)[number];
import { schools } from "@/db/schema/schools";
import { classes } from "@/db/schema/classes";
import { subjects } from "@/db/schema/subjects";
import { teachers } from "@/db/schema/teachers";
import { rooms } from "@/db/schema/rooms";

/** One row per school — working days + which period the break follows. */
export const timetableConfigs = pgTable("timetable_configs", {
  schoolId: uuid("school_id")
    .primaryKey()
    .references(() => schools.id, { onDelete: "cascade" }),
  workingDays: jsonb("working_days").$type<string[]>().notNull().default(["Mon", "Tue", "Wed", "Thu", "Fri"]),
  breakAfterPeriod: integer("break_after_period").notNull().default(0),
});

export const periods = pgTable(
  "periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    period: integer("period").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [
    index("periods_school_id_idx").on(table.schoolId),
    uniqueIndex("periods_school_id_period_idx").on(table.schoolId, table.period),
  ],
);

/** The published timetable. Draft-in-progress edits live separately in timetableDrafts until Published. */
export const timetableSlots = pgTable(
  "timetable_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    day: timetableDayEnum("day").notNull(),
    period: integer("period").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  },
  (table) => [
    index("timetable_slots_class_id_idx").on(table.classId),
    index("timetable_slots_teacher_id_idx").on(table.teacherId),
    uniqueIndex("timetable_slots_class_day_period_idx").on(table.classId, table.day, table.period),
  ],
);

/** Per-class publish state — a class with no row here is treated as "published" (never touched by the Builder). */
// SQL name deliberately differs from the TS identifier — "timetable_status"
// is already taken by timetableStatusEnum in enums.ts, and Postgres tables
// implicitly create a composite type of the same name, which collides with
// an existing enum type of that name.
export const timetableStatus = pgTable("class_timetable_status", {
  classId: uuid("class_id")
    .primaryKey()
    .references(() => classes.id, { onDelete: "cascade" }),
  status: timetableStatusEnum("status").notNull().default("published"),
});

/** In-progress Builder edits, invisible to Teacher/Parent views until Published — stored as a jsonb snapshot mirroring timetableSlots' shape. */
export const timetableDrafts = pgTable("timetable_drafts", {
  classId: uuid("class_id")
    .primaryKey()
    .references(() => classes.id, { onDelete: "cascade" }),
  slots: jsonb("slots")
    .$type<{ day: TimetableDay; period: number; startTime: string; endTime: string; subjectId: string; teacherId: string; roomId?: string }[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TimetableConfig = typeof timetableConfigs.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type TimetableSlot = typeof timetableSlots.$inferSelect;
export type NewTimetableSlot = typeof timetableSlots.$inferInsert;
