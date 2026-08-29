"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useExamsStore, useStudents } from "@/lib/store/hooks";
import { CLASSES, SUBJECTS, classLabel } from "@/lib/mock/reference-data";
import { marksForExamAndClass } from "@/lib/mock/exams";

function EnterMarksContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { exams, enterMarksBulk } = useExamsStore();
  const { students } = useStudents();

  const [examId, setExamId] = useState(params.get("examId") ?? exams[0]?.id ?? "");
  const exam = exams.find((e) => e.id === examId);
  const [classId, setClassId] = useState(exam?.classIds[0] ?? "");

  const activeExam = exams.find((e) => e.id === examId);
  const classOptions = activeExam ? CLASSES.filter((c) => activeExam.classIds.includes(c.id)) : [];
  const activeClassId = classId || classOptions[0]?.id || "";
  const cls = CLASSES.find((c) => c.id === activeClassId);
  const subjectIds = cls?.subjectIds.filter((s) => activeExam?.subjectIds.includes(s)) ?? [];
  const roster = students.filter((s) => s.classId === activeClassId && s.status === "active");

  const existingMarks = activeExam ? marksForExamAndClass(activeExam.id, activeClassId) : [];

  const [grid, setGrid] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    existingMarks.forEach((m) => (init[`${m.studentId}|${m.subjectId}`] = m.obtainedMarks));
    return init;
  });

  function cellValue(studentId: string, subjectId: string) {
    const key = `${studentId}|${subjectId}`;
    return grid[key] ?? existingMarks.find((m) => m.studentId === studentId && m.subjectId === subjectId)?.obtainedMarks ?? "";
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
      return { ...prev, [key]: Math.max(0, Math.min(activeExam?.totalMarks ?? 100, num)) };
    });
  }

  function handleSave() {
    if (!activeExam) return;
    const entries = roster.flatMap((s) =>
      subjectIds.map((subjectId) => ({
        examId: activeExam.id,
        studentId: s.id,
        subjectId,
        obtainedMarks: Number(cellValue(s.id, subjectId)) || 0,
        totalMarks: activeExam.totalMarks,
      })),
    );
    enterMarksBulk(entries);
    toast.success(`Marks saved for ${classLabel(activeClassId)}.`);
    router.push("/exams");
  }

  if (exams.length === 0) {
    return <EmptyState icon="quiz" title="No exams available" description="Create an exam first." actionLabel="Create Exam" onAction={() => router.push("/exams/create")} />;
  }

  return (
    <div>
      <PageHeader title={`Enter Marks${cls ? `: ${classLabel(cls)}` : ""}`} description={activeExam?.name} />

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
        <div className="p-lg border-b border-outline-variant/40 flex flex-col md:flex-row gap-3">
          <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {e.term}</option>
            ))}
          </Select>
          <Select value={activeClassId} onChange={(e) => setClassId(e.target.value)}>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{classLabel(c)}</option>
            ))}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-sm pl-6 text-label-sm text-on-surface-variant sticky left-0 bg-surface-bright z-10 w-64">Student</th>
                {subjectIds.map((sid) => (
                  <th key={sid} className="p-sm text-label-sm text-on-surface-variant text-center w-28">
                    {SUBJECTS.find((s) => s.id === sid)?.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {roster.map((s) => (
                <tr key={s.id}>
                  <td className="p-sm pl-6 sticky left-0 bg-surface z-10 font-medium text-on-surface">{s.name}</td>
                  {subjectIds.map((sid) => (
                    <td key={sid} className="p-sm text-center">
                      <input
                        type="number"
                        min={0}
                        max={activeExam?.totalMarks}
                        value={cellValue(s.id, sid)}
                        onChange={(e) => setCell(s.id, sid, e.target.value)}
                        className="w-16 text-center bg-surface border border-outline-variant rounded px-2 py-1 text-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={subjectIds.length + 1} className="p-8 text-center text-body-md text-on-surface-variant">
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
          <Button onClick={handleSave} disabled={roster.length === 0}>
            Save Marks
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EnterMarksPage() {
  return (
    <Suspense>
      <EnterMarksContent />
    </Suspense>
  );
}
