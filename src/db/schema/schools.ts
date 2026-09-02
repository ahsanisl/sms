import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum } from "@/db/schema/enums";

/**
 * The tenant root. Every other school-owned table carries a schoolId FK back
 * here — see src/lib/tenancy for how that boundary is enforced at read time.
 * Also doubles as the school's printed identity/branding (report-card
 * letterhead), matching the frontend's School type.
 */
export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  logoEmoji: text("logo_emoji").notNull().default("🏫"),
  reportCardFooter: text("report_card_footer").notNull().default(""),
  showSignatureLines: boolean("show_signature_lines").notNull().default(true),
  status: archivableStatusEnum("status").notNull().default("active"),
  /** False until the Owner finishes /onboarding. */
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
