"use client";

import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface TopicFormValues {
  title: string;
  description: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

interface TopicFormInitialValues extends TopicFormValues {
  id: string;
}

interface TopicFormProps {
  initialValues?: TopicFormInitialValues;
  onSubmit: (values: TopicFormValues) => void;
  onCancel?: () => void;
}

export function TopicForm({ initialValues, onSubmit, onCancel }: TopicFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(initialValues?.plannedStartDate ?? "");
  const [plannedEndDate, setPlannedEndDate] = useState(initialValues?.plannedEndDate ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("A topic title is required.");
      return;
    }
    onSubmit({ title, description, plannedStartDate: plannedStartDate || undefined, plannedEndDate: plannedEndDate || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Topic Title" htmlFor="title" required error={error}>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Fractions and Decimals" />
      </FormField>
      <FormField label="Description" htmlFor="description">
        <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this topic covers…" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Planned Start" htmlFor="plannedStartDate">
          <Input id="plannedStartDate" type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
        </FormField>
        <FormField label="Planned End" htmlFor="plannedEndDate">
          <Input id="plannedEndDate" type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Add Topic"}</Button>
      </div>
    </form>
  );
}
