import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { roleEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";
import { teachers } from "@/db/schema/teachers";
import { students } from "@/db/schema/students";
import { schoolRoles } from "@/db/schema/school-roles";

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
    /** The built-in role this account behaves as (data scope, dashboard). For a custom role this is the role's baseRole. */
    role: roleEnum("role").notNull(),
    /** The school role whose permissions apply. Null = the school's default role for `role`. */
    schoolRoleId: uuid("school_role_id").references(() => schoolRoles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** Required by Better Auth. Accounts are created by staff, not self sign-up, so they start verified. */
    emailVerified: boolean("email_verified").notNull().default(true),
    /** Profile picture URL (Better Auth's "image"); unused today — avatars are generated from avatarSeed. */
    image: text("image"),
    /** bcrypt hash. Empty for an account with no password (e.g. a future "Sign in with Google" user) — an empty hash never matches. */
    passwordHash: text("password_hash").notNull().default(""),
    /** Set when an admin creates the account or resets its password — the user must choose their own password at next sign-in. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    /** Consecutive wrong-password sign-ins; reset on success. See src/lib/login-throttle.ts. */
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    /** Sign-in refused until this time after too many wrong passwords. Cleared on success or an admin password reset. */
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
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
