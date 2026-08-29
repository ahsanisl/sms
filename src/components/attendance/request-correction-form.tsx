"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  leave: "Leave",
  late: "Late",
};

export interface RequestCorrectionValues {
  requestedStatus: AttendanceStatus;
  reason: string;
}

interface RequestCorrectionFormProps {
  currentStatus: AttendanceStatus;
  onSubmit: (values: RequestCorrectionValues) => void;
  onCancel?: () => void;
}

export function RequestCorrectionForm({ currentStatus, onSubmit, onCancel }: RequestCorrectionFormProps) {
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requestedStatus === currentStatus) {
      setError("Pick a different status — this matches what's already recorded.");
      return;
    }
    if (!reason.trim()) {
      setError("Please explain why this record needs correcting.");
      return;
    }
    onSubmit({ requestedStatus, reason });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-body-md text-on-surface-variant">
        Currently marked <span className="font-medium text-on-surface">{STATUS_LABEL[currentStatus]}</span>. This won&apos;t change until an admin approves it.
      </p>
      <FormField label="Correct Status To" htmlFor="requestedStatus" required>
        <Select id="requestedStatus" value={requestedStatus} onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)} className="w-full">
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Reason" htmlFor="reason" required error={error}>
        <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Student was present but marked absent by mistake" />
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
