import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { roleEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";
import { teachers } from "@/db/schema/teachers";
import { students } from "@/db/schema/students";

/**
 * Every account that can log in. schoolId is nullable only for
 * platform_admin (the one role not scoped to a tenant — see
 * src/lib/tenancy/session.ts). campusId is set for campus_admin (and
 * optionally teacher/parent, mirroring the mock's denormalized campusId).
 * teacherId links a teacher's own login to their staff record without
 * cramming staff fields into this table (spec §7's "not every relationship
 * belongs on users").
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    role: roleEnum("role").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarSeed: text("avatar_seed").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email), index("users_school_id_idx").on(table.schoolId)],
);

/** A parent (users.role = 'parent') linked to one or more of their children. Replaces the mock's flat childStudentIds array with a real join. */
export const parentChildren = pgTable(
  "parent_children",
  {
    parentUserId: uuid("parent_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("parent_children_parent_user_id_idx").on(table.parentUserId),
    uniqueIndex("parent_children_parent_student_idx").on(table.parentUserId, table.studentId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
