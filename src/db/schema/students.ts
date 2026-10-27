import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { genderEnum, studentLifecycleEventTypeEnum, studentStatusEnum } from "@/db/schema/enums";
import { campuses } from "@/db/schema/campuses";
import { classes } from "@/db/schema/classes";

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "restrict" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    rollNumber: text("roll_number").notNull().default(""),
    admissionNo: text("admission_no").notNull().default(""),
    gender: genderEnum("gender").notNull(),
    dob: date("dob"),
    bloodGroup: text("blood_group").notNull().default(""),
    /** Pakistani B-Form (child registration) / CNIC number — stored as entered, e.g. "35202-1234567-1". */
    bFormNumber: text("b_form_number").notNull().default(""),
    nationality: text("nationality").notNull().default(""),
    religion: text("religion").notNull().default(""),
    previousSchool: text("previous_school").notNull().default(""),
    /** Free text: conditions, allergies, medication — shown to staff who can open the student's profile. */
    medicalNotes: text("medical_notes").notNull().default(""),
    parentName: text("parent_name").notNull().default(""),
    /** The primary parent/guardian's relationship to the student, e.g. "Father". */
    parentRelation: text("parent_relation").notNull().default(""),
    parentPhone: text("parent_phone").notNull().default(""),
    parentEmail: text("parent_email").notNull().default(""),
    secondaryGuardianName: text("secondary_guardian_name").notNull().default(""),
    secondaryGuardianRelation: text("secondary_guardian_relation").notNull().default(""),
    secondaryGuardianPhone: text("secondary_guardian_phone").notNull().default(""),
    secondaryGuardianEmail: text("secondary_guardian_email").notNull().default(""),
    emergencyContactName: text("emergency_contact_name").notNull().default(""),
    emergencyContactRelation: text("emergency_contact_relation").notNull().default(""),
    emergencyContactPhone: text("emergency_contact_phone").notNull().default(""),
    address: text("address").notNull().default(""),
    admissionDate: date("admission_date"),
    status: studentStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("students_campus_id_idx").on(table.campusId), index("students_class_id_idx").on(table.classId)],
);

export const studentLifecycleEvents = pgTable(
  "student_lifecycle_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    type: studentLifecycleEventTypeEnum("type").notNull(),
    date: date("date").notNull(),
    reason: text("reason"),
    resultingStatus: studentStatusEnum("resulting_status"),
    fromClassId: uuid("from_class_id").references(() => classes.id, { onDelete: "set null" }),
    toClassId: uuid("to_class_id").references(() => classes.id, { onDelete: "set null" }),
    fromCampusId: uuid("from_campus_id").references(() => campuses.id, { onDelete: "set null" }),
    toCampusId: uuid("to_campus_id").references(() => campuses.id, { onDelete: "set null" }),
    leavingCertificateIssued: text("leaving_certificate_issued"),
    recordedBy: uuid("recorded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("student_lifecycle_events_student_id_idx").on(table.studentId)],
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type StudentLifecycleEvent = typeof studentLifecycleEvents.$inferSelect;
