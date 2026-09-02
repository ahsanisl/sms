"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { createExamAction } from "@/app/(app)/exams/create/actions";
import type { Campus, ClassSection, Subject } from "@/lib/types";

export function CreateExamClient({ campuses, classes, subjects, defaultCampusId }: { campuses: Campus[]; classes: ClassSection[]; subjects: Subject[]; defaultCampusId?: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [term, setTerm] = useState("Term 2, 2026-27");
  const [campusId, setCampusId] = useState(defaultCampusId ?? campuses[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableClasses = classes.filter((c) => c.campusId === campusId && c.status === "active");

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate || classIds.length === 0 || subjectIds.length === 0) {
      setError("Please fill in all required fields and select at least one class and subject.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await createExamAction({ name, term, campusId, classIds, subjectIds, startDate, endDate, totalMarks, passingMarks });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${name} was created.`);
    router.push("/exams");
  }

  return (
    <div>
      <PageHeader title="Create New Examination" description="Set up a new exam and assign classes and subjects." />

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm p-lg max-w-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Exam Name" htmlFor="examName" required>
            <Input id="examName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Mid-Term Assessment 2026" />
          </FormField>
          <FormField label="Term" htmlFor="term" required>
            <Select id="term" value={term} onChange={(e) => setTerm(e.target.value)} className="w-full">
              <option value="Term 1, 2026-27">Term 1, 2026-27</option>
              <option value="Term 2, 2026-27">Term 2, 2026-27</option>
            </Select>
          </FormField>
          {campuses.length > 1 && (
            <FormField label="Campus" htmlFor="campusId" required>
              <Select
                id="campusId"
                value={campusId}
                onChange={(e) => {
                  setCampusId(e.target.value);
                  setClassIds([]);
                }}
                className="w-full"
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Start Date" htmlFor="startDate" required>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="End Date" htmlFor="endDate" required>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormField>
          <FormField label="Total Marks" htmlFor="totalMarks">
            <Input id="totalMarks" type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
          </FormField>
          <FormField label="Passing Marks" htmlFor="passingMarks">
            <Input id="passingMarks" type="number" value={passingMarks} onChange={(e) => setPassingMarks(Number(e.target.value))} />
          </FormField>
        </div>

        <FormField label="Target Classes">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
            {availableClasses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-body-md text-on-surface cursor-pointer">
                <Checkbox checked={classIds.includes(c.id)} onCheckedChange={() => toggle(classIds, setClassIds, c.id)} />
                {c.grade}-{c.section}
              </label>
            ))}
            {availableClasses.length === 0 && <p className="text-body-md text-on-surface-variant">No active classes at this campus.</p>}
          </div>
        </FormField>

        <FormField label="Included Subjects">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
            {subjects.filter((s) => s.status === "active").map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-body-md text-on-surface cursor-pointer">
                <Checkbox checked={subjectIds.includes(s.id)} onCheckedChange={() => toggle(subjectIds, setSubjectIds, s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </FormField>

        {error && <p className="text-label-sm text-error">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/40">
          <Button type="button" variant="secondary" onClick={() => router.push("/exams")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Exam"}</Button>
        </div>
      </form>
    </div>
  );
}
