"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { StudentRowActions } from "@/components/students/student-row-actions";
import { useStudents, usePermissions } from "@/lib/store/hooks";
import { CAMPUSES, CLASSES, classLabel, campusName } from "@/lib/mock/reference-data";
import { attendanceForStudent, attendanceRate } from "@/lib/mock/attendance";
import { invoicesForStudent } from "@/lib/mock/fees";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/mock/students";
import { downloadCsv } from "@/lib/csv-export";
import type { Student } from "@/lib/types";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";

export default function StudentsPage() {
  const { students } = useStudents();
  const { user } = useSession();
  const { routePermissions } = usePermissions();
  const { scopedCampusId } = useCampusScope();
  const router = useRouter();
  const canManage = !!user && !!routePermissions[user.role]?.studentsManage;

  const scoped = user?.role === "teacher"
    ? students.filter((s) => s.campusId === user.campusId)
    : user?.role === "parent"
      ? students.filter((s) => user.childStudentIds?.includes(s.id))
      : scopedCampusId
        ? students.filter((s) => s.campusId === scopedCampusId)
        : students;

  const columns: Column<Student>[] = [
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
    { key: "rollNumber", header: "Roll No.", accessor: (s) => s.rollNumber, className: "text-on-surface-variant" },
    {
      key: "class",
      header: "Class",
      sortable: true,
      accessor: (s) => classLabel(s.classId),
      className: "text-on-surface-variant",
    },
    { key: "parentName", header: "Parent", accessor: (s) => s.parentName, className: "text-on-surface-variant" },
    {
      key: "attendance",
      header: "Attendance",
      className: "text-right font-medium",
      accessor: (s) => attendanceRate(attendanceForStudent(s.id)),
      render: (s) => `${attendanceRate(attendanceForStudent(s.id))}%`,
    },
    {
      key: "feeStatus",
      header: "Fee Status",
      render: (s) => {
        const invoice = invoicesForStudent(s.id).find((i) => i.month === "August 2026");
        const status = invoice?.status ?? "unpaid";
        const tone = status === "paid" ? "success" : status === "overdue" ? "error" : status === "partial" ? "warning" : "error";
        return <StatusBadge label={status[0].toUpperCase() + status.slice(1)} tone={tone} />;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge label={STUDENT_STATUS_LABEL[s.status]} tone={studentStatusTone(s.status)} />,
    },
  ];

  function handleExport() {
    downloadCsv(
      "students",
      ["Name", "Roll No.", "Admission No.", "Class", "Campus", "Parent Name", "Parent Phone", "Attendance %", "Status"],
      scoped.map((s) => [
        s.name,
        s.rollNumber,
        s.admissionNo,
        classLabel(s.classId),
        campusName(s.campusId),
        s.parentName,
        s.parentPhone,
        attendanceRate(attendanceForStudent(s.id)),
        STUDENT_STATUS_LABEL[s.status],
      ]),
    );
    toast.success("Students exported.");
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
              <Button variant="secondary" size="sm" onClick={() => toast.info("Bulk student import isn't wired up in this prototype.")}>
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
        data={scoped}
        rowKey={(s) => s.id}
        searchPlaceholder="Search by student name, ID or parent…"
        searchKeys={(s) => [s.name, s.rollNumber, s.admissionNo, s.parentName]}
        filters={[
          { key: "campusId", label: "Campus", options: CAMPUSES.map((c) => ({ label: c.name, value: c.id })) },
          { key: "classId", label: "Class", options: CLASSES.map((c) => ({ label: classLabel(c), value: c.id })) },
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
        rowActions={canManage ? (s) => <StudentRowActions student={s} /> : undefined}
        onRowClick={(s) => router.push(`/students/${s.id}`)}
        emptyTitle="No students found"
        emptyDescription="Try adjusting your search or filters, or add a new student."
      />
    </div>
  );
}
