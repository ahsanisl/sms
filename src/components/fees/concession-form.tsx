"use client";

import { useState } from "react";
import type { ConcessionType } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const TYPE_LABEL: Record<ConcessionType, string> = {
  sibling_discount: "Sibling Discount",
  staff_discount: "Staff Discount",
  scholarship: "Scholarship",
  financial_aid: "Financial Aid",
  other: "Other",
};

export interface ConcessionFormValues {
  type: ConcessionType;
  label: string;
  mode: "amount" | "percentage";
  amount: number;
  percentage: number;
  reason: string;
  approvedBy: string;
}

interface ConcessionFormProps {
  onSubmit: (values: ConcessionFormValues) => void;
  onCancel?: () => void;
}

export function ConcessionForm({ onSubmit, onCancel }: ConcessionFormProps) {
  const [type, setType] = useState<ConcessionType>("sibling_discount");
  const [mode, setMode] = useState<"amount" | "percentage">("percentage");
  const [amount, setAmount] = useState(0);
  const [percentage, setPercentage] = useState(10);
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || !approvedBy.trim()) {
      setError("Reason and approver name are required.");
      return;
    }
    onSubmit({ type, label: TYPE_LABEL[type], mode, amount, percentage, reason, approvedBy });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Concession Type" htmlFor="type">
        <Select id="type" value={type} onChange={(e) => setType(e.target.value as ConcessionType)} className="w-full">
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Discount Type" htmlFor="mode">
          <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as "amount" | "percentage")} className="w-full">
            <option value="percentage">Percentage</option>
            <option value="amount">Fixed Amount (Rs.)</option>
          </Select>
        </FormField>
        {mode === "percentage" ? (
          <FormField label="Percentage (%)" htmlFor="percentage">
            <Input id="percentage" type="number" min={0} max={100} value={percentage} onChange={(e) => setPercentage(Number(e.target.value))} />
          </FormField>
        ) : (
          <FormField label="Amount (Rs.)" htmlFor="amount">
            <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FormField>
        )}
      </div>
      <FormField label="Reason" htmlFor="reason" required error={error}>
        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Second sibling enrolled" />
      </FormField>
      <FormField label="Approved By" htmlFor="approvedBy" required>
        <Input id="approvedBy" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="e.g., Ahsan Raza" />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Apply Discount</Button>
      </div>
    </form>
  );
}
