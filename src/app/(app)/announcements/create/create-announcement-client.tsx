"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createAnnouncementAction } from "@/app/(app)/announcements/create/actions";
import type { AnnouncementAudience, AnnouncementPriority, Campus } from "@/lib/types";
import { cn } from "@/lib/utils";

const AUDIENCES: { value: AnnouncementAudience; label: string; description: string }[] = [
  { value: "all", label: "Entire School", description: "All staff, students and parents" },
  { value: "teachers", label: "Teachers", description: "Teaching staff only" },
  { value: "parents", label: "Parents", description: "Parents / guardians only" },
  { value: "students", label: "Students", description: "Enrolled students only" },
];

export function CreateAnnouncementClient({
  campuses,
  fixedCampusId,
  fixedCampusName,
}: {
  campuses: Campus[];
  fixedCampusId?: string;
  fixedCampusName?: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [campusId, setCampusId] = useState(fixedCampusId ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scopeLabel = fixedCampusName ?? (campusId ? campuses.find((c) => c.id === campusId)?.name : undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Please add a title and message.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await createAnnouncementAction({ title, body, audience, priority, campusId: campusId || undefined });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(scopeLabel ? `Announcement published to ${scopeLabel}.` : "Announcement published school-wide.");
    router.push("/announcements");
  }

  return (
    <div>
      <PageHeader
        title="New Announcement"
        description={scopeLabel ? `Compose and publish a message to ${scopeLabel}.` : "Compose and publish a message to the school community."}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
            <FormField label="Announcement Title" htmlFor="title" required error={error && !title.trim() ? error : undefined}>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Sports Week Schedule" />
            </FormField>
            <FormField label="Message Content" htmlFor="body" required error={error && !body.trim() ? error : undefined}>
              <Textarea id="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your announcement…" />
            </FormField>
          </div>
        </div>

        <div className="space-y-4">
          {!fixedCampusId && campuses.length > 1 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <h3 className="text-title-lg font-semibold text-on-surface mb-4">Campus</h3>
              <Select value={campusId} onChange={(e) => setCampusId(e.target.value)} className="w-full">
                <option value="">Entire School</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-secondary" /> Audience
            </h3>
            <div className="space-y-2">
              {AUDIENCES.map((a) => (
                <label
                  key={a.value}
                  className={cn(
                    "flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    audience === a.value ? "border-secondary bg-surface-container-low" : "border-outline-variant hover:bg-surface",
                  )}
                >
                  <input type="radio" name="audience" checked={audience === a.value} onChange={() => setAudience(a.value)} className="mt-1 accent-secondary" />
                  <span>
                    <span className="block text-body-md font-medium text-on-surface">{a.label}</span>
                    <span className="block text-label-sm text-on-surface-variant">{a.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-secondary" /> Priority
            </h3>
            <div className="space-y-2">
              <label className={cn("flex items-start p-3 border rounded-lg cursor-pointer transition-colors", priority === "normal" ? "border-secondary bg-surface-container-low" : "border-outline-variant hover:bg-surface")}>
                <input type="radio" name="priority" checked={priority === "normal"} onChange={() => setPriority("normal")} className="mt-1 accent-secondary" />
                <span className="ml-2 text-body-md text-on-surface">Normal</span>
              </label>
              <label className={cn("flex items-start p-3 border rounded-lg cursor-pointer transition-colors", priority === "important" ? "border-secondary bg-surface-container-low" : "border-outline-variant hover:bg-surface")}>
                <input type="radio" name="priority" checked={priority === "important"} onChange={() => setPriority("important")} className="mt-1 accent-secondary" />
                <span className="ml-2 text-body-md text-on-surface">Important</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => router.push("/announcements")}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
