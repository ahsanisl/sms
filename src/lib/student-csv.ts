import type { Student } from "@/lib/types";

/**
 * The one column layout for student CSVs, shared by the Students page's
 * Export, the import template and the Import dialog — so an exported file can
 * be edited in Excel and imported straight back. Import also accepts common
 * alternative spellings (see HEADER_ALIASES in import-students-dialog.tsx)
 * and ignores any extra columns.
 */
export const STUDENT_CSV_HEADERS = [
  "Name",
  "Roll No.",
  "Admission No.",
  "Class",
  "Campus",
  "Gender",
  "Date of Birth",
  "B-Form No.",
  "Nationality",
  "Religion",
  "Blood Group",
  "Medical Notes",
  "Parent Name",
  "Parent Relation",
  "Parent Phone",
  "Parent Email",
  "Second Guardian Name",
  "Second Guardian Relation",
  "Second Guardian Phone",
  "Second Guardian Email",
  "Emergency Contact Name",
  "Emergency Contact Relation",
  "Emergency Contact Phone",
  "Address",
  "Previous School",
  "Admission Date",
] as const;

/** Export-only, informational columns appended after the importable ones — Import ignores them. */
export const STUDENT_EXPORT_EXTRA_HEADERS = ["Attendance %", "Status"] as const;

/** A student as one row in STUDENT_CSV_HEADERS order. */
export function studentCsvRow(student: Student, classLabel: string, campusName: string): string[] {
  return [
    student.name,
    student.rollNumber,
    student.admissionNo,
    classLabel,
    campusName,
    student.gender === "female" ? "Female" : "Male",
    student.dob ?? "",
    student.bFormNumber ?? "",
    student.nationality ?? "",
    student.religion ?? "",
    student.bloodGroup ?? "",
    student.medicalNotes ?? "",
    student.parentName,
    student.parentRelation ?? "",
    student.parentPhone,
    student.parentEmail ?? "",
    student.secondaryGuardianName ?? "",
    student.secondaryGuardianRelation ?? "",
    student.secondaryGuardianPhone ?? "",
    student.secondaryGuardianEmail ?? "",
    student.emergencyContactName ?? "",
    student.emergencyContactRelation ?? "",
    student.emergencyContactPhone ?? "",
    student.address ?? "",
    student.previousSchool ?? "",
    student.admissionDate ?? "",
  ];
}

/** Admission numbers compared the way a person would: case- and whitespace-insensitive. */
export function normalizeAdmissionNo(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}
