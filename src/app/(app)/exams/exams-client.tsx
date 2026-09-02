"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { publishResultsAction, unpublishResultsAction } from "@/app/(app)/exams/actions";
import { formatDate } from "@/lib/format";
import type { ExamStatus } from "@/lib/types";

interface ExamRow {
  id: string;
  name: string;
  term: string;
  classIds: string[];
  startDate: string;
  endDate: string;
  status: ExamStatus;
  resultsPublished: boolean;
}

export function ExamsClient({
  exams,
  classLabelById,
  pendingMarksCount,
  canPublish,
}: {
  exams: ExamRow[];
  classLabelById: Map<string, string>;
  pendingMarksCount: number;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const upcoming = exams.filter((e) => e.status === "scheduled").length;
  const completed = exams.filter((e) => e.status === "completed").length;
  const published = exams.filter((e) => e.status === "completed" && e.resultsPublished).length;

  async function handlePublish(examId: string, examName: string) {
    setBusyId(examId);
    const result = await publishResultsAction(examId);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${examName} results published — visible to teachers and parents now.`);
    router.refresh();
  }

  async function handleUnpublish(examId: string, examName: string) {
    setBusyId(examId);
    const result = await unpublishResultsAction(examId);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${examName} results unpublished.`);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Exams & Results"
        description="Manage examinations, enter marks and publish results."
        actions={
          <Button size="sm" asChild>
            <Link href="/exams/create">Create Exam</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Upcoming Exams" value={String(upcoming)} icon="event_upcoming" />
        <StatCard label="Completed Exams" value={String(completed)} icon="task_alt" />
        <StatCard label="Pending Marks" value={String(pendingMarksCount)} icon="pending_actions" />
        <StatCard label="Published Results" value={String(published)} icon="workspace_premium" />
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
        <div className="p-lg border-b border-outline-variant/40">
          <h3 className="text-title-lg font-semibold text-primary">Examination Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-4 pl-lg font-semibold text-label-sm text-on-surface-variant uppercase">Exam Title</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Target Group</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Date Range</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Status</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Results</th>
                <th className="p-4 pr-lg font-semibold text-label-sm text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-4 pl-lg">
                    <p className="font-medium text-on-surface">{exam.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{exam.term}</p>
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    {exam.classIds.map((id) => classLabelById.get(id) ?? "—").join(", ")}
                  </td>
                  <td className="p-4 text-on-surface-variant whitespace-nowrap">
                    {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                  </td>
                  <td className="p-4">
                    <StatusBadge
                      label={exam.status[0].toUpperCase() + exam.status.slice(1)}
                      tone={exam.status === "completed" ? "success" : exam.status === "ongoing" ? "warning" : "info"}
                    />
                  </td>
                  <td className="p-4">
                    {exam.status === "completed" ? (
                      <StatusBadge label={exam.resultsPublished ? "Published" : "Unpublished"} tone={exam.resultsPublished ? "success" : "neutral"} />
                    ) : (
                      <span className="text-label-sm text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="p-4 pr-lg text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/exams/marks?examId=${exam.id}`} className="text-label-md text-secondary hover:underline whitespace-nowrap">
                        {exam.status === "completed" ? "View Marks" : "Enter Marks"}
                      </Link>
                      {canPublish && exam.status === "completed" && (
                        exam.resultsPublished ? (
                          <button
                            className="text-label-md text-on-surface-variant hover:underline whitespace-nowrap disabled:opacity-50"
                            onClick={() => handleUnpublish(exam.id, exam.name)}
                            disabled={busyId === exam.id}
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            className="text-label-md text-secondary hover:underline whitespace-nowrap disabled:opacity-50"
                            onClick={() => handlePublish(exam.id, exam.name)}
                            disabled={busyId === exam.id}
                          >
                            Publish Results
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-body-md text-on-surface-variant">No exams scheduled yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
