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
import { RoomForm, type RoomFormValues } from "@/components/settings/room-form";
import { useRooms } from "@/lib/store/hooks";
import { campusName } from "@/lib/mock/reference-data";
import type { Room } from "@/lib/types";

const TYPE_LABEL: Record<Room["type"], string> = {
  classroom: "Classroom",
  lab: "Lab",
  hall: "Hall / Gymnasium",
  other: "Other",
};

export default function RoomManagementPage() {
  const { rooms, addRoom, updateRoom, archiveRoom } = useRooms();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [archiving, setArchiving] = useState<Room | null>(null);

  function handleAdd(values: RoomFormValues) {
    addRoom({ ...values, status: "active" });
    toast.success(`${values.name} was added.`);
    setAddOpen(false);
  }

  function handleEdit(values: RoomFormValues) {
    if (!editing) return;
    updateRoom({ ...editing, ...values });
    toast.success(`${values.name} was updated.`);
    setEditing(null);
  }

  function handleArchive() {
    if (!archiving) return;
    archiveRoom(archiving.id);
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
  }

  const columns: Column<Room>[] = [
    { key: "name", header: "Room", sortable: true, accessor: (r) => r.name, render: (r) => <span className="font-medium text-primary">{r.name}</span> },
    { key: "campus", header: "Campus", accessor: (r) => campusName(r.campusId), className: "text-on-surface-variant" },
    { key: "type", header: "Type", accessor: (r) => TYPE_LABEL[r.type], className: "text-on-surface-variant" },
    { key: "capacity", header: "Capacity", accessor: (r) => r.capacity, className: "text-on-surface-variant" },
    { key: "status", header: "Status", render: (r) => <StatusBadge label={r.status === "active" ? "Active" : "Archived"} tone={r.status === "active" ? "success" : "neutral"} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button className="text-label-md text-secondary hover:underline" onClick={() => setEditing(r)}>Edit</button>
          {r.status === "active" && (
            <button className="text-label-md text-error hover:underline" onClick={() => setArchiving(r)}>Archive</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Room Management"
        description="Manage classrooms, labs and halls used by the Timetable Builder for room assignment and conflict checks."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Room
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rooms}
        rowKey={(r) => r.id}
        searchPlaceholder="Search rooms…"
        searchKeys={(r) => [r.name]}
        filters={[{ key: "campusId", label: "Campus", options: Array.from(new Set(rooms.map((r) => r.campusId))).map((id) => ({ value: id, label: campusName(id) })) }]}
        filterFn={(r, values) => !values.campusId || r.campusId === values.campusId}
      />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Room" className="max-w-[24rem]">
        <RoomForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Room" className="max-w-[24rem]">
        {editing && <RoomForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this room?"
        description={archiving ? `${archiving.name} will no longer be selectable in the Timetable Builder.` : undefined}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
