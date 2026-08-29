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
import { useExamsStore } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { CLASSES, SUBJECTS, classLabel } from "@/lib/mock/reference-data";
import type { ExamStatus } from "@/lib/types";

export default function CreateExamPage() {
  const router = useRouter();
  const { user } = useSession();
  const { scopedCampusId } = useCampusScope();
  const { addExam } = useExamsStore();

  const [name, setName] = useState("");
  const [term, setTerm] = useState("Term 2, 2026-27");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const availableClasses = scopedCampusId ? CLASSES.filter((c) => c.campusId === scopedCampusId) : CLASSES;

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate || classIds.length === 0 || subjectIds.length === 0) {
      setError("Please fill in all required fields and select at least one class and subject.");
      return;
    }
    const campusId = user?.campusId ?? CLASSES.find((c) => classIds.includes(c.id))?.campusId ?? CLASSES[0].campusId;
    const status: ExamStatus = new Date(startDate) > new Date("2026-08-29") ? "scheduled" : "ongoing";
    addExam({ name, term, campusId, classIds, subjectIds, startDate, endDate, totalMarks, passingMarks, status });
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
                {classLabel(c)}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Included Subjects">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
            {SUBJECTS.map((s) => (
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
          <Button type="submit">Create Exam</Button>
        </div>
      </form>
    </div>
  );
}
