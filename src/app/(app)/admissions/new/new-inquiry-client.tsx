"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createInquiryAction } from "@/app/(app)/admissions/new/actions";
import { GRADE_ORDER } from "@/lib/mock/reference-data";
import { INQUIRY_SOURCES } from "@/lib/mock/admissions";
import type { Campus } from "@/lib/types";

export function NewInquiryClient({ campuses, defaultCampusId }: { campuses: Campus[]; defaultCampusId?: string }) {
  const router = useRouter();

  const [childName, setChildName] = useState("");
  const [gradeAppliedFor, setGradeAppliedFor] = useState(GRADE_ORDER[0]);
  const [campusId, setCampusId] = useState(defaultCampusId ?? campuses[0]?.id ?? "");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [source, setSource] = useState(INQUIRY_SOURCES[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childName.trim() || !parentName.trim() || !parentPhone.trim()) {
      setError("Child name, parent name and phone are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await createInquiryAction({ childName, gradeAppliedFor, campusId, parentName, parentPhone, parentEmail, source, notes: notes || undefined });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Inquiry logged for ${childName}.`);
    router.push("/admissions");
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Log Inquiry" description="Capture a new prospective student inquiry." />

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Child's Name" htmlFor="childName" required error={error && !childName.trim() ? error : undefined}>
            <Input id="childName" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="e.g., Ibrahim Malik" />
          </FormField>
          <FormField label="Grade Applied For" htmlFor="grade" required>
            <Select id="grade" value={gradeAppliedFor} onChange={(e) => setGradeAppliedFor(e.target.value)} className="w-full">
              {GRADE_ORDER.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Campus" htmlFor="campusId" required>
            <Select id="campusId" value={campusId} onChange={(e) => setCampusId(e.target.value)} className="w-full">
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="How did they hear about us?" htmlFor="source">
            <Select id="source" value={source} onChange={(e) => setSource(e.target.value)} className="w-full">
              {INQUIRY_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-outline-variant/40">
          <FormField label="Parent/Guardian Name" htmlFor="parentName" required error={error && !parentName.trim() ? error : undefined}>
            <Input id="parentName" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g., Mr. Kamran Malik" />
          </FormField>
          <FormField label="Phone" htmlFor="parentPhone" required error={error && !parentPhone.trim() ? error : undefined}>
            <Input id="parentPhone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g., +92 300 1234567" />
          </FormField>
          <FormField label="Email" htmlFor="parentEmail" className="md:col-span-2">
            <Input id="parentEmail" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="e.g., kamran.malik@gmail.com" />
          </FormField>
        </div>

        <FormField label="Notes" htmlFor="notes">
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering for follow-up…" />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
          <Button type="button" variant="secondary" onClick={() => router.push("/admissions")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Logging…" : "Log Inquiry"}</Button>
        </div>
      </form>
    </div>
  );
}
