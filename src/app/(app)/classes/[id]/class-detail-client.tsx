"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, Archive, GraduationCap } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Avatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ClassForm, type ClassFormValues } from "@/components/classes/class-form";
import { archiveClassDetailAction, updateClassDetailAction } from "@/app/(app)/classes/[id]/actions";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/mock/students";
import type { Campus, ClassSection, Student, Teacher } from "@/lib/types";

interface RosterRow extends Student {
  attendanceRate: number;
}

export function ClassDetailClient({
  cls,
  campusName,
  classTeacherName,
  roster,
  avgAttendance,
  canManageStudents,
  canManageClasses,
  campuses,
  teachers,
}: {
  cls: ClassSection;
  campusName: string;
  classTeacherName: string;
  roster: RosterRow[];
  avgAttendance: number;
  canManageStudents: boolean;
  canManageClasses: boolean;
  campuses: Campus[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function handleEdit(values: ClassFormValues) {
    const result = await updateClassDetailAction(cls.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.grade}-${values.section} was updated.`);
    setEditOpen(false);
    router.refresh();
  }

  async function handleArchive() {
    const result = await archiveClassDetailAction(cls.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${cls.grade}-${cls.section} was archived.`);
    router.push("/classes");
  }

  const columns: Column<RosterRow>[] = [
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
    { key: "parentName", header: "Parent", accessor: (s) => s.parentName, className: "text-on-surface-variant" },
    {
      key: "attendance",
      header: "Attendance",
      className: "text-right font-medium",
      accessor: (s) => s.attendanceRate,
      render: (s) => `${s.attendanceRate}%`,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge label={STUDENT_STATUS_LABEL[s.status]} tone={studentStatusTone(s.status)} />,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-headline-lg font-semibold text-primary">{cls.grade}-{cls.section}</h1>
            {cls.status === "archived" && <StatusBadge label="Archived" tone="neutral" />}
          </div>
          <p className="text-body-md text-on-surface-variant mt-1">
            {campusName} · Class Teacher: {classTeacherName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageStudents && cls.status === "active" && (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/students/promote?classId=${cls.id}`}>
                <GraduationCap size={14} /> Promote Students
              </Link>
            </Button>
          )}
          {canManageClasses && (
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Edit
            </Button>
          )}
          {canManageClasses && cls.status === "active" && (
            <Button variant="secondary" size="sm" onClick={() => setArchiveOpen(true)}>
              <Archive size={14} /> Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Students" value={String(roster.length)} icon="group" />
        <StatCard label="Average Attendance" value={`${avgAttendance}%`} icon="fact_check" />
        <StatCard label="Subjects" value={String(cls.subjectIds.length)} icon="menu_book" />
      </div>

      <DataTable
        columns={columns}
        data={roster}
        rowKey={(s) => s.id}
        searchPlaceholder="Search students in this class…"
        searchKeys={(s) => [s.name, s.rollNumber]}
        onRowClick={(s) => router.push(`/students/${s.id}`)}
        emptyTitle="No students in this class yet"
      />

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Class" className="max-w-[32rem]">
        <ClassForm initialValues={cls} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} campuses={campuses} teachers={teachers} />
      </Modal>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this class?"
        description={`${cls.grade}-${cls.section} will be hidden from new student enrollment and new class assignments, but existing records are kept.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
