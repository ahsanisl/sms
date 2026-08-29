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
import { useStudents } from "@/lib/store/hooks";
import type { Student } from "@/lib/types";

export function StudentRowActions({ student }: { student: Student }) {
  const router = useRouter();
  const { updateStudent, deleteStudent } = useStudents();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleEditSubmit(values: StudentFormValues) {
    updateStudent({ ...values, id: student.id });
    toast.success(`${values.name}'s record was updated.`);
    setEditOpen(false);
  }

  function handleDelete() {
    deleteStudent(student.id);
    toast.success(`${student.name} was removed.`);
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
        <StudentForm initialValues={student} submitLabel="Save Changes" onSubmit={handleEditSubmit} onCancel={() => setEditOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this student?"
        description={`This removes ${student.name} from the roster for this demo session.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
    </>
  );
}
