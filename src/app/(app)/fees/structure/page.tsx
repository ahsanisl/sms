"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { FeeStructureForm, type FeeStructureFormValues } from "@/components/fees/fee-structure-form";
import { useFeesStore } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";
import { GRADE_ORDER, CAMPUSES, CLASSES, campusName } from "@/lib/mock/reference-data";
import { formatPKR } from "@/lib/format";

function classGrade(classId: string): string | undefined {
  return CLASSES.find((c) => c.id === classId)?.grade;
}

export default function FeeStructurePage() {
  const { feeStructure, addFeeStructureItem } = useFeesStore();
  const { scopedCampusId } = useCampusScope();
  const campuses = scopedCampusId ? CAMPUSES.filter((c) => c.id === scopedCampusId) : CAMPUSES;
  const [addOpen, setAddOpen] = useState(false);

  function handleAdd(values: FeeStructureFormValues) {
    addFeeStructureItem(values);
    toast.success(`${values.name} added to the fee structure.`);
    setAddOpen(false);
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
        {campuses.map((campus) => (
          <div key={campus.id} className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
            <div className="p-lg border-b border-outline-variant/40">
              <h3 className="text-title-lg font-semibold text-primary">{campusName(campus.id)}</h3>
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
                  {GRADE_ORDER.filter((grade) => feeStructure.some((f) => f.campusId === campus.id && classGrade(f.classId) === grade)).map((grade) => {
                    const items = feeStructure.filter((f) => f.campusId === campus.id && classGrade(f.classId) === grade);
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
        ))}
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Fee Item" className="max-w-[32rem]">
        <FeeStructureForm defaultCampusId={scopedCampusId ?? undefined} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>
    </div>
  );
}

