"use client";

import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ClassOption {
  id: string;
  label: string;
  subjectIds: string[];
  campusId: string;
}

export interface HomeworkInitialValues {
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  attachmentName?: string;
}

interface HomeworkFormProps {
  classes: ClassOption[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string; campusId: string }[];
  isTeacher: boolean;
  initialValues?: HomeworkInitialValues;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function HomeworkForm({ classes, subjects, teachers, isTeacher, initialValues, onSubmit, onCancel, submitting, submitLabel }: HomeworkFormProps) {
  const [classId, setClassId] = useState(initialValues?.classId ?? classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(initialValues?.subjectId ?? "");
  const [teacherId, setTeacherId] = useState(initialValues?.teacherId ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const [assignedDate, setAssignedDate] = useState(initialValues?.assignedDate ?? today);
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? today);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const selectedClass = classes.find((c) => c.id === classId);
  const subjectOptions = subjects.filter((s) => selectedClass?.subjectIds.includes(s.id));
  const teacherOptions = teachers.filter((t) => t.campusId === selectedClass?.campusId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    if (!subjectId) {
      setError("Select a subject.");
      return;
    }
    if (!isTeacher && !teacherId) {
      setError("Select which teacher this is for.");
      return;
    }
    if (dueDate < assignedDate) {
      setError("Due date can't be before the assigned date.");
      return;
    }
    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("subjectId", subjectId);
    if (!isTeacher) formData.set("teacherId", teacherId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("assignedDate", assignedDate);
    formData.set("dueDate", dueDate);
    if (file) formData.set("file", file);
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Class" htmlFor="classId">
          <Select
            id="classId"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSubjectId("");
              setTeacherId("");
            }}
            className="w-full"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Subject" htmlFor="subjectId" required>
          <Select id="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full">
            <option value="">Select a subject…</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
      </div>
      {!isTeacher && (
        <FormField label="Teacher" htmlFor="teacherId" required error={error && !teacherId ? error : undefined}>
          <Select id="teacherId" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full">
            <option value="">Select a teacher…</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </FormField>
      )}
      <FormField label="Title" htmlFor="title" required error={error && !title.trim() ? error : undefined}>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Worksheet 4 — Fractions" />
      </FormField>
      <FormField label="Description" htmlFor="description">
        <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions for students…" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Assigned Date" htmlFor="assignedDate" required>
          <Input id="assignedDate" type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
        </FormField>
        <FormField label="Due Date" htmlFor="dueDate" required error={error && dueDate < assignedDate ? error : undefined}>
          <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Attachment (optional)" htmlFor="file" hint="PDF, image, or Office document, up to 15MB.">
        <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {initialValues?.attachmentName && !file && (
          <p className="text-label-sm text-on-surface-variant mt-1">Current: {initialValues.attachmentName}</p>
        )}
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : (submitLabel ?? (initialValues ? "Save Changes" : "Post Homework"))}</Button>
      </div>
    </form>
  );
}
