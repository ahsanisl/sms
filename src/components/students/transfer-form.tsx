"use client";

import { useState } from "react";
import type { ClassSection, Student } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCampuses, useClasses } from "@/lib/store/hooks";
import { campusName, classLabel, GRADE_ORDER } from "@/lib/mock/reference-data";

export interface TransferFormValues {
  date: string;
  reason: string;
  toCampusId: string;
  toClassId: string;
}

interface TransferFormProps {
  student: Student;
  onSubmit: (values: TransferFormValues) => void;
  onCancel?: () => void;
}

export function TransferForm({ student, onSubmit, onCancel }: TransferFormProps) {
  const { campuses } = useCampuses();
  const { classes } = useClasses();
  const activeCampuses = campuses.filter((c) => c.status === "active");

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [toCampusId, setToCampusId] = useState(student.campusId);
  const classesAtTarget: ClassSection[] = GRADE_ORDER.flatMap((grade) =>
    classes.filter((c) => c.status === "active" && c.campusId === toCampusId && c.grade === grade),
  );
  const [toClassId, setToClassId] = useState(student.classId);
  const [error, setError] = useState("");

  function handleCampusChange(campusId: string) {
    setToCampusId(campusId);
    const firstClass = GRADE_ORDER.flatMap((grade) => classes.filter((c) => c.status === "active" && c.campusId === campusId && c.grade === grade))[0];
    setToClassId(firstClass?.id ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please record a reason — it's kept on the student's history.");
      return;
    }
    if (!toClassId) {
      setError("The selected campus has no active classes to transfer into.");
      return;
    }
    if (toClassId === student.classId && toCampusId === student.campusId) {
      setError("Pick a different class or campus — this matches the student's current placement.");
      return;
    }
    onSubmit({ date, reason, toCampusId, toClassId });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-body-md text-on-surface-variant">
        Currently <span className="font-medium text-on-surface">{classLabel(student.classId)}</span> at {campusName(student.campusId)}.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Target Campus" htmlFor="toCampusId">
          <Select id="toCampusId" value={toCampusId} onChange={(e) => handleCampusChange(e.target.value)} className="w-full">
            {activeCampuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Target Class" htmlFor="toClassId">
          <Select id="toClassId" value={toClassId} onChange={(e) => setToClassId(e.target.value)} className="w-full">
            {classesAtTarget.length === 0 && <option value="">No active classes</option>}
            {classesAtTarget.map((c) => (
              <option key={c.id} value={c.id}>{classLabel(c)}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Effective Date" htmlFor="date" required>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>
      <FormField label="Reason" htmlFor="reason" required error={error}>
        <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Family moved closer to Clifton Campus" />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Transfer Student</Button>
      </div>
    </form>
  );
}
