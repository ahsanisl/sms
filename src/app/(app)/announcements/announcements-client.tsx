"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteAnnouncementAction } from "@/app/(app)/announcements/actions";
import { formatDate, timeAgo } from "@/lib/format";
import type { AnnouncementAudience, AnnouncementPriority } from "@/lib/types";

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Entire School",
  teachers: "Teachers",
  parents: "Parents",
  students: "Students",
};

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  author: string;
  publishedAt: string;
}

export function AnnouncementsClient({ announcements, canManage }: { announcements: AnnouncementRow[]; canManage: boolean }) {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<AnnouncementRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!toDelete) return;
    setBusy(true);
    const result = await deleteAnnouncementAction(toDelete.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Announcement deleted.");
    setToDelete(null);
    router.refresh();
  }

  const columns: Column<AnnouncementRow>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      accessor: (a) => a.title,
      render: (a) => <span className="font-medium text-on-surface">{a.title}</span>,
    },
    { key: "audience", header: "Audience", accessor: (a) => AUDIENCE_LABEL[a.audience], className: "text-on-surface-variant" },
    { key: "date", header: "Published Date", sortable: true, accessor: (a) => a.publishedAt, render: (a) => formatDate(a.publishedAt), className: "text-on-surface-variant" },
    {
      key: "priority",
      header: "Priority",
      render: (a) => <StatusBadge label={a.priority === "important" ? "Important" : "Normal"} tone={a.priority === "important" ? "warning" : "neutral"} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (a: AnnouncementRow) => (
              <div className="flex items-center justify-end gap-2">
                <button className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container rounded-md transition-colors" title="Edit" onClick={() => toast.info("Editing announcements isn't wired up in this prototype.")}>
                  <Pencil size={18} />
                </button>
                <button className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors" title="Delete" onClick={() => setToDelete(a)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ),
          } satisfies Column<AnnouncementRow>,
        ]
      : []),
  ];

  const byAudience = ["all", "teachers", "parents", "students"].map((aud) => ({
    label: AUDIENCE_LABEL[aud],
    count: announcements.filter((a) => a.audience === aud).length,
  }));

  return (
    <div>
      <PageHeader
        title="Announcements"
        description={canManage ? "Manage and publish school-wide communications." : "School and campus announcements."}
        actions={
          canManage && (
            <Button size="sm" asChild>
              <Link href="/announcements/create">
                <Plus size={16} /> Create Announcement
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DataTable
            columns={columns}
            data={announcements}
            rowKey={(a) => a.id}
            searchPlaceholder="Search announcements…"
            searchKeys={(a) => [a.title, a.body]}
            filters={[{ key: "audience", label: "Audience", options: Object.entries(AUDIENCE_LABEL).map(([value, label]) => ({ value, label })) }]}
            filterFn={(a, values) => !values.audience || a.audience === values.audience}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4">Overview</h3>
            <div className="space-y-3">
              {byAudience.map((b) => (
                <div key={b.label} className="flex justify-between text-body-md">
                  <span className="text-on-surface-variant">{b.label}</span>
                  <span className="font-semibold text-on-surface">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className="border-b border-outline-variant/30 pb-3 last:border-0 last:pb-0">
                  <p className="text-body-md text-on-surface font-medium">{a.title}</p>
                  <p className="text-label-sm text-on-surface-variant mt-1">{a.author} · {timeAgo(a.publishedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this announcement?"
        description={toDelete ? `"${toDelete.title}" will be removed for all audiences.` : undefined}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onConfirm={handleDelete}
      />
    </div>
  );
}
