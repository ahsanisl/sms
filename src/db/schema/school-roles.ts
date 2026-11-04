import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { roleEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";

/**
 * A school's own roles: the default ("system") roles every school gets —
 * School Owner, School Admin, Campus Admin, Teacher, Accountant, Parent — plus
 * any custom roles its Owner/Admin creates (e.g. "Receptionist").
 *
 * `baseRole` is the built-in role a custom role behaves as: it decides data
 * scope (whole school, one campus, a teacher's own classes) and which
 * dashboard/navigation flavor the user gets, because that behavior is
 * hard-wired per built-in role throughout the services. The role's own rows
 * in school_role_permissions decide which modules it can open.
 *
 * Replaced the old platform-wide role_permissions table (copied in by migration
 * 0005, dropped in 0006). platform_admin, the one role without a school, uses
 * the built-in DEFAULT_ROLE_PERMISSIONS directly (see lib/authorization.ts).
 */
export const schoolRoles = pgTable(
  "school_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    baseRole: roleEnum("base_role").notNull(),
    /** True for the six default roles — they can't be renamed or deleted. */
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("school_roles_school_id_idx").on(table.schoolId), uniqueIndex("school_roles_school_name_idx").on(table.schoolId, table.name)],
);

/** Module access for one school role. A missing row means "not allowed". */
export const schoolRolePermissions = pgTable(
  "school_role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => schoolRoles.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    allowed: boolean("allowed").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.module] })],
);

export type SchoolRole = typeof schoolRoles.$inferSelect;
export type NewSchoolRole = typeof schoolRoles.$inferInsert;
