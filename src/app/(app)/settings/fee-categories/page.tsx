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
import { FeeCategoryForm, type FeeCategoryFormValues } from "@/components/settings/fee-category-form";
import { useFeeCategories, useFeesStore } from "@/lib/store/hooks";
import type { FeeCategory } from "@/lib/types";

export default function FeeCategoriesPage() {
  const { feeCategories, addFeeCategory, updateFeeCategory, archiveFeeCategory } = useFeeCategories();
  const { feeStructure } = useFeesStore();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FeeCategory | null>(null);
  const [archiving, setArchiving] = useState<FeeCategory | null>(null);

  function handleAdd(values: FeeCategoryFormValues) {
    addFeeCategory({ ...values, status: "active" });
    toast.success(`${values.name} was added.`);
    setAddOpen(false);
  }

  function handleEdit(values: FeeCategoryFormValues) {
    if (!editing) return;
    updateFeeCategory({ ...editing, ...values });
    toast.success(`${values.name} was updated.`);
    setEditing(null);
  }

  function handleArchive() {
    if (!archiving) return;
    archiveFeeCategory(archiving.id);
    toast.success(`${archiving.name} was archived.`);
    setArchiving(null);
  }

  const columns: Column<FeeCategory>[] = [
    { key: "name", header: "Category", sortable: true, accessor: (c) => c.name, render: (c) => <span className="font-medium text-primary">{c.name}</span> },
    {
      key: "usage",
      header: "Used By",
      accessor: (c) => feeStructure.filter((f) => f.name === c.name).length,
      render: (c) => `${feeStructure.filter((f) => f.name === c.name).length} fee structure item${feeStructure.filter((f) => f.name === c.name).length === 1 ? "" : "s"}`,
      className: "text-on-surface-variant",
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge label={c.status === "active" ? "Active" : "Archived"} tone={c.status === "active" ? "success" : "neutral"} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-2">
          <button className="text-label-md text-secondary hover:underline" onClick={() => setEditing(c)}>Edit</button>
          {c.status === "active" && (
            <button className="text-label-md text-error hover:underline" onClick={() => setArchiving(c)}>Archive</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fee Categories"
        description="Manage the canonical list of fee item names used across Fee Structure — keeps campuses from drifting into typo'd, one-off category names."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Category
          </Button>
        }
      />

      <DataTable columns={columns} data={feeCategories} rowKey={(c) => c.id} searchPlaceholder="Search fee categories…" searchKeys={(c) => [c.name]} />

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Fee Category" className="max-w-[24rem]">
        <FeeCategoryForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Fee Category" className="max-w-[24rem]">
        {editing && <FeeCategoryForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this fee category?"
        description={archiving ? `${archiving.name} will no longer be selectable when adding a new fee structure item, but existing records keep it.` : undefined}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
