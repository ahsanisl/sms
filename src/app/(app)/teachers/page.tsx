"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/teacher-form";
import { TeacherRowActions } from "@/components/teachers/teacher-row-actions";
import { useTeachers } from "@/lib/store/hooks";
import { CAMPUSES, SUBJECTS, classLabel } from "@/lib/mock/reference-data";
import type { Teacher } from "@/lib/types";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";

export default function TeachersPage() {
  const { teachers, addTeacher } = useTeachers();
  const { user } = useSession();
  const { scopedCampusId } = useCampusScope();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const scoped = user?.role === "teacher"
    ? teachers.filter((t) => t.campusId === user.campusId)
    : scopedCampusId
      ? teachers.filter((t) => t.campusId === scopedCampusId)
      : teachers;

  function handleAdd(values: TeacherFormValues) {
    addTeacher({ ...values, classIds: [] });
    toast.success(`${values.name} was added to the faculty list.`);
    setAddOpen(false);
  }

  const columns: Column<Teacher>[] = [
    {
      key: "name",
      header: "Teacher",
      sortable: true,
      accessor: (t) => t.name,
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={t.name} />
          <span className="font-semibold text-primary">{t.name}</span>
        </div>
      ),
    },
    { key: "employeeId", header: "Employee ID", accessor: (t) => t.employeeId, className: "text-on-surface-variant" },
    {
      key: "subjects",
      header: "Subjects",
      accessor: (t) => t.subjectIds.map((id) => SUBJECTS.find((s) => s.id === id)?.name).join(", "),
      className: "text-on-surface-variant",
    },
    {
      key: "classes",
      header: "Classes",
      accessor: (t) => t.classIds.map((id) => classLabel(id)).join(", ") || "—",
      className: "text-on-surface-variant",
    },
    { key: "phone", header: "Phone", accessor: (t) => t.phone, className: "text-on-surface-variant" },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge label={t.status === "active" ? "Active" : "Inactive"} tone={t.status === "active" ? "info" : "neutral"} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Manage faculty records, subjects and class assignments."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Teacher
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={scoped}
        rowKey={(t) => t.id}
        searchPlaceholder="Search by name, employee ID or subject…"
        searchKeys={(t) => [t.name, t.employeeId, t.email, ...t.subjectIds.map((id) => SUBJECTS.find((s) => s.id === id)?.name ?? "")]}
        filters={[
          { key: "campusId", label: "Campus", options: CAMPUSES.map((c) => ({ label: c.name, value: c.id })) },
          { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
        ]}
        filterFn={(t, values) => (!values.campusId || t.campusId === values.campusId) && (!values.status || t.status === values.status)}
        rowActions={(t) => <TeacherRowActions teacher={t} />}
        onRowClick={(t) => router.push(`/teachers/${t.id}`)}
        emptyTitle="No teachers found"
        emptyDescription="Try adjusting your search or filters, or add a new teacher."
      />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Teacher" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <TeacherForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>
    </div>
  );
}
