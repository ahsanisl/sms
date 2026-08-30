"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Archive } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SchoolForm, type SchoolFormValues } from "@/components/settings/school-form";
import { useSchools } from "@/lib/store/hooks";
import type { School } from "@/lib/types";

export default function SchoolManagementPage() {
  const { schools, statsFor, addSchoolWithOwner, updateSchool, archiveSchool } = useSchools();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [archiving, setArchiving] = useState<School | null>(null);

  function handleAdd(values: SchoolFormValues) {
    const { ownerName, ownerEmail, ...schoolValues } = values;
    addSchoolWithOwner({ ...schoolValues, status: "active" }, ownerName!, ownerEmail!);
    toast.success(`${values.name} was added, with ${ownerName} as School Owner.`);
    setAddOpen(false);
  }

  function handleEdit(values: SchoolFormValues) {
    if (!editing) return;
    const { name, tagline, address, phone, email, logoEmoji, reportCardFooter, showSignatureLines } = values;
    updateSchool({ ...editing, name, tagline, address, phone, email, logoEmoji, reportCardFooter, showSignatureLines });
    toast.success(`${values.name} was updated.`);
    setEditing(null);
  }

  function handleArchive() {
    if (!archiving) return;
    archiveSchool(archiving.id);
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
  }

  return (
    <div>
      <PageHeader
        title="Schools"
        description="Every tenant on this platform — add a school, edit its branding, or archive one that's no longer active."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add School
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {schools.map((school) => {
          const stats = statsFor(school.id);
          const isArchived = school.status === "archived";
          return (
            <div
              key={school.id}
              className={`bg-surface-container-lowest border rounded-xl p-lg shadow-sm flex flex-col gap-4 ${isArchived ? "border-outline-variant/50 opacity-60" : "border-outline-variant"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{school.logoEmoji}</span>
                  <div>
                    <h3 className="text-title-lg font-semibold text-on-surface">{school.name}</h3>
                    <p className="text-label-sm text-on-surface-variant mt-0.5">{school.tagline}</p>
                  </div>
                </div>
                <StatusBadge label={isArchived ? "Archived" : "Active"} tone={isArchived ? "neutral" : "success"} />
              </div>
              <p className="text-body-md text-on-surface-variant">{school.address}</p>
              <div className="text-label-sm text-on-surface-variant space-y-1">
                {school.phone && <p>{school.phone}</p>}
                {school.email && <p>{school.email}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/30 pt-3">
                <Stat label="Campuses" value={stats.campuses} />
                <Stat label="Students" value={stats.students} />
                <Stat label="Teachers" value={stats.teachers} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(school)}>
                  <Pencil size={14} /> Edit
                </Button>
                {!isArchived && (
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setArchiving(school)}>
                    <Archive size={14} /> Archive
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add School" className="max-w-[32rem] max-h-[85vh] overflow-y-auto">
        <SchoolForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit School" className="max-w-[32rem] max-h-[85vh] overflow-y-auto">
        {editing && <SchoolForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this school?"
        description={archiving ? `${archiving.name} and its campuses will be hidden from new activity, but historical records are kept.` : undefined}
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
