"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

interface EntryRow {
  id: string;
  date: string;
  subjectName: string;
  title: string;
  description: string;
}

interface ChildRow {
  id: string;
  name: string;
  classLabel: string;
  entries: EntryRow[];
}

export function ParentClassworkClient({ childRows }: { childRows: ChildRow[] }) {
  return (
    <div>
      <PageHeader title="Classwork" description="What each of your children covered in class, day by day." />

      <div className="space-y-8">
        {childRows.map((child) => (
          <div key={child.id} className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-lg card-shadow">
            <h3 className="text-title-lg font-semibold text-primary mb-1">{child.name}</h3>
            <p className="text-label-sm text-on-surface-variant mb-4">{child.classLabel}</p>
            {child.entries.length === 0 ? (
              <EmptyState icon="edit_note" title="No classwork yet" description="Entries the teacher posts will show up here." />
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {child.entries.map((entry) => (
                  <div key={entry.id} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-body-md font-medium text-on-surface">{entry.title}</p>
                      <span className="text-label-sm text-on-surface-variant whitespace-nowrap">{formatDate(entry.date)}</span>
                    </div>
                    <p className="text-label-sm text-secondary mt-0.5">{entry.subjectName}</p>
                    {entry.description && <p className="text-body-md text-on-surface-variant mt-1">{entry.description}</p>}
                  </div>
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
