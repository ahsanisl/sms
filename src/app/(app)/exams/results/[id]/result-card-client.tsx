"use client";

import { useState } from "react";
import { Printer, Award } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { gradeFor } from "@/lib/grade";
import { formatDate } from "@/lib/format";

interface MarkEntry {
  id: string;
  subjectId: string;
  subjectName: string;
  obtainedMarks: number;
  totalMarks: number;
}

interface ExamOption {
  id: string;
  name: string;
  term: string;
  startDate: string;
  passingMarks: number;
  resultsPublished: boolean;
  entries: MarkEntry[];
}

export function ResultCardClient({
  studentName,
  classLabel,
  rollNumber,
  exams,
  canSeeUnpublished,
  gradeBands,
  schoolName,
  schoolTagline,
  schoolAddress,
  schoolLogoEmoji,
  showSignatureLines,
  reportCardFooter,
}: {
  studentName: string;
  classLabel: string;
  rollNumber: string;
  exams: ExamOption[];
  canSeeUnpublished: boolean;
  gradeBands: { grade: string; minPercentage: number }[];
  schoolName: string;
  schoolTagline: string;
  schoolAddress: string;
  schoolLogoEmoji: string;
  showSignatureLines: boolean;
  reportCardFooter: string;
}) {
  const [examId, setExamId] = useState(exams[exams.length - 1]?.id ?? "");
  const exam = exams.find((e) => e.id === examId) ?? exams[exams.length - 1];

  const totalObtained = exam ? exam.entries.reduce((s, e) => s + e.obtainedMarks, 0) : 0;
  const totalMax = exam ? exam.entries.reduce((s, e) => s + e.totalMarks, 0) : 0;
  const percentage = totalMax ? Math.round((totalObtained / totalMax) * 100) : 0;
  const overallGrade = gradeFor(percentage, gradeBands);
  const passed = exam ? percentage >= exam.passingMarks : false;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <h2 className="text-headline-md font-semibold text-on-surface">Student Result</h2>
        <div className="flex items-center gap-3">
          {exams.length > 1 && (
            <Select value={exam?.id ?? ""} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </Button>
        </div>
      </div>

      {!exam ? (
        <EmptyState icon="quiz" title="No published results" description="This student has no published exam results yet." />
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg space-y-8">
          <div className="flex items-center gap-3 pb-lg border-b border-outline-variant text-center justify-center flex-col">
            <span className="text-4xl leading-none">{schoolLogoEmoji}</span>
            <div>
              <h1 className="text-headline-md font-semibold text-primary">{schoolName}</h1>
              <p className="text-label-sm text-on-surface-variant">{schoolTagline}</p>
              <p className="text-label-sm text-on-surface-variant">{schoolAddress}</p>
            </div>
          </div>
          {canSeeUnpublished && !exam.resultsPublished && (
            <div className="flex items-center gap-2 -mt-2 print:hidden">
              <StatusBadge label="Unpublished — not visible to the parent yet" tone="warning" />
            </div>
          )}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-lg border-b border-outline-variant">
            <div className="flex items-center gap-4">
              <Avatar name={studentName} size="lg" />
              <div>
                <h3 className="text-title-lg font-semibold text-on-surface">{studentName}</h3>
                <p className="text-body-md text-on-surface-variant">
                  {classLabel} · Roll {rollNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-body-md font-medium text-on-surface">{exam.name}</p>
              <p className="text-label-sm text-on-surface-variant">{exam.term} · {formatDate(exam.startDate)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-title-lg font-semibold text-primary mb-4">Academic Performance</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide">Subject</th>
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Max Marks</th>
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Marks Obtained</th>
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {exam.entries.map((entry) => {
                  const pct = Math.round((entry.obtainedMarks / entry.totalMarks) * 100);
                  return (
                    <tr key={entry.id}>
                      <td className="px-6 py-3 text-body-md text-on-surface font-medium">{entry.subjectName}</td>
                      <td className="px-6 py-3 text-body-md text-on-surface-variant text-right">{entry.totalMarks}</td>
                      <td className="px-6 py-3 text-body-md text-on-surface text-right">{entry.obtainedMarks}</td>
                      <td className="px-6 py-3 text-center">
                        <StatusBadge label={gradeFor(pct, gradeBands)} tone={pct >= 60 ? "success" : pct >= 40 ? "warning" : "error"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-title-lg font-semibold text-primary mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryTile label="Total Marks" value={`${totalObtained} / ${totalMax}`} />
              <SummaryTile label="Percentage" value={`${percentage}%`} />
              <SummaryTile label="Overall Grade" value={overallGrade} highlight />
              <SummaryTile label="Result" value={passed ? "Pass" : "Fail"} tone={passed ? "success" : "error"} />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-secondary-container/10 rounded-lg p-4 text-body-md text-on-surface-variant">
            <Award className="text-secondary shrink-0" size={20} />
            {passed
              ? "Congratulations! This student has met the passing criteria for this examination."
              : "This student did not meet the minimum passing marks for one or more subjects. Consider scheduling additional support."}
          </div>

          {showSignatureLines && (
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="text-center">
                <div className="border-t border-on-surface-variant/40 pt-2">
                  <p className="text-label-sm text-on-surface-variant">Class Teacher</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-on-surface-variant/40 pt-2">
                  <p className="text-label-sm text-on-surface-variant">Principal</p>
                </div>
              </div>
            </div>
          )}

          {reportCardFooter && (
            <p className="text-label-sm text-on-surface-variant text-center pt-4 border-t border-outline-variant/40">{reportCardFooter}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "success" | "error" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "error" ? "text-error" : highlight ? "text-secondary" : "text-primary";
  return (
    <div className="bg-surface-bright border border-outline-variant/50 rounded-lg p-4">
      <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-headline-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}
