"use client";

import { useState } from "react";
import type { LeaveType } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const TYPE_LABEL: Record<LeaveType, string> = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  other: "Other",
};

export interface LeaveRequestFormValues {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

interface LeaveRequestFormProps {
  onSubmit: (values: LeaveRequestFormValues) => void;
  onCancel?: () => void;
}

export function LeaveRequestForm({ onSubmit, onCancel }: LeaveRequestFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<LeaveType>("casual");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please add a reason for your leave request.");
      return;
    }
    if (endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }
    onSubmit({ type, startDate, endDate, reason });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Leave Type" htmlFor="type">
        <Select id="type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} className="w-full">
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start Date" htmlFor="startDate" required>
          <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        <FormField label="End Date" htmlFor="endDate" required>
          <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Reason" htmlFor="reason" required error={error}>
        <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Family medical appointment" />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Submit Request</Button>
      </div>
    </form>
  );
}
