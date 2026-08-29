"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useExamsStore, useStudents, usePermissions } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { classLabel } from "@/lib/mock/reference-data";
import { formatDate } from "@/lib/format";

export default function ExamsPage() {
  const { exams, marks, publishResults, unpublishResults } = useExamsStore();
  const { students } = useStudents();
  const { scopedCampusId } = useCampusScope();
  const { user } = useSession();
  const { routePermissions } = usePermissions();
  const canPublish = !!user && !!routePermissions[user.role]?.examsCreate;

  const scopedExams = scopedCampusId ? exams.filter((e) => e.campusId === scopedCampusId) : exams;

  const upcoming = scopedExams.filter((e) => e.status === "scheduled").length;
  const completed = scopedExams.filter((e) => e.status === "completed").length;
  const published = scopedExams.filter((e) => e.status === "completed" && e.resultsPublished).length;

  function handlePublish(examId: string, examName: string) {
    publishResults(examId);
    toast.success(`${examName} results published — visible to teachers and parents now.`);
  }

  function handleUnpublish(examId: string, examName: string) {
    unpublishResults(examId);
    toast.success(`${examName} results unpublished.`);
  }

  let pendingMarksCount = 0;
  scopedExams
    .filter((e) => e.status === "completed")
    .forEach((exam) => {
      exam.classIds.forEach((classId) => {
        const roster = students.filter((s) => s.classId === classId && s.status === "active");
        const hasAllMarks = roster.every((s) => marks.some((m) => m.examId === exam.id && m.studentId === s.id));
        if (!hasAllMarks) pendingMarksCount++;
      });
    });

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
              {scopedExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-4 pl-lg">
                    <p className="font-medium text-on-surface">{exam.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{exam.term}</p>
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    {exam.classIds.map((id) => classLabel(id)).join(", ")}
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
                            className="text-label-md text-on-surface-variant hover:underline whitespace-nowrap"
                            onClick={() => handleUnpublish(exam.id, exam.name)}
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            className="text-label-md text-secondary hover:underline whitespace-nowrap"
                            onClick={() => handlePublish(exam.id, exam.name)}
                          >
                            Publish Results
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
