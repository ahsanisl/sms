import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { announcementAudienceEnum, announcementPriorityEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** Unset means every campus within schoolId. */
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    audience: announcementAudienceEnum("audience").notNull().default("all"),
    priority: announcementPriorityEnum("priority").notNull().default("normal"),
    author: text("author").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("announcements_school_id_idx").on(table.schoolId)],
);

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
