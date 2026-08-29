"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, Archive, GraduationCap } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Avatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassForm, type ClassFormValues } from "@/components/classes/class-form";
import { useClasses, useStudents, useTimetableConfig, usePermissions } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { SUBJECTS, campusName, classLabel, teacherName } from "@/lib/mock/reference-data";
import { timetableForClass } from "@/lib/mock/timetable";
import { attendanceForStudent, attendanceRate } from "@/lib/mock/attendance";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/mock/students";
import type { Student } from "@/lib/types";

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useSession();
  const { routePermissions } = usePermissions();
  const canManageStudents = !!user && !!routePermissions[user.role]?.studentsManage;
  const canManageClasses = !!user && !!routePermissions[user.role]?.classesManage;
  const { students } = useStudents();
  const { classes, updateClass, archiveClass } = useClasses();
  const { workingDays } = useTimetableConfig();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const cls = classes.find((c) => c.id === id);
  if (!cls) {
    return (
      <EmptyState
        icon="class"
        title="Class not found"
        description="Go back to Classes & Sections."
        actionLabel="Back to Classes"
        onAction={() => router.push("/classes")}
      />
    );
  }

  const roster = students.filter((s) => s.classId === id);
  const avgAttendance = roster.length
    ? Math.round(roster.reduce((sum, s) => sum + attendanceRate(attendanceForStudent(s.id)), 0) / roster.length)
    : 0;
  const slots = timetableForClass(id);

  function handleEdit(values: ClassFormValues) {
    updateClass({ ...values, id: cls!.id });
    toast.success(`${classLabel({ ...cls!, ...values })} was updated.`);
    setEditOpen(false);
  }

  function handleArchive() {
    archiveClass(cls!.id);
    toast.success(`${classLabel(cls!)} was archived.`);
    router.push("/classes");
  }

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
    { key: "parentName", header: "Parent", accessor: (s) => s.parentName, className: "text-on-surface-variant" },
    {
      key: "attendance",
      header: "Attendance",
      className: "text-right font-medium",
      accessor: (s) => attendanceRate(attendanceForStudent(s.id)),
      render: (s) => `${attendanceRate(attendanceForStudent(s.id))}%`,
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
            <h1 className="text-headline-lg font-semibold text-primary">{classLabel(cls)}</h1>
            {cls.status === "archived" && <StatusBadge label="Archived" tone="neutral" />}
          </div>
          <p className="text-body-md text-on-surface-variant mt-1">
            {campusName(cls.campusId)} · Class Teacher: {teacherName(cls.classTeacherId)}
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

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster">Student Roster</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <DataTable
            columns={columns}
            data={roster}
            rowKey={(s) => s.id}
            searchPlaceholder="Search students in this class…"
            searchKeys={(s) => [s.name, s.rollNumber]}
            onRowClick={(s) => router.push(`/students/${s.id}`)}
            emptyTitle="No students in this class yet"
          />
        </TabsContent>

        <TabsContent value="timetable">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {workingDays.map((day) => (
              <div key={day} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
                <p className="text-label-md font-semibold text-primary mb-3">{day}</p>
                <div className="space-y-2">
                  {slots
                    .filter((s) => s.day === day)
                    .sort((a, b) => a.period - b.period)
                    .map((s) => (
                      <div key={s.id} className="text-label-sm text-on-surface-variant border-l-2 border-secondary pl-2">
                        <p className="text-on-surface font-medium">{SUBJECTS.find((sub) => sub.id === s.subjectId)?.name}</p>
                        <p>{s.startTime} · {teacherName(s.teacherId)}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Class" className="max-w-[32rem]">
        <ClassForm initialValues={cls} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this class?"
        description={`${classLabel(cls)} will be hidden from new student enrollment and new class assignments, but existing records are kept.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
