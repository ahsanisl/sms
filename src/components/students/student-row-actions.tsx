"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { updateStudentAction, deleteStudentAction } from "@/app/(app)/students/actions";
import type { Campus, ClassSection, Student } from "@/lib/types";

export function StudentRowActions({ student, campuses, classes }: { student: Student; campuses?: Campus[]; classes?: ClassSection[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleEditSubmit(values: StudentFormValues) {
    const result = await updateStudentAction(student.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name}'s record was updated.`);
    setEditOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deleteStudentAction(student.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${student.name} was removed.`);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        <button
          className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/10 rounded transition-colors"
          title="View Profile"
          onClick={() => router.push(`/students/${student.id}`)}
        >
          <Eye size={18} />
        </button>
        <button
          className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/10 rounded transition-colors"
          title="Edit"
          onClick={() => setEditOpen(true)}
        >
          <Pencil size={18} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/10 rounded transition-colors outline-none"
            title="More Actions"
          >
            <MoreVertical size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Remove Student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Student" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <StudentForm initialValues={student} submitLabel="Save Changes" onSubmit={handleEditSubmit} onCancel={() => setEditOpen(false)} campuses={campuses} classes={classes} />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this student?"
        description={`This permanently deletes ${student.name}'s record. Students with fee payment history can't be removed this way — withdraw them instead.`}
        confirmLabel={busy ? "Removing…" : "Remove"}
        onConfirm={handleDelete}
      />
    </>
  );
}
