"use client";

import { useState } from "react";
import type { Campus, Room } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCampuses } from "@/lib/store/hooks";

export type RoomFormValues = Omit<Room, "id" | "status">;

interface RoomFormProps {
  initialValues?: Room;
  onSubmit: (values: RoomFormValues) => void;
  onCancel?: () => void;
  /** Real-data callers pass their own campus list; omitted, this falls back to the mock store (only the onboarding wizard still relies on that fallback). */
  campuses?: Campus[];
}

export function RoomForm({ initialValues, onSubmit, onCancel, campuses: campusesProp }: RoomFormProps) {
  const { campuses: mockCampuses } = useCampuses();
  const campuses = campusesProp ?? mockCampuses;
  const activeCampuses = campuses.filter((c) => c.status === "active");

  const [name, setName] = useState(initialValues?.name ?? "");
  const [campusId, setCampusId] = useState(initialValues?.campusId ?? activeCampuses[0]?.id ?? "");
  const [type, setType] = useState<Room["type"]>(initialValues?.type ?? "classroom");
  const [capacity, setCapacity] = useState(initialValues?.capacity ?? 35);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !campusId) {
      setError("A room name and campus are required.");
      return;
    }
    onSubmit({ name, campusId, type, capacity });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Room Name" htmlFor="name" required error={error}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Room 105" />
      </FormField>
      <FormField label="Campus" htmlFor="campusId" required>
        <Select id="campusId" value={campusId} onChange={(e) => setCampusId(e.target.value)} className="w-full">
          {activeCampuses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Room Type" htmlFor="type" required>
        <Select id="type" value={type} onChange={(e) => setType(e.target.value as Room["type"])} className="w-full">
          <option value="classroom">Classroom</option>
          <option value="lab">Lab</option>
          <option value="hall">Hall / Gymnasium</option>
          <option value="other">Other</option>
        </Select>
      </FormField>
      <FormField label="Capacity" htmlFor="capacity" required>
        <Input id="capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Add Room"}</Button>
      </div>
    </form>
  );
}
