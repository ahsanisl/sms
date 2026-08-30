"use client";

import { useState } from "react";
import type { Subject } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type SubjectFormValues = Omit<Subject, "id" | "status" | "schoolId">;

interface SubjectFormProps {
  initialValues?: Subject;
  onSubmit: (values: SubjectFormValues) => void;
  onCancel?: () => void;
}

export function SubjectForm({ initialValues, onSubmit, onCancel }: SubjectFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Both a subject name and a short code are required.");
      return;
    }
    onSubmit({ name, code: code.toUpperCase() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Subject Name" htmlFor="name" required error={error}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., French" />
      </FormField>
      <FormField label="Code" htmlFor="code" required>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., FRE" maxLength={6} />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Add Subject"}</Button>
      </div>
    </form>
  );
}
