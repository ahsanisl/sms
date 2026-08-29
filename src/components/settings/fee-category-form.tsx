"use client";

import { useState } from "react";
import type { FeeCategory } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type FeeCategoryFormValues = Omit<FeeCategory, "id" | "status">;

interface FeeCategoryFormProps {
  initialValues?: FeeCategory;
  onSubmit: (values: FeeCategoryFormValues) => void;
  onCancel?: () => void;
}

export function FeeCategoryForm({ initialValues, onSubmit, onCancel }: FeeCategoryFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A fee category name is required.");
      return;
    }
    onSubmit({ name });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Category Name" htmlFor="name" required error={error}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Lab Fee" />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Add Category"}</Button>
      </div>
    </form>
  );
}
