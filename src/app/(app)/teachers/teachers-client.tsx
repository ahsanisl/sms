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
import { createTeacherAction } from "@/app/(app)/teachers/actions";
import type { Campus, Subject, Teacher } from "@/lib/types";

interface TeacherRow extends Teacher {
  subjectNames: string;
  classLabels: string;
}

export function TeachersClient({ teachers, campuses, subjects }: { teachers: TeacherRow[]; campuses: Campus[]; subjects: Subject[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  async function handleAdd(values: TeacherFormValues) {
    const result = await createTeacherAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} was added to the faculty list.`);
    setAddOpen(false);
    router.refresh();
  }

  const columns: Column<TeacherRow>[] = [
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
    { key: "subjects", header: "Subjects", accessor: (t) => t.subjectNames, className: "text-on-surface-variant" },
    { key: "classes", header: "Classes", accessor: (t) => t.classLabels || "—", className: "text-on-surface-variant" },
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
        data={teachers}
        rowKey={(t) => t.id}
        searchPlaceholder="Search by name, employee ID or subject…"
        searchKeys={(t) => [t.name, t.employeeId, t.email, t.subjectNames]}
        filters={[
          { key: "campusId", label: "Campus", options: campuses.map((c) => ({ label: c.name, value: c.id })) },
          { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
        ]}
        filterFn={(t, values) => (!values.campusId || t.campusId === values.campusId) && (!values.status || t.status === values.status)}
        rowActions={(t) => <TeacherRowActions teacher={t} campuses={campuses} subjects={subjects} />}
        onRowClick={(t) => router.push(`/teachers/${t.id}`)}
        emptyTitle="No teachers found"
        emptyDescription="Try adjusting your search or filters, or add a new teacher."
      />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Teacher" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <TeacherForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} campuses={campuses} subjects={subjects} />
      </Modal>
    </div>
  );
}
