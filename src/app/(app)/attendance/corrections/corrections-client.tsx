"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { approveCorrectionAction, rejectCorrectionAction } from "@/app/(app)/attendance/corrections/actions";
import { formatDate } from "@/lib/format";
import type { AttendanceStatus, CorrectionStatus } from "@/lib/types";

const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "Present", absent: "Absent", leave: "Leave", late: "Late" };
const REVIEW_TONE: Record<CorrectionStatus, "success" | "error" | "warning"> = { pending: "warning", approved: "success", rejected: "error" };

interface CorrectionRow {
  id: string;
  studentName: string;
  classLabel: string;
  date: string;
  currentStatus: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  requestedByName: string;
  reviewedByName: string | null;
}

export function CorrectionsClient({ isTeacher, corrections }: { isTeacher: boolean; corrections: CorrectionRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setBusyId(id);
    const result = await approveCorrectionAction(id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Correction approved — the attendance record has been updated.");
    router.refresh();
  }

  async function handleReject(id: string) {
    setBusyId(id);
    const result = await rejectCorrectionAction(id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Correction rejected.");
    router.refresh();
  }

  if (isTeacher) {
    const pending = corrections.filter((c) => c.status === "pending").length;
    return (
      <div>
        <PageHeader title="My Correction Requests" description="Attendance correction requests you've submitted." />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Requests" value={String(corrections.length)} icon="history" />
          <StatCard label="Pending Review" value={String(pending)} icon="pending_actions" />
          <StatCard label="Approved" value={String(corrections.filter((c) => c.status === "approved").length)} icon="task_alt" />
        </div>

        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
          <div className="p-lg border-b border-outline-variant/40">
            <h3 className="text-title-lg font-semibold text-primary">Requests</h3>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {corrections.map((c) => (
              <div key={c.id} className="px-lg py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{c.studentName} — {c.classLabel}</p>
                    <p className="text-label-sm text-on-surface-variant">{formatDate(c.date)} · {STATUS_LABEL[c.currentStatus]} → {STATUS_LABEL[c.requestedStatus]}</p>
                  </div>
                  <StatusBadge label={c.status[0].toUpperCase() + c.status.slice(1)} tone={REVIEW_TONE[c.status]} />
                </div>
                <p className="text-body-md text-on-surface-variant mt-2">{c.reason}</p>
              </div>
            ))}
            {corrections.length === 0 && <EmptyState icon="history" title="No correction requests yet" description="Request a correction from a student's Attendance tab." />}
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = corrections.filter((c) => c.status === "pending").length;

  return (
    <div>
      <PageHeader title="Attendance Corrections" description="Review teacher-submitted corrections to already-saved attendance records." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Requests" value={String(corrections.length)} icon="history" />
        <StatCard label="Pending Review" value={String(pendingCount)} icon="pending_actions" />
        <StatCard label="Approved" value={String(corrections.filter((c) => c.status === "approved").length)} icon="task_alt" />
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
        <div className="p-lg border-b border-outline-variant/40">
          <h3 className="text-title-lg font-semibold text-primary">Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-4 pl-lg font-semibold text-label-sm text-on-surface-variant uppercase">Student</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Class</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Date</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Change</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Requested By</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Status</th>
                <th className="p-4 pr-lg font-semibold text-label-sm text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {corrections.map((c) => (
                <tr key={c.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-4 pl-lg font-medium text-on-surface">{c.studentName}</td>
                  <td className="p-4 text-on-surface-variant">{c.classLabel}</td>
                  <td className="p-4 text-on-surface-variant whitespace-nowrap">{formatDate(c.date)}</td>
                  <td className="p-4 text-on-surface-variant whitespace-nowrap">{STATUS_LABEL[c.currentStatus]} → {STATUS_LABEL[c.requestedStatus]}</td>
                  <td className="p-4 text-on-surface-variant">{c.requestedByName}</td>
                  <td className="p-4">
                    <StatusBadge label={c.status[0].toUpperCase() + c.status.slice(1)} tone={REVIEW_TONE[c.status]} />
                  </td>
                  <td className="p-4 pr-lg text-right">
                    {c.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                          title="Approve"
                          onClick={() => handleApprove(c.id)}
                          disabled={busyId === c.id}
                        >
                          <Check size={18} />
                        </button>
                        <button
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded transition-colors disabled:opacity-50"
                          title="Reject"
                          onClick={() => handleReject(c.id)}
                          disabled={busyId === c.id}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-label-sm text-on-surface-variant">by {c.reviewedByName ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {corrections.length === 0 && <EmptyState icon="history" title="No correction requests" description="Teacher-submitted attendance corrections will appear here for review." />}
        </div>
      </div>
    </div>
  );
}
