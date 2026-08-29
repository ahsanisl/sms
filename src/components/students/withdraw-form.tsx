"use client";

import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface WithdrawFormValues {
  resultingStatus: "withdrawn" | "alumni";
  date: string;
  reason: string;
  leavingCertificateIssued: boolean;
}

interface WithdrawFormProps {
  studentName: string;
  onSubmit: (values: WithdrawFormValues) => void;
  onCancel?: () => void;
}

export function WithdrawForm({ studentName, onSubmit, onCancel }: WithdrawFormProps) {
  const [resultingStatus, setResultingStatus] = useState<"withdrawn" | "alumni">("withdrawn");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [leavingCertificateIssued, setLeavingCertificateIssued] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please record a reason — it's kept on the student's history.");
      return;
    }
    onSubmit({ resultingStatus, date, reason, leavingCertificateIssued });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-body-md text-on-surface-variant">
        This removes <span className="font-medium text-on-surface">{studentName}</span> from active rosters, attendance and fee collection, and records the change on their history. This can be undone with Reactivate.
      </p>
      <FormField label="Outcome" htmlFor="resultingStatus">
        <Select id="resultingStatus" value={resultingStatus} onChange={(e) => setResultingStatus(e.target.value as "withdrawn" | "alumni")} className="w-full">
          <option value="withdrawn">Withdrawn (left before completing)</option>
          <option value="alumni">Graduated (moving to Alumni)</option>
        </Select>
      </FormField>
      <FormField label="Effective Date" htmlFor="date" required>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>
      <FormField label="Reason" htmlFor="reason" required error={error}>
        <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Family relocating to another city" />
      </FormField>
      {resultingStatus === "withdrawn" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={leavingCertificateIssued} onCheckedChange={(checked) => setLeavingCertificateIssued(!!checked)} />
          <span className="text-body-md text-on-surface">Leaving certificate issued</span>
        </label>
      )}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="destructive">
          {resultingStatus === "withdrawn" ? "Withdraw Student" : "Move to Alumni"}
        </Button>
      </div>
    </form>
  );
}
