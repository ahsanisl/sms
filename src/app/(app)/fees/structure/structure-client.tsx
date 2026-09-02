"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { FeeStructureForm, type FeeStructureFormValues } from "@/components/fees/fee-structure-form";
import { createStructureItemAction } from "@/app/(app)/fees/structure/actions";
import { GRADE_ORDER } from "@/lib/mock/reference-data";
import { formatPKR } from "@/lib/format";
import type { Campus, ClassSection, FeeCategory, FeeStructureItem } from "@/lib/types";

export function FeeStructureClient({
  campuses,
  classes,
  feeCategories,
  structureItems,
  defaultCampusId,
}: {
  campuses: Campus[];
  classes: ClassSection[];
  feeCategories: FeeCategory[];
  structureItems: FeeStructureItem[];
  defaultCampusId?: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const classById = new Map(classes.map((c) => [c.id, c]));

  async function handleAdd(values: FeeStructureFormValues) {
    const result = await createStructureItemAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} added to the fee structure.`);
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Fee Structure Configuration"
        description="Define tuition and other fee items per grade and campus."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Fee Item
          </Button>
        }
      />

      <div className="space-y-8">
        {campuses.map((campus) => {
          const gradesAtCampus = GRADE_ORDER.filter((grade) =>
            structureItems.some((f) => f.campusId === campus.id && classById.get(f.classId)?.grade === grade),
          );
          return (
            <div key={campus.id} className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
              <div className="p-lg border-b border-outline-variant/40">
                <h3 className="text-title-lg font-semibold text-primary">{campus.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/40">
                      <th className="px-md py-sm text-label-sm text-on-surface-variant font-medium">Grade</th>
                      <th className="px-md py-sm text-label-sm text-on-surface-variant font-medium">Tuition (Monthly)</th>
                      <th className="px-md py-sm text-label-sm text-on-surface-variant font-medium">Exam Fee (Quarterly)</th>
                      <th className="px-md py-sm text-label-sm text-on-surface-variant font-medium">Annual Fund</th>
                      <th className="px-md py-sm text-label-sm text-on-surface-variant font-medium">Admission Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {gradesAtCampus.map((grade) => {
                      const items = structureItems.filter((f) => f.campusId === campus.id && classById.get(f.classId)?.grade === grade);
                      const find = (name: string) => items.find((i) => i.name === name)?.amount;
                      return (
                        <tr key={grade} className="hover:bg-surface-bright transition-colors">
                          <td className="px-md py-sm font-medium text-on-surface">{grade}</td>
                          <td className="px-md py-sm text-on-surface-variant">{formatPKR(find("Tuition Fee") ?? 0)}</td>
                          <td className="px-md py-sm text-on-surface-variant">{formatPKR(find("Examination Fee") ?? 0)}</td>
                          <td className="px-md py-sm text-on-surface-variant">{formatPKR(find("Annual Fund") ?? 0)}</td>
                          <td className="px-md py-sm text-on-surface-variant">{formatPKR(find("Admission Fee") ?? 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Fee Item" className="max-w-[32rem]">
        <FeeStructureForm defaultCampusId={defaultCampusId} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} campuses={campuses} classes={classes} feeCategories={feeCategories} />
      </Modal>
    </div>
  );
}
