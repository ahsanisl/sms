import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";

export const campuses = pgTable(
  "campuses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    city: text("city").notNull().default(""),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("campuses_school_id_idx").on(table.schoolId)],
);

export type Campus = typeof campuses.$inferSelect;
export type NewCampus = typeof campuses.$inferInsert;
