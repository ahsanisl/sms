"use client";

import { useState } from "react";
import type { Campus, Subject, Teacher, TeacherStatus } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCampuses, useSubjects } from "@/lib/store/hooks";

export type TeacherFormValues = Omit<Teacher, "id" | "classIds">;

// A function, not a module-level constant — campuses[0]?.id must be read
// fresh on every mount (e.g. each time this form's Modal reopens), not
// captured once when this module first loads. A constant here would freeze
// whatever campus happened to exist at that moment, which is empty for a
// brand-new school whose first campus hasn't synced yet — the same class of
// bug documented in reference-data.ts's frozen-mirror comment.
function emptyValues(campuses: { id: string }[]): TeacherFormValues {
  return {
    name: "",
    employeeId: "",
    campusId: campuses[0]?.id ?? "",
    subjectIds: [],
    phone: "",
    email: "",
    qualification: "",
    joinDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };
}

interface TeacherFormProps {
  initialValues?: Teacher;
  onSubmit: (values: TeacherFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  /** Real-data callers pass their own campus/subject lists; omitted, this falls back to the mock store (only the onboarding wizard still relies on that fallback). */
  campuses?: Campus[];
  subjects?: Subject[];
}

export function TeacherForm({ initialValues, onSubmit, onCancel, submitLabel = "Save Teacher", campuses: campusesProp, subjects: subjectsProp }: TeacherFormProps) {
  const { campuses: mockCampuses } = useCampuses();
  const { subjects: mockSubjects } = useSubjects();
  const campuses = campusesProp ?? mockCampuses;
  const subjects = subjectsProp ?? mockSubjects;

  const [values, setValues] = useState<TeacherFormValues>(initialValues ?? emptyValues(campuses));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof TeacherFormValues>(key: K, value: TeacherFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSubject(id: string) {
    set("subjectIds", values.subjectIds.includes(id) ? values.subjectIds.filter((s) => s !== id) : [...values.subjectIds, id]);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Teacher name is required.";
    if (!values.employeeId.trim()) next.employeeId = "Employee ID is required.";
    if (!values.phone.trim()) next.phone = "Phone number is required.";
    if (values.subjectIds.length === 0) next.subjectIds = "Select at least one subject.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Full Name" htmlFor="name" required error={errors.name}>
          <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Sara Ahmed" />
        </FormField>
        <FormField label="Employee ID" htmlFor="employeeId" required error={errors.employeeId}>
          <Input id="employeeId" value={values.employeeId} onChange={(e) => set("employeeId", e.target.value)} placeholder="e.g., EDU-T0042" />
        </FormField>
        <FormField label="Campus" htmlFor="campusId">
          <Select id="campusId" value={values.campusId} onChange={(e) => set("campusId", e.target.value)} className="w-full">
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Phone" htmlFor="phone" required error={errors.phone}>
          <Input id="phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 300 1234567" />
        </FormField>
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="teacher@eduflow.edu.pk" />
        </FormField>
        <FormField label="Qualification" htmlFor="qualification">
          <Input id="qualification" value={values.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g., M.Ed" />
        </FormField>
        <FormField label="Joining Date" htmlFor="joinDate">
          <Input id="joinDate" type="date" value={values.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value as TeacherStatus)} className="w-full">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Subjects Taught" required error={errors.subjectIds}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {subjects.map((subject) => (
            <label key={subject.id} className="flex items-center gap-2 text-body-md text-on-surface cursor-pointer">
              <Checkbox checked={values.subjectIds.includes(subject.id)} onCheckedChange={() => toggleSubject(subject.id)} />
              {subject.name}
            </label>
          ))}
        </div>
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
