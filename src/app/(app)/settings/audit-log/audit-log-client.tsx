"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { setRetentionDaysAction, cleanUpNowAction } from "@/app/(app)/settings/audit-log/actions";
import { ROLE_LABEL } from "@/lib/nav-config";
import { formatDate, timeAgo } from "@/lib/format";
import type { Role } from "@/lib/types";

interface AuditLogRow {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  userName: string;
  userRole: string | null;
}

interface Filters {
  action: string;
  entity: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
}

interface FilterOptions {
  actions: string[];
  entities: string[];
  users: { id: string; name: string }[];
}

const RETENTION_OPTIONS = [
  { value: "", label: "Never (keep forever)" },
  { value: "30", label: "30 days" },
  { value: "40", label: "40 days" },
  { value: "50", label: "50 days" },
  { value: "60", label: "60 days" },
];

export function AuditLogClient({
  rows,
  total,
  page,
  pageSize,
  totalPages,
  filters,
  filterOptions,
  retentionDays,
}: {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: Filters;
  filterOptions: FilterOptions;
  retentionDays: number | null;
}) {
  const router = useRouter();
  const [savingRetention, setSavingRetention] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [confirmCleanUp, setConfirmCleanUp] = useState(false);
  const [detailRow, setDetailRow] = useState<AuditLogRow | null>(null);

  function navigate(next: Partial<Filters & { page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const usp = new URLSearchParams();
    if (merged.action) usp.set("action", merged.action);
    if (merged.entity) usp.set("entity", merged.entity);
    if (merged.userId) usp.set("userId", merged.userId);
    if (merged.dateFrom) usp.set("dateFrom", merged.dateFrom);
    if (merged.dateTo) usp.set("dateTo", merged.dateTo);
    if (merged.page && merged.page !== 1) usp.set("page", String(merged.page));
    router.push(`/settings/audit-log${usp.toString() ? `?${usp.toString()}` : ""}`);
  }

  async function handleRetentionChange(value: string) {
    const days = value ? Number(value) : null;
    setSavingRetention(true);
    const result = await setRetentionDaysAction(days);
    setSavingRetention(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(days ? `Audit logs older than ${days} days will now be removed automatically.` : "Audit logs will be kept forever.");
    router.refresh();
  }

  async function handleCleanUpNow() {
    setCleaningUp(true);
    const result = await cleanUpNowAction();
    setCleaningUp(false);
    setConfirmCleanUp(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.deletedCount ? `Removed ${result.deletedCount} log${result.deletedCount === 1 ? "" : "s"} older than the retention window.` : "No logs were old enough to remove.");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Audit Log" description="Every tracked change and action across your school, in one place." />

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm mb-6">
        <h3 className="text-title-lg font-semibold text-on-surface mb-1">Retention</h3>
        <p className="text-body-md text-on-surface-variant mb-4">
          {retentionDays ? `Logs older than ${retentionDays} days are removed automatically.` : "Logs are kept forever until you set a retention window."}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Keep logs for</label>
            <Select value={retentionDays ? String(retentionDays) : ""} onChange={(e) => handleRetentionChange(e.target.value)} disabled={savingRetention} className="w-full">
              {RETENTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={() => setConfirmCleanUp(true)} disabled={cleaningUp}>
            <Trash2 size={16} /> Clean Up Now
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">From</label>
            <Input type="date" value={filters.dateFrom} onChange={(e) => navigate({ dateFrom: e.target.value })} />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">To</label>
            <Input type="date" value={filters.dateTo} onChange={(e) => navigate({ dateTo: e.target.value })} />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Action</label>
            <Select value={filters.action} onChange={(e) => navigate({ action: e.target.value })} className="w-full">
              <option value="">All actions</option>
              {filterOptions.actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Entity</label>
            <Select value={filters.entity} onChange={(e) => navigate({ entity: e.target.value })} className="w-full">
              <option value="">All entities</option>
              {filterOptions.entities.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">User</label>
            <Select value={filters.userId} onChange={(e) => navigate({ userId: e.target.value })} className="w-full">
              <option value="">All users</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-3 pl-lg font-semibold text-label-sm text-on-surface-variant uppercase">When</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">User</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Action</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Entity</th>
                <th className="p-3 pr-lg font-semibold text-label-sm text-on-surface-variant uppercase text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-3 pl-lg text-on-surface-variant whitespace-nowrap" title={formatDate(row.createdAt)}>{timeAgo(row.createdAt)}</td>
                  <td className="p-3 text-on-surface">
                    {row.userName}
                    {row.userRole && <span className="text-label-sm text-on-surface-variant"> · {ROLE_LABEL[row.userRole as Role] ?? row.userRole}</span>}
                  </td>
                  <td className="p-3"><StatusBadge label={row.action} tone="info" /></td>
                  <td className="p-3 text-on-surface-variant">
                    {row.entity}
                    {row.entityId && <span className="text-label-sm"> · {row.entityId.slice(0, 8)}…</span>}
                  </td>
                  <td className="p-3 pr-lg text-right">
                    <button className="text-label-md text-secondary hover:underline" onClick={() => setDetailRow(row)} disabled={!row.metadata}>
                      {row.metadata ? "View" : "—"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon="history" title="No matching activity" description="Try widening your filters, or nothing has happened here yet." />}
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between p-lg border-t border-outline-variant/40">
            <span className="text-label-sm text-on-surface-variant">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>
                <ChevronLeft size={16} /> Previous
              </Button>
              <span className="text-label-sm text-on-surface-variant">Page {page} of {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => navigate({ page: page + 1 })}>
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)} title="Log Details" className="max-w-[32rem]">
        {detailRow && (
          <div className="space-y-3">
            <p className="text-body-md text-on-surface">
              <span className="font-semibold">{detailRow.userName}</span> · {detailRow.action} · {detailRow.entity}
            </p>
            <p className="text-label-sm text-on-surface-variant">{formatDate(detailRow.createdAt)}</p>
            <pre className="text-label-sm bg-surface-container-lowest border border-outline-variant rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(detailRow.metadata, null, 2)}
            </pre>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmCleanUp}
        onOpenChange={setConfirmCleanUp}
        title="Clean up expired logs now?"
        description={retentionDays ? `Every log entry older than ${retentionDays} days will be permanently removed.` : "Retention is set to Never — there's nothing to clean up until you set a window above."}
        confirmLabel={cleaningUp ? "Cleaning up…" : "Clean Up Now"}
        onConfirm={handleCleanUpNow}
      />
    </div>
  );
}
