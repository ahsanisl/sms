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
import { SubjectForm, type SubjectFormValues } from "@/components/settings/subject-form";
import { archiveSubjectAction, createSubjectAction, updateSubjectAction } from "@/app/(app)/settings/subjects/actions";
import type { Subject } from "@/lib/types";

interface SubjectWithClassCount extends Subject {
  classCount: number;
}

export function SubjectsClient({ subjects }: { subjects: SubjectWithClassCount[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [archiving, setArchiving] = useState<Subject | null>(null);

  async function handleAdd(values: SubjectFormValues) {
    const result = await createSubjectAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} was added.`);
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(values: SubjectFormValues) {
    if (!editing) return;
    const result = await updateSubjectAction(editing.id, values);
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
    const result = await archiveSubjectAction(archiving.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
    router.refresh();
  }

  const columns: Column<SubjectWithClassCount>[] = [
    { key: "name", header: "Subject", sortable: true, accessor: (s) => s.name, render: (s) => <span className="font-medium text-primary">{s.name}</span> },
    { key: "code", header: "Code", accessor: (s) => s.code, className: "text-on-surface-variant" },
    {
      key: "classes",
      header: "Taught In",
      accessor: (s) => s.classCount,
      render: (s) => `${s.classCount} classes`,
      className: "text-on-surface-variant",
    },
    { key: "status", header: "Status", render: (s) => <StatusBadge label={s.status === "active" ? "Active" : "Archived"} tone={s.status === "active" ? "success" : "neutral"} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <div className="flex items-center justify-end gap-2">
          <button className="text-label-md text-secondary hover:underline" onClick={() => setEditing(s)}>Edit</button>
          {s.status === "active" && (
            <button className="text-label-md text-error hover:underline" onClick={() => setArchiving(s)}>Archive</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subject Management"
        description="Add, edit and archive the subjects taught across the school."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Subject
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={subjects}
        rowKey={(s) => s.id}
        searchPlaceholder="Search subjects…"
        searchKeys={(s) => [s.name, s.code]}
      />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Subject" className="max-w-[24rem]">
        <SubjectForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Subject" className="max-w-[24rem]">
        {editing && <SubjectForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this subject?"
        description={archiving ? `${archiving.name} will no longer be selectable in new classes or exams, but existing records keep it.` : undefined}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
