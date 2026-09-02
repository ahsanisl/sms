"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DepartmentForm, type DepartmentFormValues } from "@/components/settings/department-form";
import { createDepartmentAction, updateDepartmentAction, archiveDepartmentAction } from "@/app/(app)/settings/departments/actions";
import type { Campus, Subject, Teacher } from "@/lib/types";

interface DepartmentRow {
  id: string;
  name: string;
  campusId: string;
  campusName: string;
  subjectIds: string[];
  subjectNames: string;
  headTeacherId?: string;
  headTeacherName: string;
  status: "active" | "archived";
  memberCount: number;
}

export function DepartmentsClient({
  departments,
  campuses,
  subjects,
  teachers,
}: {
  departments: DepartmentRow[];
  campuses: Campus[];
  subjects: Subject[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [archiving, setArchiving] = useState<DepartmentRow | null>(null);

  async function handleAdd(values: DepartmentFormValues) {
    const result = await createDepartmentAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} was created.`);
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(values: DepartmentFormValues) {
    if (!editing) return;
    const result = await updateDepartmentAction(editing.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} was updated.`);
    setEditing(null);
    router.refresh();
  }

  async function handleArchive() {
    if (!archiving) return;
    const result = await archiveDepartmentAction(archiving.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
    router.refresh();
  }

  const columns: Column<DepartmentRow>[] = [
    { key: "name", header: "Department", sortable: true, accessor: (d) => d.name, render: (d) => <span className="font-medium text-primary">{d.name}</span> },
    { key: "campus", header: "Campus", accessor: (d) => d.campusName, className: "text-on-surface-variant" },
    { key: "subjects", header: "Subjects", accessor: (d) => d.subjectNames, className: "text-on-surface-variant max-w-xs truncate" },
    { key: "head", header: "Head of Department", accessor: (d) => d.headTeacherName, className: "text-on-surface-variant" },
    { key: "members", header: "Members", accessor: (d) => d.memberCount, className: "text-on-surface-variant" },
    { key: "status", header: "Status", render: (d) => <StatusBadge label={d.status === "active" ? "Active" : "Archived"} tone={d.status === "active" ? "success" : "neutral"} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          <button className="text-label-md text-secondary hover:underline" onClick={() => setEditing(d)}>Edit</button>
          {d.status === "active" && (
            <button className="text-label-md text-error hover:underline" onClick={() => setArchiving(d)}>Archive</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Group subjects and teaching staff under a department with a head of department."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Department
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={departments}
        rowKey={(d) => d.id}
        searchPlaceholder="Search departments…"
        searchKeys={(d) => [d.name]}
        filters={[{ key: "campusId", label: "Campus", options: campuses.map((c) => ({ value: c.id, label: c.name })) }]}
        filterFn={(d, values) => !values.campusId || d.campusId === values.campusId}
      />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Department" className="max-w-[32rem]">
        <DepartmentForm campuses={campuses} subjects={subjects} teachers={teachers} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Department" className="max-w-[32rem]">
        {editing && (
          <DepartmentForm
            campuses={campuses}
            subjects={subjects}
            teachers={teachers}
            initialValues={{
              id: editing.id,
              name: editing.name,
              campusId: editing.campusId,
              subjectIds: editing.subjectIds,
              headTeacherId: editing.headTeacherId,
              status: editing.status,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this department?"
        description={archiving ? `${archiving.name} will no longer appear as an active grouping, but existing records keep it.` : undefined}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
