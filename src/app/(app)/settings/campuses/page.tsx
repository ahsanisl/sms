"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Archive } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CampusForm, type CampusFormValues } from "@/components/settings/campus-form";
import { useCampuses, useClasses, useStudents, useTeachers } from "@/lib/store/hooks";
import type { Campus } from "@/lib/types";

export default function CampusManagementPage() {
  const { campuses, addCampus, updateCampus, archiveCampus } = useCampuses();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { teachers } = useTeachers();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [archiving, setArchiving] = useState<Campus | null>(null);

  function handleAdd(values: CampusFormValues) {
    addCampus({ ...values, status: "active" });
    toast.success(`${values.name} was added.`);
    setAddOpen(false);
  }

  function handleEdit(values: CampusFormValues) {
    if (!editing) return;
    updateCampus({ ...editing, ...values });
    toast.success(`${values.name} was updated.`);
    setEditing(null);
  }

  function handleArchive() {
    if (!archiving) return;
    archiveCampus(archiving.id);
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
  }

  function statsFor(campusId: string) {
    return {
      classes: classes.filter((c) => c.campusId === campusId && c.status === "active").length,
      students: students.filter((s) => s.campusId === campusId && s.status === "active").length,
      teachers: teachers.filter((t) => t.campusId === campusId && t.status === "active").length,
    };
  }

  return (
    <div>
      <PageHeader
        title="Campus Management"
        description="Add, edit and archive campuses across the school."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Campus
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campuses.map((campus) => {
          const stats = statsFor(campus.id);
          const isArchived = campus.status === "archived";
          return (
            <div
              key={campus.id}
              className={`bg-surface-container-lowest border rounded-xl p-lg shadow-sm flex flex-col gap-4 ${isArchived ? "border-outline-variant/50 opacity-60" : "border-outline-variant"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-title-lg font-semibold text-on-surface">{campus.name}</h3>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">{campus.city}</p>
                </div>
                <StatusBadge label={isArchived ? "Archived" : "Active"} tone={isArchived ? "neutral" : "success"} />
              </div>
              <p className="text-body-md text-on-surface-variant">{campus.address}</p>
              <div className="text-label-sm text-on-surface-variant space-y-1">
                {campus.phone && <p>{campus.phone}</p>}
                {campus.email && <p>{campus.email}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/30 pt-3">
                <Stat label="Classes" value={stats.classes} />
                <Stat label="Students" value={stats.students} />
                <Stat label="Teachers" value={stats.teachers} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(campus)}>
                  <Pencil size={14} /> Edit
                </Button>
                {!isArchived && (
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setArchiving(campus)}>
                    <Archive size={14} /> Archive
                  </Button>
                )}
              </div>
              <Link href="/classes" className="text-label-md text-secondary hover:underline text-center">
                View classes →
              </Link>
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Campus" className="max-w-[32rem]">
        <CampusForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Campus" className="max-w-[32rem]">
        {editing && <CampusForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this campus?"
        description={archiving ? `${archiving.name} will be hidden from new enrollments and class assignments, but its historical records are kept.` : undefined}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-headline-sm font-semibold text-primary">{value}</p>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
