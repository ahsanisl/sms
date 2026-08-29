import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { mulberry32 } from "@/lib/mock/names";
import { STUDENTS } from "@/lib/mock/students";
import { teacherName, CLASSES } from "@/lib/mock/reference-data";

const rand = mulberry32(202);

const TODAY = new Date("2026-08-29T00:00:00");

function lastSchoolDays(n: number): string[] {
  const days: string[] = [];
  const cursor = new Date(TODAY);
  while (days.length < n) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

export const SCHOOL_DAYS = lastSchoolDays(14);

function rollStatus(): AttendanceStatus {
  const r = rand();
  if (r < 0.9) return "present";
  if (r < 0.95) return "absent";
  if (r < 0.98) return "leave";
  return "late";
}

function buildAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let seq = 1;
  for (const date of SCHOOL_DAYS) {
    for (const student of STUDENTS) {
      if (student.status !== "active") continue;
      const cls = CLASSES.find((c) => c.id === student.classId);
      records.push({
        id: `att${seq++}`,
        studentId: student.id,
        classId: student.classId,
        date,
        status: rollStatus(),
        markedBy: cls ? teacherName(cls.classTeacherId) : "System",
      });
    }
  }
  return records;
}

// Mutable — see the render-body mirror-sync comment in
// lib/store/app-data-context.tsx. Marking attendance dispatches into the
// store's own `attendance` array; without this mirror staying in sync,
// attendanceForStudent/attendanceRate (used all over — Student Profile,
// Class Detail, dashboards, Reports Center) would keep showing the seed
// snapshot's attendance forever, regardless of anything marked afterward.
export let ATTENDANCE: AttendanceRecord[] = buildAttendance();

export function syncAttendance(next: AttendanceRecord[]) {
  ATTENDANCE = next;
}

export function attendanceForDate(date: string) {
  return ATTENDANCE.filter((a) => a.date === date);
}

export function attendanceForClassOnDate(classId: string, date: string) {
  return ATTENDANCE.filter((a) => a.classId === classId && a.date === date);
}

export function attendanceForStudent(studentId: string) {
  return ATTENDANCE.filter((a) => a.studentId === studentId);
}

export function attendanceRate(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((present / records.length) * 100);
}
