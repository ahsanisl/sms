import { boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { roleEnum } from "@/db/schema/enums";

/**
 * The DB-backed replacement for the mock's DEFAULT_ROLE_PERMISSIONS +
 * Settings → Users & Roles matrix. `module` deliberately stays `text`, not a
 * pg enum — this list (dashboard, students, feesCollect, ...) is
 * product-defined and grows over time; enums are painful to extend via
 * migration for something this fluid. Valid values are enforced at the
 * application layer (see lib/permissions), matching the frontend's
 * PermissionModule union.
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: roleEnum("role").notNull(),
    module: text("module").notNull(),
    allowed: boolean("allowed").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.role, table.module] })],
);

export type RolePermission = typeof rolePermissions.$inferSelect;
