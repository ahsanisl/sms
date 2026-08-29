"use client";

import { useState } from "react";
import type { Department } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCampuses, useSubjects, useTeachers } from "@/lib/store/hooks";

export type DepartmentFormValues = Omit<Department, "id" | "status">;

interface DepartmentFormProps {
  initialValues?: Department;
  onSubmit: (values: DepartmentFormValues) => void;
  onCancel?: () => void;
}

export function DepartmentForm({ initialValues, onSubmit, onCancel }: DepartmentFormProps) {
  const { campuses } = useCampuses();
  const { subjects } = useSubjects();
  const { teachers } = useTeachers();
  const activeCampuses = campuses.filter((c) => c.status === "active");
  const activeSubjects = subjects.filter((s) => s.status === "active");

  const [name, setName] = useState(initialValues?.name ?? "");
  const [campusId, setCampusId] = useState(initialValues?.campusId ?? activeCampuses[0]?.id ?? "");
  const [subjectIds, setSubjectIds] = useState<string[]>(initialValues?.subjectIds ?? []);
  const [headTeacherId, setHeadTeacherId] = useState(initialValues?.headTeacherId ?? "");
  const [error, setError] = useState("");

  const teachersAtCampus = teachers.filter((t) => t.status === "active" && t.campusId === campusId);

  function toggleSubject(id: string) {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A department name is required.");
      return;
    }
    if (subjectIds.length === 0) {
      setError("Select at least one subject for this department.");
      return;
    }
    onSubmit({ name, campusId, subjectIds, headTeacherId: headTeacherId || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Department Name" htmlFor="name" required error={error}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Science Department" />
      </FormField>
      <FormField label="Campus" htmlFor="campusId" required>
        <Select
          id="campusId"
          value={campusId}
          onChange={(e) => {
            setCampusId(e.target.value);
            setHeadTeacherId("");
          }}
          className="w-full"
        >
          {activeCampuses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Subjects" htmlFor="subjects" required>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-outline-variant rounded-lg p-3">
          {activeSubjects.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={subjectIds.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
              <span className="text-body-md text-on-surface">{s.name}</span>
            </label>
          ))}
        </div>
      </FormField>
      <FormField label="Head of Department" htmlFor="headTeacherId">
        <Select id="headTeacherId" value={headTeacherId} onChange={(e) => setHeadTeacherId(e.target.value)} className="w-full">
          <option value="">Unassigned</option>
          {teachersAtCampus.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Add Department"}</Button>
      </div>
    </form>
  );
}
