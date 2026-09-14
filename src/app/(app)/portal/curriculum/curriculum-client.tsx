"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

type TopicStatus = "not_started" | "in_progress" | "completed";
const STATUS_LABEL: Record<TopicStatus, string> = { not_started: "Not Started", in_progress: "In Progress", completed: "Completed" };
const STATUS_TONE: Record<TopicStatus, "neutral" | "warning" | "success"> = { not_started: "neutral", in_progress: "warning", completed: "success" };

interface SubjectRow {
  subjectId: string;
  subjectName: string;
  topics: { id: string; title: string; status: TopicStatus }[];
  progressPct: number;
}

interface ChildRow {
  id: string;
  name: string;
  classLabel: string;
  subjects: SubjectRow[];
}

export function ParentCurriculumClient({ childRows, sessionLabel }: { childRows: ChildRow[]; sessionLabel: string }) {
  return (
    <div>
      <PageHeader title="Curriculum" description={`The syllabus plan and progress for each of your children — ${sessionLabel}.`} />

      <div className="space-y-8">
        {childRows.map((child) => (
          <div key={child.id} className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
            <h3 className="text-title-lg font-semibold text-primary mb-1">{child.name}</h3>
            <p className="text-label-sm text-on-surface-variant mb-4">{child.classLabel}</p>

            {child.subjects.length === 0 && (
              <EmptyState icon="menu_book" title="No syllabus yet" description="Nothing has been planned for this child's classes yet." />
            )}

            <div className="space-y-5">
              {child.subjects.map((subject) => (
                <div key={subject.subjectId}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-body-md font-semibold text-on-surface">{subject.subjectName}</p>
                    <span className="text-label-sm text-on-surface-variant">{subject.progressPct}% complete</span>
                  </div>
                  {subject.topics.length === 0 ? (
                    <p className="text-label-sm text-on-surface-variant">No topics added yet.</p>
                  ) : (
                    <>
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${subject.progressPct}%` }} />
                      </div>
                      <ul className="space-y-1.5">
                        {subject.topics.map((topic) => (
                          <li key={topic.id} className="flex items-center justify-between gap-3 text-body-md">
                            <span className="text-on-surface">{topic.title}</span>
                            <StatusBadge label={STATUS_LABEL[topic.status]} tone={STATUS_TONE[topic.status]} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {childRows.length === 0 && <p className="text-body-md text-on-surface-variant">No children linked to this account.</p>}
      </div>
    </div>
  );
}
