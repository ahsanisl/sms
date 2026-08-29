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
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/teacher-form";
import { useTeachers } from "@/lib/store/hooks";
import type { Teacher } from "@/lib/types";

export function TeacherRowActions({ teacher }: { teacher: Teacher }) {
  const router = useRouter();
  const { updateTeacher, deleteTeacher } = useTeachers();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleEditSubmit(values: TeacherFormValues) {
    updateTeacher({ ...values, id: teacher.id, classIds: teacher.classIds });
    toast.success(`${values.name}'s record was updated.`);
    setEditOpen(false);
  }

  function handleDelete() {
    deleteTeacher(teacher.id);
    toast.success(`${teacher.name} was removed.`);
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        <button
          className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/10 rounded transition-colors"
          title="View Profile"
          onClick={() => router.push(`/teachers/${teacher.id}`)}
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
              <Trash2 className="h-4 w-4" /> Remove Teacher
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Teacher" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <TeacherForm initialValues={teacher} submitLabel="Save Changes" onSubmit={handleEditSubmit} onCancel={() => setEditOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this teacher?"
        description={`This removes ${teacher.name} from the faculty list for this demo session.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
    </>
  );
}
