import type { GradeBand, InquiryStage, StudentStatus, TimetableDay } from "@/lib/types";

/**
 * Fixed reference values and display labels shared across screens. None of
 * this is tenant data — anything a school can change (campuses, subjects,
 * grade bands, periods, ...) lives in the database.
 */

/** The grades a class can be created for, lowest first — also drives Promotion's "next grade" and sort order in class pickers. */
export const GRADE_ORDER = ["Grade 1", "Grade 2", "Grade 5", "Grade 8", "O-Level"];

export function wingForGrade(grade: string): "Primary Wing" | "Middle Wing" | "Senior Wing" {
  if (grade === "Grade 1" || grade === "Grade 2") return "Primary Wing";
  if (grade === "O-Level") return "Senior Wing";
  return "Middle Wing";
}

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  withdrawn: "Withdrawn",
  alumni: "Alumni",
};

export function studentStatusTone(status: StudentStatus): "success" | "error" | "warning" | "info" | "neutral" {
  switch (status) {
    case "active":
      return "info";
    case "alumni":
      return "success";
    case "withdrawn":
      return "warning";
    default:
      return "neutral";
  }
}

export const INQUIRY_STAGE_LABEL: Record<InquiryStage, string> = {
  inquiry: "Inquiry",
  applied: "Applied",
  interview: "Interview",
  offered: "Offered",
  admitted: "Admitted",
  rejected: "Rejected",
};

export const INQUIRY_STAGE_TONE: Record<InquiryStage, "success" | "error" | "warning" | "info" | "neutral"> = {
  inquiry: "neutral",
  applied: "info",
  interview: "info",
  offered: "warning",
  admitted: "success",
  rejected: "error",
};

/** The order a live inquiry normally advances through — used to render "Advance to next stage" actions. */
export const INQUIRY_STAGE_ORDER: InquiryStage[] = ["inquiry", "applied", "interview", "offered", "admitted"];

export const INQUIRY_SOURCES = ["Walk-in", "Referral", "Website", "Phone Call", "Social Media"];

/** "Reset to standard scale" on Settings → Grade Scale. */
export const DEFAULT_GRADE_BANDS: Omit<GradeBand, "id" | "schoolId">[] = [
  { grade: "A+", minPercentage: 90 },
  { grade: "A", minPercentage: 80 },
  { grade: "B", minPercentage: 70 },
  { grade: "C", minPercentage: 60 },
  { grade: "D", minPercentage: 50 },
  { grade: "E", minPercentage: 40 },
  { grade: "F", minPercentage: 0 },
];

/** "Reset to defaults" on Settings → Timetable. */
export const DEFAULT_WORKING_DAYS: TimetableDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const DEFAULT_PERIODS = [
  { period: 1, startTime: "08:00", endTime: "08:40" },
  { period: 2, startTime: "08:40", endTime: "09:20" },
  { period: 3, startTime: "09:20", endTime: "10:00" },
  { period: 4, startTime: "10:20", endTime: "11:00" },
  { period: 5, startTime: "11:00", endTime: "11:40" },
  { period: 6, startTime: "11:40", endTime: "12:20" },
  { period: 7, startTime: "12:20", endTime: "13:00" },
];
export const DEFAULT_BREAK_AFTER_PERIOD = 3;
