import type { Student, StudentStatus } from "@/lib/types";
import { emailFrom, fullName, intBetween, mulberry32, phoneNumber, pick } from "@/lib/mock/names";
import { CLASSES } from "@/lib/mock/reference-data";

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

const rand = mulberry32(101);

const GRADE_AGE: Record<string, number> = {
  "Grade 1": 6,
  "Grade 2": 7,
  "Grade 5": 10,
  "Grade 8": 13,
  "O-Level": 16,
};

const KARACHI_AREAS = [
  "DHA Phase 5", "Clifton Block 2", "Gulshan-e-Iqbal Block 6", "North Nazimabad",
  "PECHS", "Bahadurabad", "Model Colony", "Malir Cantt", "Gulistan-e-Johar", "Nazimabad",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "O+", "O-"];

function buildStudents(): Student[] {
  const students: Student[] = [];
  let seq = 1;

  for (const cls of CLASSES) {
    const count = intBetween(5, 9, rand);
    for (let i = 1; i <= count; i++) {
      const gender = rand() > 0.48 ? "female" : "male";
      const name = fullName(gender, rand);
      const parentGender = rand() > 0.5 ? "male" : "female";
      const parentName = fullName(parentGender, rand);
      const age = GRADE_AGE[cls.grade] + intBetween(-1, 1, rand);
      const birthYear = 2026 - age;
      const id = `s${seq}`;
      students.push({
        id,
        name,
        rollNumber: `${cls.grade.replace("Grade ", "")}${cls.section}-${String(i).padStart(2, "0")}`,
        admissionNo: `EDU-${birthYear + age - 5}-${String(1000 + seq).slice(1)}`,
        classId: cls.id,
        campusId: cls.campusId,
        gender,
        dob: `${birthYear}-0${intBetween(1, 9, rand)}-${intBetween(10, 28, rand)}`,
        bloodGroup: pick(BLOOD_GROUPS, rand),
        parentName: `${parentGender === "male" ? "Mr." : "Mrs."} ${parentName}`,
        parentPhone: phoneNumber(rand),
        parentEmail: emailFrom(parentName, "gmail.com"),
        address: `House ${intBetween(1, 200, rand)}, ${pick(KARACHI_AREAS, rand)}, Karachi`,
        admissionDate: `20${intBetween(18, 25, rand)}-0${intBetween(1, 8, rand)}-1${intBetween(0, 5, rand)}`,
        status: rand() > 0.05 ? "active" : "inactive",
      });
      seq++;
    }
  }
  return students;
}

// Mutable — see the render-body mirror-sync comment in
// lib/store/app-data-context.tsx. Other mock generators (attendance, fees,
// exams) key off STUDENTS at module-init time, and several runtime helpers
// (studentName, attendanceForStudent, invoicesForStudent, marksForStudent*)
// filter it directly, so it has to stay in sync with live edits/adds/deletes
// the same way CLASSES/TEACHERS/EXAMS do.
export let STUDENTS: Student[] = buildStudents();

export function syncStudents(next: Student[]) {
  STUDENTS = next;
}

export function studentName(id: string) {
  return STUDENTS.find((s) => s.id === id)?.name ?? "Unknown Student";
}

export function studentById(id: string) {
  return STUDENTS.find((s) => s.id === id);
}
