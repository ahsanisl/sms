import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum, roomTypeEnum } from "@/db/schema/enums";
import { campuses } from "@/db/schema/campuses";

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: roomTypeEnum("type").notNull().default("classroom"),
    capacity: integer("capacity").notNull().default(30),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rooms_campus_id_idx").on(table.campusId)],
);

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
