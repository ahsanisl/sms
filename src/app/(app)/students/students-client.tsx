"use client";

import { todayIso } from "@/lib/dates";
import { useState } from "react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Upload, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { StudentRowActions } from "@/components/students/student-row-actions";
import { ImportStudentsDialog } from "@/components/students/import-students-dialog";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv-export";
import { STUDENT_CSV_HEADERS, STUDENT_EXPORT_EXTRA_HEADERS, studentCsvRow } from "@/lib/student-csv";
import type { Campus, ClassSection, Student } from "@/lib/types";

interface StudentRow extends Student {
  classLabel: string;
  campusName: string;
  attendanceRate: number;
  feeStatus: "paid" | "unpaid" | "overdue" | "partial";
}

export function StudentsClient({
  students,
  classes,
  campuses,
  canManage,
}: {
  students: StudentRow[];
  classes: ClassSection[];
  campuses: Campus[];
  canManage: boolean;
}) {
  const router = useLoadingRouter();
  const [importOpen, setImportOpen] = useState(false);

  const columns: Column<StudentRow>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      accessor: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} />
          <span className="font-semibold text-primary">{s.name}</span>
        </div>
      ),
    },
    { key: "rollNumber", header: "Roll No.", sortable: true, accessor: (s) => s.rollNumber, className: "text-on-surface-variant tabular-nums" },
    { key: "class", header: "Class", sortable: true, accessor: (s) => s.classLabel, className: "text-on-surface-variant" },
    { key: "parentName", header: "Parent", accessor: (s) => s.parentName, className: "text-on-surface-variant" },
    {
      key: "attendance",
      header: "Attendance",
      sortable: true,
      className: "text-right font-medium tabular-nums",
      accessor: (s) => s.attendanceRate,
      render: (s) => <span className={s.attendanceRate >= 90 ? "text-success" : s.attendanceRate >= 75 ? "text-on-surface" : "text-error"}>{s.attendanceRate}%</span>,
    },
    {
      key: "feeStatus",
      header: "Fee Status",
      render: (s) => {
        const tone = s.feeStatus === "paid" ? "success" : s.feeStatus === "overdue" ? "error" : s.feeStatus === "partial" ? "warning" : "error";
        return <StatusBadge label={s.feeStatus[0].toUpperCase() + s.feeStatus.slice(1)} tone={tone} />;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge label={STUDENT_STATUS_LABEL[s.status]} tone={studentStatusTone(s.status)} />,
    },
  ];

  function handleExport() {
    // Same columns as the import template (lib/student-csv.ts), so this file can be edited and imported back; the last two columns are informational.
    downloadCsv(
      `students-${todayIso()}`,
      [...STUDENT_CSV_HEADERS, ...STUDENT_EXPORT_EXTRA_HEADERS],
      students.map((s) => [...studentCsvRow(s, s.classLabel, s.campusName), s.attendanceRate, STUDENT_STATUS_LABEL[s.status]]),
    );
    toast.success(`Exported ${students.length} student${students.length === 1 ? "" : "s"}.`);
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage and view all enrolled student records."
        actions={
          canManage && (
            <>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/students/alumni">Alumni Directory</Link>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExport}>
                <Download size={16} /> Export
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={16} /> Import Students
              </Button>
              <Button size="sm" asChild>
                <Link href="/students/new">
                  <Plus size={16} /> Add Student
                </Link>
              </Button>
            </>
          )
        }
      />

      <DataTable
        columns={columns}
        data={students}
        rowKey={(s) => s.id}
        searchPlaceholder="Search by student name, ID or parent…"
        searchKeys={(s) => [s.name, s.rollNumber, s.admissionNo, s.parentName]}
        filters={[
          { key: "campusId", label: "Campus", options: campuses.map((c) => ({ label: c.name, value: c.id })) },
          { key: "classId", label: "Class", options: classes.map((c) => ({ label: `${c.grade}-${c.section}`, value: c.id })) },
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Withdrawn", value: "withdrawn" },
              { label: "Alumni", value: "alumni" },
            ],
          },
        ]}
        filterFn={(s, values) =>
          (!values.campusId || s.campusId === values.campusId) &&
          (!values.classId || s.classId === values.classId) &&
          (!values.status || s.status === values.status)
        }
        rowActions={canManage ? (s) => <StudentRowActions student={s} campuses={campuses} classes={classes} /> : undefined}
        onRowClick={(s) => router.push(`/students/${s.id}`)}
        emptyTitle="No students found"
        emptyDescription="Try adjusting your search or filters, or add a new student."
      />
      {canManage && <ImportStudentsDialog open={importOpen} onOpenChange={setImportOpen} classes={classes} campuses={campuses} existingStudents={students} />}
    </div>
  );
}
