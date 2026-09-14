"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

type SubmissionStatus = "not_submitted" | "submitted" | "graded";
const STATUS_LABEL: Record<SubmissionStatus, string> = { not_submitted: "Not Submitted", submitted: "Submitted", graded: "Graded" };
const STATUS_TONE: Record<SubmissionStatus, "neutral" | "warning" | "success"> = { not_submitted: "neutral", submitted: "warning", graded: "success" };

interface EntryRow {
  id: string;
  subjectName: string;
  title: string;
  dueDate: string;
  status: SubmissionStatus;
  grade: string;
  overdue: boolean;
}

interface ChildRow {
  id: string;
  name: string;
  classLabel: string;
  entries: EntryRow[];
}

export function ParentHomeworkClient({ childRows }: { childRows: ChildRow[] }) {
  return (
    <div>
      <PageHeader title="Homework" description="Homework assigned to each of your children, and its submission status." />

      <div className="space-y-8">
        {childRows.map((child) => (
          <div key={child.id} className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
            <h3 className="text-title-lg font-semibold text-primary mb-1">{child.name}</h3>
            <p className="text-label-sm text-on-surface-variant mb-4">{child.classLabel}</p>
            {child.entries.length === 0 ? (
              <EmptyState icon="assignment" title="No homework yet" description="Homework the teacher assigns will show up here." />
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {child.entries.map((entry) => (
                  <Link key={entry.id} href={`/portal/homework/${entry.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-surface-container-low -mx-2 px-2 rounded-md transition-colors">
                    <div>
                      <p className="text-body-md font-medium text-on-surface">{entry.title}</p>
                      <p className="text-label-sm text-secondary">{entry.subjectName}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {entry.grade && <span className="text-label-md font-semibold text-on-surface">{entry.grade}</span>}
                      <StatusBadge label={STATUS_LABEL[entry.status]} tone={entry.overdue ? "error" : STATUS_TONE[entry.status]} />
                      <span className="text-label-sm text-on-surface-variant whitespace-nowrap">Due {formatDate(entry.dueDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {childRows.length === 0 && <p className="text-body-md text-on-surface-variant">No children linked to this account.</p>}
      </div>
    </div>
  );
}
