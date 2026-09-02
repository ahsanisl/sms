import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Every enum shared across schema files, centralized here so no two files
 * accidentally declare the same Postgres enum type twice.
 */
export const roleEnum = pgEnum("role", [
  "platform_admin",
  "school_owner",
  "school_admin",
  "campus_admin",
  "teacher",
  "accountant",
  "parent",
]);

export const archivableStatusEnum = pgEnum("archivable_status", ["active", "archived"]);

export const studentStatusEnum = pgEnum("student_status", ["active", "inactive", "withdrawn", "alumni"]);

export const studentLifecycleEventTypeEnum = pgEnum("student_lifecycle_event_type", [
  "withdrawal",
  "transfer",
  "reactivation",
  "promotion",
]);

export const teacherStatusEnum = pgEnum("teacher_status", ["active", "inactive"]);

export const genderEnum = pgEnum("gender", ["male", "female"]);

export const inquiryStageEnum = pgEnum("inquiry_stage", [
  "inquiry",
  "applied",
  "interview",
  "offered",
  "admitted",
  "rejected",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "leave", "late"]);

export const correctionStatusEnum = pgEnum("correction_status", ["pending", "approved", "rejected"]);

export const feeFrequencyEnum = pgEnum("fee_frequency", ["monthly", "quarterly", "annual", "one_time"]);

export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "unpaid", "overdue", "partial"]);

export const concessionTypeEnum = pgEnum("concession_type", [
  "sibling_discount",
  "staff_discount",
  "scholarship",
  "financial_aid",
  "other",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "bank_transfer", "card", "cheque"]);

export const examStatusEnum = pgEnum("exam_status", ["scheduled", "ongoing", "completed"]);

/** DRAFT → SUBMITTED (by teacher) → PUBLISHED (by admin) — new workflow, the mock only had a boolean. */
export const marksStatusEnum = pgEnum("marks_status", ["draft", "submitted", "published"]);

export const timetableDayEnum = pgEnum("timetable_day", ["Mon", "Tue", "Wed", "Thu", "Fri"]);

export const timetableStatusEnum = pgEnum("timetable_status", ["draft", "published"]);

export const roomTypeEnum = pgEnum("room_type", ["classroom", "lab", "hall", "other"]);

export const announcementAudienceEnum = pgEnum("announcement_audience", ["all", "teachers", "parents", "students"]);

export const announcementPriorityEnum = pgEnum("announcement_priority", ["normal", "important"]);

export const leaveTypeEnum = pgEnum("leave_type", ["sick", "casual", "annual", "other"]);

export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);
