import type { Exam, GradeBand, MarksEntry } from "@/lib/types";
import { intBetween, mulberry32 } from "@/lib/mock/names";
import { CAMPUSES, CLASSES } from "@/lib/mock/reference-data";
import { STUDENTS } from "@/lib/mock/students";

const rand = mulberry32(404);

function buildExams(): Exam[] {
  const exams: Exam[] = [];
  let seq = 1;
  for (const campus of CAMPUSES) {
    const classIds = CLASSES.filter((c) => c.campusId === campus.id).map((c) => c.id);
    const subjectIds = Array.from(new Set(CLASSES.filter((c) => c.campusId === campus.id).flatMap((c) => c.subjectIds)));

    exams.push({
      id: `exam${seq++}`,
      name: "Mid-Term Examination",
      term: "Term 1, 2026-27",
      campusId: campus.id,
      classIds,
      subjectIds,
      startDate: "2026-08-10",
      endDate: "2026-08-18",
      totalMarks: 100,
      passingMarks: 40,
      status: "completed",
      resultsPublished: true,
    });
    exams.push({
      id: `exam${seq++}`,
      name: "Final-Term Examination",
      term: "Term 2, 2026-27",
      campusId: campus.id,
      classIds,
      subjectIds,
      startDate: "2026-12-08",
      endDate: "2026-12-18",
      totalMarks: 100,
      passingMarks: 40,
      status: "scheduled",
      resultsPublished: false,
    });
  }
  return exams;
}

// Mutable, like CLASSES/TEACHERS/TIMETABLE — AppDataProvider re-points this at
// the live store on every render (see the render-body sync in
// lib/store/app-data-context.tsx) so lookup helpers below (and the Student
// Profile's Exams tab, which reads EXAMS directly) reflect Create Exam /
// Publish Results instead of forever showing this generated seed data.
export let EXAMS: Exam[] = buildExams();

export function syncExams(next: Exam[]) {
  EXAMS = next;
}

function buildMarks(): MarksEntry[] {
  const entries: MarksEntry[] = [];
  let seq = 1;
  const completedExams = EXAMS.filter((e) => e.status === "completed");

  for (const exam of completedExams) {
    const classesInExam = CLASSES.filter((c) => exam.classIds.includes(c.id));
    for (const cls of classesInExam) {
      const students = STUDENTS.filter((s) => s.classId === cls.id && s.status === "active");
      for (const student of students) {
        for (const subjectId of cls.subjectIds) {
          const skew = rand();
          const obtained =
            skew < 0.08
              ? intBetween(20, 39, rand) // struggling
              : skew < 0.75
                ? intBetween(60, 84, rand) // typical
                : intBetween(85, 100, rand); // high performers
          entries.push({
            id: `marks${seq++}`,
            examId: exam.id,
            studentId: student.id,
            subjectId,
            obtainedMarks: obtained,
            totalMarks: exam.totalMarks,
          });
        }
      }
    }
  }
  return entries;
}

// Mutable, same reason as EXAMS above — entering marks dispatches into the
// store's own `marks` array, and marksForExamAndClass/marksForStudent/
// marksForStudentExam (Student Profile, Enter Marks pre-fill, Result Card,
// Reports Center) all filter this mirror directly.
export let MARKS_ENTRIES: MarksEntry[] = buildMarks();

export function syncMarks(next: MarksEntry[]) {
  MARKS_ENTRIES = next;
}

export function marksForExamAndClass(examId: string, classId: string) {
  const studentIds = new Set(STUDENTS.filter((s) => s.classId === classId).map((s) => s.id));
  return MARKS_ENTRIES.filter((m) => m.examId === examId && studentIds.has(m.studentId));
}

export function marksForStudent(studentId: string) {
  return MARKS_ENTRIES.filter((m) => m.studentId === studentId);
}

export function marksForStudentExam(studentId: string, examId: string) {
  return MARKS_ENTRIES.filter((m) => m.studentId === studentId && m.examId === examId);
}

// Mutable — see the render-body mirror-sync comment in lib/store/app-data-context.tsx.
// Configurable in Settings → Grade Scale; grade() below always reflects the
// live scale so a school-wide grading-policy change shows up everywhere
// (Result Card, Student Profile, Parent portal) without touching call sites.
export let GRADE_SCALE: GradeBand[] = [
  { id: "gb1", grade: "A+", minPercentage: 90 },
  { id: "gb2", grade: "A", minPercentage: 80 },
  { id: "gb3", grade: "B", minPercentage: 70 },
  { id: "gb4", grade: "C", minPercentage: 60 },
  { id: "gb5", grade: "D", minPercentage: 50 },
  { id: "gb6", grade: "E", minPercentage: 40 },
  { id: "gb7", grade: "F", minPercentage: 0 },
];

export function syncGradeScale(next: GradeBand[]) {
  GRADE_SCALE = next;
}

export function grade(percentage: number): string {
  const sorted = [...GRADE_SCALE].sort((a, b) => b.minPercentage - a.minPercentage);
  return sorted.find((band) => percentage >= band.minPercentage)?.grade ?? "F";
}
