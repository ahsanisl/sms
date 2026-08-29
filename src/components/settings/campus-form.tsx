"use client";

import { useState } from "react";
import type { Campus } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type CampusFormValues = Omit<Campus, "id" | "status">;

interface CampusFormProps {
  initialValues?: Campus;
  onSubmit: (values: CampusFormValues) => void;
  onCancel?: () => void;
}

export function CampusForm({ initialValues, onSubmit, onCancel }: CampusFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "Karachi");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Campus name and address are required.");
      return;
    }
    onSubmit({ name, city, address, phone, email });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Campus Name" htmlFor="name" required error={error && !name.trim() ? error : undefined}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., North Campus" />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="City" htmlFor="city">
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </FormField>
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 21 3456 7890" />
        </FormField>
      </div>
      <FormField label="Address" htmlFor="address" required error={error && !address.trim() ? error : undefined}>
        <Textarea id="address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="campus@eduflow.edu.pk" />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Create Campus"}</Button>
      </div>
    </form>
  );
}
