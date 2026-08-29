"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useExamsStore, useStudents } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { classLabel } from "@/lib/mock/reference-data";
import { grade } from "@/lib/mock/exams";
import { formatDate } from "@/lib/format";

export default function ParentAcademicsPage() {
  const { user } = useSession();
  const { students } = useStudents();
  const { exams, marks } = useExamsStore();

  const children = students.filter((s) => user?.childStudentIds?.includes(s.id));

  return (
    <div>
      <PageHeader title="Academics" description="Exam results for your children." />

      {children.length === 0 ? (
        <EmptyState icon="grade" title="No children linked to this account" description="Contact the school office if this looks wrong." />
      ) : (
        <div className="space-y-8">
          {children.map((child) => {
            const childExams = exams.filter((e) => e.status === "completed" && e.resultsPublished && marks.some((m) => m.examId === e.id && m.studentId === child.id));
            return (
              <div key={child.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <div className="p-lg border-b border-outline-variant/40 flex items-center gap-3">
                  <Avatar name={child.name} size="lg" />
                  <div>
                    <p className="text-title-lg font-semibold text-on-surface">{child.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{classLabel(child.classId)} · Roll {child.rollNumber}</p>
                  </div>
                </div>
                <div className="divide-y divide-outline-variant/20">
                  {childExams.map((exam) => {
                    const entries = marks.filter((m) => m.examId === exam.id && m.studentId === child.id);
                    const obtained = entries.reduce((s, e) => s + e.obtainedMarks, 0);
                    const outOf = entries.reduce((s, e) => s + e.totalMarks, 0);
                    const pct = outOf ? Math.round((obtained / outOf) * 100) : 0;
                    return (
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
                          <span className="text-body-md font-medium text-on-surface">{obtained}/{outOf} ({pct}%)</span>
                          <StatusBadge label={grade(pct)} tone={pct >= 60 ? "success" : pct >= 40 ? "warning" : "error"} />
                        </div>
                      </Link>
                    );
                  })}
                  {childExams.length === 0 && (
                    <p className="px-lg py-6 text-body-md text-on-surface-variant">No published results yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
