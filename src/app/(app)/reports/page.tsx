"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/shared/icon";
import { Modal } from "@/components/shared/modal";
import { REPORTS, REPORT_CATEGORIES } from "@/components/reports/report-registry";
import { useStudents, useAttendanceStore, useFeesStore, useExamsStore, useCampuses, useSubjects, useClasses, useTeachers } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";

export default function ReportsCenterPage() {
  const { students: allStudents } = useStudents();
  const { attendance: allAttendance } = useAttendanceStore();
  const { invoices: allInvoices } = useFeesStore();
  const { marks: allMarks, exams: allExams } = useExamsStore();
  const { campuses: allCampuses } = useCampuses();
  const { classes: allClasses } = useClasses();
  const { teachers: allTeachers } = useTeachers();
  const { subjects } = useSubjects();
  const { scopedCampusId, isAllCampuses } = useCampusScope();
  const [activeReport, setActiveReport] = useState<string | null>(null);

  // Scope every row-source array to the viewer's campus so report renderers
  // (report-registry.tsx) never fall back to reading the unfiltered static data.
  const campuses = scopedCampusId ? allCampuses.filter((c) => c.id === scopedCampusId) : allCampuses;
  const classes = scopedCampusId ? allClasses.filter((c) => c.campusId === scopedCampusId) : allClasses;
  const teachers = scopedCampusId ? allTeachers.filter((t) => t.campusId === scopedCampusId) : allTeachers;
  const students = scopedCampusId ? allStudents.filter((s) => s.campusId === scopedCampusId) : allStudents;
  const scopedStudentIds = new Set(students.map((s) => s.id));
  const attendance = scopedCampusId ? allAttendance.filter((a) => scopedStudentIds.has(a.studentId)) : allAttendance;
  const invoices = scopedCampusId ? allInvoices.filter((i) => scopedStudentIds.has(i.studentId)) : allInvoices;
  const marks = scopedCampusId ? allMarks.filter((m) => scopedStudentIds.has(m.studentId)) : allMarks;
  const exams = scopedCampusId ? allExams.filter((e) => e.campusId === scopedCampusId) : allExams;

  const reportData = { students, attendance, invoices, marks, exams, campuses, classes, teachers, subjects };
  const entries = Object.entries(REPORTS);

  return (
    <div>
      <PageHeader
        title="Reports Center"
        description={
          isAllCampuses
            ? "Generate and export detailed reports across every module."
            : "Generate and export detailed reports for this campus."
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {REPORT_CATEGORIES.map((cat) => (
          <div key={cat.key} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center">
                <Icon name={cat.icon} className="h-5 w-5" />
              </div>
              <h3 className="text-title-lg font-semibold text-on-surface">{cat.key}</h3>
            </div>
            <ul className="space-y-1 flex-1">
              {entries
                .filter(([, r]) => r.category === cat.key)
                .map(([key, r]) => (
                  <li key={key}>
                    <button
                      onClick={() => setActiveReport(key)}
                      className="group w-full cursor-pointer rounded-md hover:bg-surface-container-low transition-colors px-2 py-2 -mx-2 flex items-center justify-between text-left"
                    >
                      <span className="text-body-md text-on-surface">{r.title}</span>
                      <ChevronRight className="h-4 w-4 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <Modal
        open={!!activeReport}
        onOpenChange={(open) => !open && setActiveReport(null)}
        title={activeReport ? REPORTS[activeReport].title : ""}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {activeReport && REPORTS[activeReport].render(reportData)}
      </Modal>
    </div>
  );
}
