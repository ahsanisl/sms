"use client";

import { useState } from "react";
import type { AcademicSession } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type SessionFormValues = Omit<AcademicSession, "id" | "isActive" | "schoolId">;

interface SessionFormProps {
  initialValues?: AcademicSession;
  onSubmit: (values: SessionFormValues) => void;
  onCancel?: () => void;
}

export function SessionForm({ initialValues, onSubmit, onCancel }: SessionFormProps) {
  const [label, setLabel] = useState(initialValues?.label ?? "");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [term1Start, setTerm1Start] = useState(initialValues?.terms[0]?.startDate ?? "");
  const [term1End, setTerm1End] = useState(initialValues?.terms[0]?.endDate ?? "");
  const [term2Start, setTerm2Start] = useState(initialValues?.terms[1]?.startDate ?? "");
  const [term2End, setTerm2End] = useState(initialValues?.terms[1]?.endDate ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate) {
      setError("Session label, start date and end date are required.");
      return;
    }
    onSubmit({
      label,
      startDate,
      endDate,
      terms: [
        { name: "Term 1", startDate: term1Start || startDate, endDate: term1End || endDate },
        { name: "Term 2", startDate: term2Start || startDate, endDate: term2End || endDate },
      ],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Session Label" htmlFor="label" required error={error}>
        <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., 2027 – 2028" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Session Start" htmlFor="startDate">
          <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        <FormField label="Session End" htmlFor="endDate">
          <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </FormField>
      </div>
      <div className="border-t border-outline-variant/40 pt-4">
        <p className="text-label-md font-medium text-on-surface mb-3">Term 1</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start" htmlFor="term1Start">
            <Input id="term1Start" type="date" value={term1Start} onChange={(e) => setTerm1Start(e.target.value)} />
          </FormField>
          <FormField label="End" htmlFor="term1End">
            <Input id="term1End" type="date" value={term1End} onChange={(e) => setTerm1End(e.target.value)} />
          </FormField>
        </div>
      </div>
      <div>
        <p className="text-label-md font-medium text-on-surface mb-3">Term 2</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start" htmlFor="term2Start">
            <Input id="term2Start" type="date" value={term2Start} onChange={(e) => setTerm2Start(e.target.value)} />
          </FormField>
          <FormField label="End" htmlFor="term2End">
            <Input id="term2End" type="date" value={term2End} onChange={(e) => setTerm2End(e.target.value)} />
          </FormField>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Create Session"}</Button>
      </div>
    </form>
  );
}
