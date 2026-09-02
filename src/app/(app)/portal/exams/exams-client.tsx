"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { gradeFor } from "@/lib/grade";
import { formatDate } from "@/lib/format";

interface ExamRow {
  id: string;
  name: string;
  term: string;
  endDate: string;
  obtained: number;
  outOf: number;
  percentage: number;
}

interface ChildRow {
  id: string;
  name: string;
  classLabel: string;
  rollNumber: string;
  exams: ExamRow[];
}

export function ParentExamsClient({ childRows, gradeBands }: { childRows: ChildRow[]; gradeBands: { grade: string; minPercentage: number }[] }) {
  return (
    <div>
      <PageHeader title="Academics" description="Exam results for your children." />

      {childRows.length === 0 ? (
        <EmptyState icon="grade" title="No children linked to this account" description="Contact the school office if this looks wrong." />
      ) : (
        <div className="space-y-8">
          {childRows.map((child) => (
            <div key={child.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="p-lg border-b border-outline-variant/40 flex items-center gap-3">
                <Avatar name={child.name} size="lg" />
                <div>
                  <p className="text-title-lg font-semibold text-on-surface">{child.name}</p>
                  <p className="text-label-sm text-on-surface-variant">{child.classLabel} · Roll {child.rollNumber}</p>
                </div>
              </div>
              <div className="divide-y divide-outline-variant/20">
                {child.exams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/exams/results/${child.id}`}
                    className="flex items-center justify-between px-lg py-4 hover:bg-surface-container-low transition-colors"
                  >
                    <div>
                      <p className="text-body-md font-medium text-on-surface">{exam.name}</p>
                      <p className="text-label-sm text-on-surface-variant">{exam.term} · {formatDate(exam.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-body-md font-medium text-on-surface">{exam.obtained}/{exam.outOf} ({exam.percentage}%)</span>
                      <StatusBadge label={gradeFor(exam.percentage, gradeBands)} tone={exam.percentage >= 60 ? "success" : exam.percentage >= 40 ? "warning" : "error"} />
                    </div>
                  </Link>
                ))}
                {child.exams.length === 0 && (
                  <p className="px-lg py-6 text-body-md text-on-surface-variant">No published results yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
