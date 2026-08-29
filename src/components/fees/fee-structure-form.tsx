"use client";

import { useState } from "react";
import type { FeeFrequency, FeeStructureItem } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCampuses, useClasses, useFeeCategories } from "@/lib/store/hooks";
import { classLabel } from "@/lib/mock/reference-data";

export type FeeStructureFormValues = Omit<FeeStructureItem, "id">;

interface Props {
  /** Preselects the admin's own scoped campus (Campus Admin), if any — otherwise the campus dropdown just defaults to the first active campus. */
  defaultCampusId?: string;
  onSubmit: (values: FeeStructureFormValues) => void;
  onCancel?: () => void;
}

export function FeeStructureForm({ defaultCampusId, onSubmit, onCancel }: Props) {
  const { campuses } = useCampuses();
  const { classes } = useClasses();
  const { feeCategories } = useFeeCategories();
  const activeCampuses = campuses.filter((c) => c.status === "active");
  const activeCategories = feeCategories.filter((c) => c.status === "active");

  const [campusId, setCampusId] = useState(defaultCampusId ?? activeCampuses[0]?.id ?? "");
  const [classId, setClassId] = useState(classes.find((c) => c.status === "active" && c.campusId === campusId)?.id ?? "");
  const [name, setName] = useState(activeCategories[0]?.name ?? "");
  const [amount, setAmount] = useState(1000);
  const [frequency, setFrequency] = useState<FeeFrequency>("monthly");
  const [error, setError] = useState("");

  const classesAtCampus = classes.filter((c) => c.status === "active" && c.campusId === campusId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Fee item name is required.");
      return;
    }
    if (!classId) {
      setError("This campus has no active classes to attach the fee to.");
      return;
    }
    onSubmit({ campusId, classId, name, amount, frequency });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Fee Item Name" htmlFor="name" required error={error}>
        {activeCategories.length > 0 ? (
          <Select id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full">
            {activeCategories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        ) : (
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Lab Fee" />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Campus" htmlFor="campusId">
          <Select
            id="campusId"
            value={campusId}
            onChange={(e) => {
              setCampusId(e.target.value);
              const first = classes.find((c) => c.status === "active" && c.campusId === e.target.value);
              setClassId(first?.id ?? "");
            }}
            className="w-full"
          >
            {activeCampuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Class" htmlFor="classId">
          <Select id="classId" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full">
            {classesAtCampus.length === 0 && <option value="">No active classes</option>}
            {classesAtCampus.map((c) => (
              <option key={c.id} value={c.id}>{classLabel(c)}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Amount (PKR)" htmlFor="amount">
          <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </FormField>
        <FormField label="Frequency" htmlFor="frequency">
          <Select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as FeeFrequency)} className="w-full">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="one_time">One-time</option>
          </Select>
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Add Fee Item</Button>
      </div>
    </form>
  );
}
