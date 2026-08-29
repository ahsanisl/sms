"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Textarea } from "@/components/ui/textarea";
import { LeaveRequestForm, type LeaveRequestFormValues } from "@/components/leave/leave-request-form";
import { useLeaveStore, useTeachers } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { formatDate } from "@/lib/format";
import type { LeaveRequest, LeaveType } from "@/lib/types";

const TYPE_LABEL: Record<LeaveType, string> = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  other: "Other",
};

const STATUS_TONE = { pending: "warning", approved: "success", rejected: "error" } as const;

export default function LeavePage() {
  const { user } = useSession();
  const { leaveRequests, addLeaveRequest, reviewLeaveRequest } = useLeaveStore();
  const { teachers } = useTeachers();
  const { scopedCampusId, isAllCampuses } = useCampusScope();
  const [requestOpen, setRequestOpen] = useState(false);
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const isTeacher = user?.role === "teacher";

  function handleRequest(values: LeaveRequestFormValues) {
    if (!user) return;
    addLeaveRequest({ teacherId: user.id, ...values });
    toast.success("Leave request submitted for approval.");
    setRequestOpen(false);
  }

  function handleApprove(request: LeaveRequest) {
    reviewLeaveRequest({ id: request.id, status: "approved", reviewedBy: user?.name ?? "Admin" });
    toast.success("Leave request approved.");
  }

  function handleReject() {
    if (!rejecting) return;
    reviewLeaveRequest({ id: rejecting.id, status: "rejected", reviewedBy: user?.name ?? "Admin", reviewNote: rejectNote });
    toast.success("Leave request rejected.");
    setRejecting(null);
    setRejectNote("");
  }

  if (isTeacher) {
    const mine = leaveRequests.filter((r) => r.teacherId === user!.id);
    const pending = mine.filter((r) => r.status === "pending").length;
    const approved = mine.filter((r) => r.status === "approved").length;

    return (
      <div>
        <PageHeader
          title="Leave"
          description="Request leave and track approval status."
          actions={
            <Button size="sm" onClick={() => setRequestOpen(true)}>
              <Plus size={16} /> Request Leave
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Requests" value={String(mine.length)} icon="event_busy" />
          <StatCard label="Pending" value={String(pending)} icon="pending_actions" />
          <StatCard label="Approved" value={String(approved)} icon="task_alt" />
        </div>

        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
          <div className="p-lg border-b border-outline-variant/40">
            <h3 className="text-title-lg font-semibold text-primary">My Leave Requests</h3>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {mine.map((r) => (
              <div key={r.id} className="px-lg py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{TYPE_LABEL[r.type]}</p>
                    <p className="text-label-sm text-on-surface-variant">{formatDate(r.startDate)} – {formatDate(r.endDate)}</p>
                  </div>
                  <StatusBadge label={r.status[0].toUpperCase() + r.status.slice(1)} tone={STATUS_TONE[r.status]} />
                </div>
                <p className="text-body-md text-on-surface-variant mt-2">{r.reason}</p>
                {r.status !== "pending" && r.reviewNote && (
                  <p className="text-label-sm text-on-surface-variant mt-1 italic">Reviewer note: {r.reviewNote}</p>
                )}
              </div>
            ))}
            {mine.length === 0 && <EmptyState icon="event_busy" title="No leave requests yet" description="Requests you submit will show up here." />}
          </div>
        </div>

        <Modal open={requestOpen} onOpenChange={setRequestOpen} title="Request Leave" className="max-w-[32rem]">
          <LeaveRequestForm onSubmit={handleRequest} onCancel={() => setRequestOpen(false)} />
        </Modal>
      </div>
    );
  }

  // Admin / Campus Admin / School Owner: an approval queue, scoped to campus like everything else.
  const scopedTeacherIds = new Set((scopedCampusId ? teachers.filter((t) => t.campusId === scopedCampusId) : teachers).map((t) => t.id));
  const scopedRequests = leaveRequests.filter((r) => scopedTeacherIds.has(r.teacherId));
  const pendingCount = scopedRequests.filter((r) => r.status === "pending").length;

  function teacherName(teacherId: string) {
    return teachers.find((t) => t.id === teacherId)?.name ?? "Unknown Teacher";
  }

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        description={isAllCampuses ? "Review and approve staff leave requests across all campuses." : "Review and approve staff leave requests for this campus."}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Requests" value={String(scopedRequests.length)} icon="event_busy" />
        <StatCard label="Pending Review" value={String(pendingCount)} icon="pending_actions" />
        <StatCard label="Approved" value={String(scopedRequests.filter((r) => r.status === "approved").length)} icon="task_alt" />
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
        <div className="p-lg border-b border-outline-variant/40">
          <h3 className="text-title-lg font-semibold text-primary">Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-4 pl-lg font-semibold text-label-sm text-on-surface-variant uppercase">Teacher</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Type</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Dates</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Reason</th>
                <th className="p-4 font-semibold text-label-sm text-on-surface-variant uppercase">Status</th>
                <th className="p-4 pr-lg font-semibold text-label-sm text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {scopedRequests.map((r) => (
                <tr key={r.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-4 pl-lg font-medium text-on-surface">{teacherName(r.teacherId)}</td>
                  <td className="p-4 text-on-surface-variant">{TYPE_LABEL[r.type]}</td>
                  <td className="p-4 text-on-surface-variant whitespace-nowrap">{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                  <td className="p-4 text-on-surface-variant max-w-xs truncate" title={r.reason}>{r.reason}</td>
                  <td className="p-4">
                    <StatusBadge label={r.status[0].toUpperCase() + r.status.slice(1)} tone={STATUS_TONE[r.status]} />
                  </td>
                  <td className="p-4 pr-lg text-right">
                    {r.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Approve" onClick={() => handleApprove(r)}>
                          <Check size={18} />
                        </button>
                        <button className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded transition-colors" title="Reject" onClick={() => setRejecting(r)}>
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-label-sm text-on-surface-variant">by {r.reviewedBy}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scopedRequests.length === 0 && <EmptyState icon="event_busy" title="No leave requests" description="Staff leave requests will appear here for review." />}
        </div>
      </div>

      <Modal
        open={!!rejecting}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectNote("");
          }
        }}
        title="Reject Leave Request"
        className="max-w-[28rem]"
      >
        <div className="space-y-4">
          <FormField label="Note to the teacher (optional)" htmlFor="rejectNote">
            <Textarea id="rejectNote" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g., Please resubmit with more notice next time" />
          </FormField>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
            <Button variant="secondary" onClick={() => { setRejecting(null); setRejectNote(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
