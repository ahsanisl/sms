"use client";

import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAttendanceCorrections, useStudents } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { classLabel } from "@/lib/mock/reference-data";
import { formatDate } from "@/lib/format";
import type { AttendanceStatus, CorrectionStatus } from "@/lib/types";

const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "Present", absent: "Absent", leave: "Leave", late: "Late" };
const REVIEW_TONE: Record<CorrectionStatus, "success" | "error" | "warning"> = { pending: "warning", approved: "success", rejected: "error" };

export default function AttendanceCorrectionsPage() {
  const { user } = useSession();
  const { corrections, reviewCorrection } = useAttendanceCorrections();
  const { students } = useStudents();
  const { scopedCampusId } = useCampusScope();

  function studentName(id: string) {
    return students.find((s) => s.id === id)?.name ?? "Unknown Student";
  }

  function handleApprove(id: string) {
    reviewCorrection({ id, status: "approved", reviewedBy: user?.name ?? "Admin" });
    toast.success("Correction approved — the attendance record has been updated.");
  }

  function handleReject(id: string) {
    reviewCorrection({ id, status: "rejected", reviewedBy: user?.name ?? "Admin" });
    toast.success("Correction rejected.");
  }

  const isTeacher = user?.role === "teacher";

  if (isTeacher) {
    const mine = corrections.filter((c) => c.requestedBy === user!.name);
    const pending = mine.filter((c) => c.status === "pending").length;

    return (
      <div>
        <PageHeader title="My Correction Requests" description="Attendance correction requests you've submitted." />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Requests" value={String(mine.length)} icon="history" />
          <StatCard label="Pending Review" value={String(pending)} icon="pending_actions" />
          <StatCard label="Approved" value={String(mine.filter((c) => c.status === "approved").length)} icon="task_alt" />
        </div>

        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
          <div className="p-lg border-b border-outline-variant/40">
            <h3 className="text-title-lg font-semibold text-primary">Requests</h3>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {mine.map((c) => (
              <div key={c.id} className="px-lg py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{studentName(c.studentId)} — {classLabel(c.classId)}</p>
                    <p className="text-label-sm text-on-surface-variant">{formatDate(c.date)} · {STATUS_LABEL[c.currentStatus]} → {STATUS_LABEL[c.requestedStatus]}</p>
                  </div>
                  <StatusBadge label={c.status[0].toUpperCase() + c.status.slice(1)} tone={REVIEW_TONE[c.status]} />
                </div>
                <p className="text-body-md text-on-surface-variant mt-2">{c.reason}</p>
              </div>
            ))}
            {mine.length === 0 && <EmptyState icon="history" title="No correction requests yet" description="Request a correction from a student's Attendance tab." />}
          </div>
        </div>
      </div>
    );
  }

  // Admin / Campus Admin / School Owner: an approval queue, campus-scoped like everything else.
  const scopedStudentIds = new Set((scopedCampusId ? students.filter((s) => s.campusId === scopedCampusId) : students).map((s) => s.id));
  const scoped = corrections.filter((c) => scopedStudentIds.has(c.studentId));
  const pendingCount = scoped.filter((c) => c.status === "pending").length;

  return (
    <div>
      <PageHeader title="Attendance Corrections" description="Review teacher-submitted corrections to already-saved attendance records." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Requests" value={String(scoped.length)} icon="history" />
        <StatCard label="Pending Review" value={String(pendingCount)} icon="pending_actions" />
        <StatCard label="Approved" value={String(scoped.filter((c) => c.status === "approved").length)} icon="task_alt" />
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
              {scoped.map((c) => (
                <tr key={c.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-4 pl-lg font-medium text-on-surface">{studentName(c.studentId)}</td>
                  <td className="p-4 text-on-surface-variant">{classLabel(c.classId)}</td>
                  <td className="p-4 text-on-surface-variant whitespace-nowrap">{formatDate(c.date)}</td>
                  <td className="p-4 text-on-surface-variant whitespace-nowrap">{STATUS_LABEL[c.currentStatus]} → {STATUS_LABEL[c.requestedStatus]}</td>
                  <td className="p-4 text-on-surface-variant">{c.requestedBy}</td>
                  <td className="p-4">
                    <StatusBadge label={c.status[0].toUpperCase() + c.status.slice(1)} tone={REVIEW_TONE[c.status]} />
                  </td>
                  <td className="p-4 pr-lg text-right">
                    {c.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Approve" onClick={() => handleApprove(c.id)}>
                          <Check size={18} />
                        </button>
                        <button className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded transition-colors" title="Reject" onClick={() => handleReject(c.id)}>
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-label-sm text-on-surface-variant">by {c.reviewedBy}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scoped.length === 0 && <EmptyState icon="history" title="No correction requests" description="Teacher-submitted attendance corrections will appear here for review." />}
        </div>
      </div>
    </div>
  );
}
