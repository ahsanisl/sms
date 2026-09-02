"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Student, AttendanceRecord, FeeInvoice, MarksEntry, Exam, Campus, ClassSection, Teacher, Subject } from "@/lib/types";
import { attendanceRate } from "@/lib/mock/attendance";
import { formatDate, formatPKR } from "@/lib/format";

export interface ReportData {
  students: Student[];
  attendance: AttendanceRecord[];
  // No report here ever reads an invoice's line items — the bulk fetch that
  // backs this page doesn't include them (same as every other real fees
  // list in the app), so this is intentionally narrower than the full mock type.
  invoices: Omit<FeeInvoice, "items">[];
  marks: MarksEntry[];
  exams: Exam[];
  /** Pre-scoped to the viewer's campus (or all campuses for school-wide roles) — report renderers must use these, never a global lookup, so a Campus Admin never sees another campus's rows. */
  campuses: Campus[];
  classes: ClassSection[];
  teachers: Teacher[];
  subjects: Subject[];
}

// Every name lookup resolves against the ReportData bag itself, not a global
// mock array — these ids are real database ids with no meaning outside the
// already campus-scoped lists passed in.
function campusNameIn(d: ReportData, id: string) {
  return d.campuses.find((c) => c.id === id)?.name ?? "—";
}
function classLabelIn(d: ReportData, id: string) {
  const c = d.classes.find((c) => c.id === id);
  return c ? `${c.grade}-${c.section}` : "—";
}
function teacherNameIn(d: ReportData, id: string) {
  return d.teachers.find((t) => t.id === id)?.name ?? "—";
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto max-h-96">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-outline-variant">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-label-sm text-on-surface-variant uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-body-md text-on-surface">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const comingSoon = (
  <EmptyState icon="info" title="Not available in this prototype" description="This report isn't wired up to sample data yet." />
);

export const REPORTS: Record<string, { title: string; category: string; render: (d: ReportData) => React.ReactNode }> = {
  enrollment_summary: {
    title: "Enrollment Summary",
    category: "Student Reports",
    render: (d) => (
      <SimpleTable
        headers={["Campus", "Total Students", "Active", "Inactive"]}
        rows={d.campuses.map((c) => {
          const s = d.students.filter((s) => s.campusId === c.id);
          return [campusNameIn(d, c.id), s.length, s.filter((x) => x.status === "active").length, s.filter((x) => x.status === "inactive").length];
        })}
      />
    ),
  },
  demographic_breakdown: {
    title: "Demographic Breakdown",
    category: "Student Reports",
    render: (d) => (
      <SimpleTable
        headers={["Grade", "Male", "Female", "Total"]}
        rows={Array.from(new Set(d.classes.map((c) => c.grade))).map((grade) => {
          const s = d.students.filter((s) => d.classes.find((c) => c.id === s.classId)?.grade === grade);
          return [grade, s.filter((x) => x.gender === "male").length, s.filter((x) => x.gender === "female").length, s.length];
        })}
      />
    ),
  },
  performance_overview: {
    title: "Performance Overview",
    category: "Student Reports",
    render: (d) => {
      const completed = d.exams.filter((e) => e.status === "completed");
      return (
        <SimpleTable
          headers={["Grade", "Avg %"]}
          rows={Array.from(new Set(d.classes.map((c) => c.grade))).map((grade) => {
            const classIds = d.classes.filter((c) => c.grade === grade).map((c) => c.id);
            const studentIds = new Set(d.students.filter((s) => classIds.includes(s.classId)).map((s) => s.id));
            const entries = d.marks.filter((m) => studentIds.has(m.studentId) && completed.some((e) => e.id === m.examId));
            const pct = entries.length ? Math.round((entries.reduce((s, e) => s + e.obtainedMarks, 0) / entries.reduce((s, e) => s + e.totalMarks, 0)) * 100) : 0;
            return [grade, `${pct}%`];
          })}
        />
      );
    },
  },
  daily_attendance_log: {
    title: "Daily Attendance Log",
    category: "Attendance Reports",
    render: (d) => {
      const today = new Date().toISOString().slice(0, 10);
      return (
        <SimpleTable
          headers={["Class", "Present", "Absent", "Leave", "Rate"]}
          rows={d.classes.map((c) => {
            const records = d.attendance.filter((a) => a.classId === c.id && a.date === today);
            const present = records.filter((r) => r.status === "present" || r.status === "late").length;
            return [
              classLabelIn(d, c.id),
              present,
              records.filter((r) => r.status === "absent").length,
              records.filter((r) => r.status === "leave").length,
              `${records.length ? Math.round((present / records.length) * 100) : 0}%`,
            ];
          })}
        />
      );
    },
  },
  monthly_summary: {
    title: "Monthly Summary",
    category: "Attendance Reports",
    render: (d) => (
      <SimpleTable
        headers={["Class", "Records", "Attendance Rate"]}
        rows={d.classes.map((c) => {
          const records = d.attendance.filter((a) => a.classId === c.id);
          return [classLabelIn(d, c.id), records.length, `${attendanceRate(records)}%`];
        })}
      />
    ),
  },
  low_attendance_alert: {
    title: "Low Attendance Alert",
    category: "Attendance Reports",
    render: (d) => {
      const flagged = d.students
        .filter((s) => s.status === "active")
        .map((s) => ({ s, rate: attendanceRate(d.attendance.filter((a) => a.studentId === s.id)) }))
        .filter((x) => x.rate < 85)
        .sort((a, b) => a.rate - b.rate);
      return flagged.length ? (
        <SimpleTable headers={["Student", "Class", "Attendance Rate"]} rows={flagged.map(({ s, rate }) => [s.name, classLabelIn(d, s.classId), <StatusBadge key={s.id} label={`${rate}%`} tone="error" />])} />
      ) : (
        <EmptyState icon="check_circle" title="No students flagged" description="Everyone is at or above 85% attendance." />
      );
    },
  },
  custom_attendance_query: { title: "Custom Attendance Query", category: "Attendance Reports", render: () => comingSoon },
  defaulters_list: {
    title: "Defaulters List",
    category: "Fee Reports",
    render: (d) => {
      const overdue = d.invoices.filter((i) => i.status === "overdue" || i.status === "unpaid");
      return (
        <SimpleTable
          headers={["Student", "Month", "Balance", "Status"]}
          rows={overdue.map((i) => {
            const s = d.students.find((x) => x.id === i.studentId);
            return [s?.name ?? "—", i.month, formatPKR(i.totalAmount - i.paidAmount), <StatusBadge key={i.id} label={i.status} tone="error" />];
          })}
        />
      );
    },
  },
  collection_summary: {
    title: "Collection Summary",
    category: "Fee Reports",
    render: (d) => {
      const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return (
        <SimpleTable
          headers={["Campus", "Collected", "Outstanding"]}
          rows={d.campuses.map((c) => {
            const invs = d.invoices.filter((i) => d.students.find((s) => s.id === i.studentId)?.campusId === c.id && i.month === currentMonthLabel);
            return [campusNameIn(d, c.id), formatPKR(invs.reduce((s, i) => s + i.paidAmount, 0)), formatPKR(invs.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0))];
          })}
        />
      );
    },
  },
  revenue_forecast: { title: "Revenue Forecast", category: "Fee Reports", render: () => comingSoon },
  gradebook_export: { title: "Gradebook Export", category: "Academic Reports", render: () => comingSoon },
  subject_averages: {
    title: "Subject Averages",
    category: "Academic Reports",
    render: (d) => (
      <SimpleTable
        headers={["Subject", "Avg %"]}
        rows={d.subjects.map((subj) => {
          const entries = d.marks.filter((m) => m.subjectId === subj.id);
          const pct = entries.length ? Math.round((entries.reduce((s, e) => s + e.obtainedMarks, 0) / entries.reduce((s, e) => s + e.totalMarks, 0)) * 100) : 0;
          return [subj.name, entries.length ? `${pct}%` : "—"];
        })}
      />
    ),
  },
  exam_allocations: {
    title: "Exam Allocations",
    category: "Academic Reports",
    render: (d) => (
      <SimpleTable
        headers={["Exam", "Term", "Classes", "Date Range"]}
        rows={d.exams.map((e) => [e.name, e.term, e.classIds.map((id) => classLabelIn(d, id)).join(", "), `${formatDate(e.startDate)} – ${formatDate(e.endDate)}`])}
      />
    ),
  },
  workload_distribution: {
    title: "Workload Distribution",
    category: "Teacher Reports",
    render: (d) => (
      <SimpleTable
        headers={["Teacher", "Classes", "Students"]}
        rows={d.teachers.map((t) => [teacherNameIn(d, t.id), t.classIds.length, d.students.filter((s) => t.classIds.includes(s.classId)).length])}
      />
    ),
  },
  leave_summary: { title: "Leave Summary", category: "Teacher Reports", render: () => comingSoon },
  performance_metrics: { title: "Performance Metrics", category: "Teacher Reports", render: () => comingSoon },
};

export const REPORT_CATEGORIES = [
  { key: "Student Reports", icon: "group" },
  { key: "Attendance Reports", icon: "event_available" },
  { key: "Fee Reports", icon: "payments" },
  { key: "Academic Reports", icon: "menu_book" },
  { key: "Teacher Reports", icon: "school" },
];
