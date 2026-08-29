"use client";

import { useState } from "react";
import type { ClassSection } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCampuses, useTeachers } from "@/lib/store/hooks";
import { GRADE_ORDER, GRADE_SUBJECTS } from "@/lib/mock/reference-data";

export type ClassFormValues = Omit<ClassSection, "id">;

interface ClassFormProps {
  initialValues?: ClassSection;
  onSubmit: (values: ClassFormValues) => void;
  onCancel?: () => void;
}

export function ClassForm({ initialValues, onSubmit, onCancel }: ClassFormProps) {
  const { campuses } = useCampuses();
  const { teachers } = useTeachers();
  const activeCampuses = campuses.filter((c) => c.status === "active");

  const [grade, setGrade] = useState(initialValues?.grade ?? GRADE_ORDER[0]);
  const [section, setSection] = useState(initialValues?.section ?? "A");
  const [campusId, setCampusId] = useState(initialValues?.campusId ?? activeCampuses[0]?.id ?? "");
  // No `teachers[0]` fallback here: if the selected campus has zero teachers,
  // this must stay empty rather than silently default to a teacher from a
  // different campus (a real cross-campus data-integrity bug — see the
  // matching reset in the campus onChange handler below).
  const [classTeacherId, setClassTeacherId] = useState(
    initialValues?.classTeacherId ?? teachers.find((t) => t.campusId === campusId)?.id ?? "",
  );
  const [studentCapacity, setStudentCapacity] = useState(initialValues?.studentCapacity ?? 35);
  const [error, setError] = useState("");
  const [teacherError, setTeacherError] = useState("");

  const campusTeachers = teachers.filter((t) => t.campusId === campusId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!section.trim()) {
      setError("Section is required.");
      return;
    }
    if (!classTeacherId) {
      setTeacherError("This campus has no active teachers to assign — add one first.");
      return;
    }
    setTeacherError("");
    onSubmit({
      grade,
      section: section.toUpperCase(),
      campusId,
      classTeacherId,
      subjectIds: initialValues?.subjectIds ?? GRADE_SUBJECTS[grade] ?? ["eng", "urdu", "math"],
      studentCapacity,
      status: initialValues?.status ?? "active",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Grade" htmlFor="grade">
          <Select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full">
            {GRADE_ORDER.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Section" htmlFor="section" required error={error}>
          <Input id="section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., C" maxLength={2} />
        </FormField>
        <FormField label="Campus" htmlFor="campusId">
          <Select
            id="campusId"
            value={campusId}
            onChange={(e) => {
              setCampusId(e.target.value);
              const first = teachers.find((t) => t.campusId === e.target.value);
              setClassTeacherId(first?.id ?? "");
            }}
            className="w-full"
          >
            {activeCampuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Class Teacher" htmlFor="classTeacherId" required error={teacherError}>
          <Select id="classTeacherId" value={classTeacherId} onChange={(e) => setClassTeacherId(e.target.value)} className="w-full">
            <option value="">Select a teacher…</option>
            {campusTeachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Student Capacity" htmlFor="studentCapacity">
          <Input
            id="studentCapacity"
            type="number"
            min={1}
            value={studentCapacity}
            onChange={(e) => setStudentCapacity(Number(e.target.value))}
          />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Create Class"}</Button>
      </div>
    </form>
  );
}
