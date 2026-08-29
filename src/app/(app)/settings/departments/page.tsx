"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DepartmentForm, type DepartmentFormValues } from "@/components/settings/department-form";
import { useDepartments, useTeachers, useCampuses } from "@/lib/store/hooks";
import { campusName, subjectName, teacherName } from "@/lib/mock/reference-data";
import type { Department } from "@/lib/types";

export default function DepartmentsPage() {
  const { departments, addDepartment, updateDepartment, archiveDepartment } = useDepartments();
  const { teachers } = useTeachers();
  const { campuses } = useCampuses();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [archiving, setArchiving] = useState<Department | null>(null);

  function handleAdd(values: DepartmentFormValues) {
    addDepartment({ ...values, status: "active" });
    toast.success(`${values.name} was created.`);
    setAddOpen(false);
  }

  function handleEdit(values: DepartmentFormValues) {
    if (!editing) return;
    updateDepartment({ ...editing, ...values });
    toast.success(`${values.name} was updated.`);
    setEditing(null);
  }

  function handleArchive() {
    if (!archiving) return;
    archiveDepartment(archiving.id);
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
  }

  function memberCount(dept: Department) {
    return teachers.filter((t) => t.status === "active" && t.campusId === dept.campusId && t.subjectIds.some((s) => dept.subjectIds.includes(s))).length;
  }

  const columns: Column<Department>[] = [
    { key: "name", header: "Department", sortable: true, accessor: (d) => d.name, render: (d) => <span className="font-medium text-primary">{d.name}</span> },
    { key: "campus", header: "Campus", accessor: (d) => campusName(d.campusId), className: "text-on-surface-variant" },
    {
      key: "subjects",
      header: "Subjects",
      accessor: (d) => d.subjectIds.map((s) => subjectName(s)).join(", "),
      className: "text-on-surface-variant max-w-xs truncate",
    },
    {
      key: "head",
      header: "Head of Department",
      accessor: (d) => (d.headTeacherId ? teacherName(d.headTeacherId) : "Unassigned"),
      className: "text-on-surface-variant",
    },
    { key: "members", header: "Members", accessor: (d) => memberCount(d), className: "text-on-surface-variant" },
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
        <DepartmentForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Department" className="max-w-[32rem]">
        {editing && <DepartmentForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
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
