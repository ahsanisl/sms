"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { saveMarksAction } from "@/app/(app)/exams/marks/actions";

interface ExamOption {
  id: string;
  name: string;
  term: string;
}

interface ClassOption {
  id: string;
  label: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface RosterStudent {
  id: string;
  name: string;
}

export function MarksClient({
  exams,
  examId,
  examName,
  totalMarks,
  classOptions,
  classId,
  classLabel,
  subjects,
  roster,
  initialMarks,
}: {
  exams: ExamOption[];
  examId: string;
  examName: string;
  totalMarks: number;
  classOptions: ClassOption[];
  classId: string;
  classLabel: string;
  subjects: SubjectOption[];
  roster: RosterStudent[];
  initialMarks: Record<string, number>;
}) {
  const router = useRouter();
  const [grid, setGrid] = useState<Record<string, number>>(initialMarks);
  const [saving, setSaving] = useState(false);

  function cellValue(studentId: string, subjectId: string) {
    const key = `${studentId}|${subjectId}`;
    return grid[key] ?? "";
  }

  function setCell(studentId: string, subjectId: string, value: string) {
    const num = value === "" ? undefined : Number(value);
    setGrid((prev) => {
      const key = `${studentId}|${subjectId}`;
      if (num === undefined || Number.isNaN(num)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: Math.max(0, Math.min(totalMarks, num)) };
    });
  }

  async function handleSave() {
    const entries = roster.flatMap((s) =>
      subjects.map((subject) => ({
        examId,
        studentId: s.id,
        subjectId: subject.id,
        obtainedMarks: Number(cellValue(s.id, subject.id)) || 0,
        totalMarks,
      })),
    );
    setSaving(true);
    const result = await saveMarksAction(examId, entries);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Marks saved for ${classLabel}.`);
    router.push("/exams");
  }

  if (exams.length === 0) {
    return <EmptyState icon="quiz" title="No exams available" description="Create an exam first." actionLabel="Create Exam" onAction={() => router.push("/exams/create")} />;
  }

  return (
    <div>
      <PageHeader title={`Enter Marks${classLabel ? `: ${classLabel}` : ""}`} description={examName} />

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
        <div className="p-lg border-b border-outline-variant/40 flex flex-col md:flex-row gap-3">
          <Select value={examId} onChange={(e) => router.push(`/exams/marks?examId=${e.target.value}`)}>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {e.term}</option>
            ))}
          </Select>
          <Select value={classId} onChange={(e) => router.push(`/exams/marks?examId=${examId}&classId=${e.target.value}`)}>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-sm pl-6 text-label-sm text-on-surface-variant sticky left-0 bg-surface-bright z-10 w-64">Student</th>
                {subjects.map((subject) => (
                  <th key={subject.id} className="p-sm text-label-sm text-on-surface-variant text-center w-28">
                    {subject.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {roster.map((s) => (
                <tr key={s.id}>
                  <td className="p-sm pl-6 sticky left-0 bg-surface z-10 font-medium text-on-surface">{s.name}</td>
                  {subjects.map((subject) => (
                    <td key={subject.id} className="p-sm text-center">
                      <input
                        type="number"
                        min={0}
                        max={totalMarks}
                        value={cellValue(s.id, subject.id)}
                        onChange={(e) => setCell(s.id, subject.id, e.target.value)}
                        className="w-16 text-center bg-surface border border-outline-variant rounded px-2 py-1 text-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={subjects.length + 1} className="p-8 text-center text-body-md text-on-surface-variant">
                    No students in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-lg border-t border-outline-variant/40 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => router.push("/exams")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={roster.length === 0 || saving}>
            {saving ? "Saving…" : "Save Marks"}
          </Button>
        </div>
      </div>
    </div>
  );
}
