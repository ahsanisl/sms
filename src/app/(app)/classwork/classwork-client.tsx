"use client";

import { useState } from "react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ClassworkForm } from "@/components/classwork/classwork-form";
import { createClassworkAction, updateClassworkAction, deleteClassworkAction } from "@/app/(app)/classwork/actions";
import { formatDate } from "@/lib/format";

interface ClassworkRow {
  id: string;
  classId: string;
  classLabel: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  date: string;
  title: string;
  description: string;
}

interface ClassOption {
  id: string;
  label: string;
  subjectIds: string[];
  campusId: string;
}

export function ClassworkClient({
  rows,
  classes,
  subjects,
  teachers,
  canManage,
  isTeacher,
}: {
  rows: ClassworkRow[];
  classes: ClassOption[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string; campusId: string }[];
  canManage: boolean;
  isTeacher: boolean;
}) {
  const router = useLoadingRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ClassworkRow | null>(null);
  const [deleting, setDeleting] = useState<ClassworkRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const classCampusById = Object.fromEntries(classes.map((c) => [c.id, c.campusId]));

  async function handleAdd(formData: FormData) {
    setSubmitting(true);
    const result = await createClassworkAction(formData);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Classwork posted.");
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(formData: FormData) {
    if (!editing) return;
    setSubmitting(true);
    const result = await updateClassworkAction(editing.id, formData);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Classwork updated.");
    setEditing(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteClassworkAction(deleting.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Classwork removed.");
    setDeleting(null);
    router.refresh();
  }

  const columns: Column<ClassworkRow>[] = [
    { key: "date", header: "Date", sortable: true, accessor: (r) => r.date, render: (r) => formatDate(r.date), className: "text-on-surface-variant whitespace-nowrap" },
    { key: "class", header: "Class", accessor: (r) => r.classLabel },
    { key: "subject", header: "Subject", accessor: (r) => r.subjectName, className: "text-on-surface-variant" },
    {
      key: "title",
      header: "Title",
      sortable: true,
      accessor: (r) => r.title,
      render: (r) => <span className="font-medium text-on-surface">{r.title}</span>,
    },
    { key: "teacher", header: "Teacher", accessor: (r) => r.teacherName, className: "text-on-surface-variant" },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (r: ClassworkRow) => (
              <div className="flex items-center justify-end gap-2">
                <button className="text-label-md text-secondary hover:underline" onClick={() => setEditing(r)}>Edit</button>
                <button className="text-label-md text-error hover:underline" onClick={() => setDeleting(r)}>Delete</button>
              </div>
            ),
          } satisfies Column<ClassworkRow>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Classwork"
        description="A day-by-day log of what each class covered — teacher-authored, no student submission."
        actions={
          canManage && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Post Classwork
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        searchPlaceholder="Search classwork…"
        searchKeys={(r) => [r.title, r.description]}
        filters={[{ key: "classId", label: "Class", options: classes.map((c) => ({ value: c.id, label: c.label })) }]}
        filterFn={(r, values) => !values.classId || r.classId === values.classId}
      />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Post Classwork" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <ClassworkForm
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          classCampusById={classCampusById}
          isTeacher={isTeacher}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Classwork" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {editing && (
          <ClassworkForm
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            classCampusById={classCampusById}
            isTeacher={isTeacher}
            initialValues={{
              classId: editing.classId,
              subjectId: editing.subjectId,
              teacherId: editing.teacherId,
              date: editing.date,
              title: editing.title,
              description: editing.description,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this classwork entry?"
        description={deleting ? `"${deleting.title}" (${deleting.classLabel}, ${formatDate(deleting.date)}) will be permanently removed.` : undefined}
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
    </div>
  );
}
