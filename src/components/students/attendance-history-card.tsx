"use client";

import { useState } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { RequestCorrectionForm, type RequestCorrectionValues } from "@/components/attendance/request-correction-form";
import { useAttendanceCorrections, usePermissions } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { attendanceForStudent, attendanceRate, SCHOOL_DAYS } from "@/lib/mock/attendance";
import { formatDate } from "@/lib/format";
import type { AttendanceRecord } from "@/lib/types";

/**
 * Module-level (not nested in another component) so its own `useState` for
 * the correction modal survives the parent's re-renders — a component
 * declared inside another component's body gets a fresh function identity
 * every render, which would silently reset any local state (or the modal's
 * open/closed state) on the next unrelated store update.
 */
export function AttendanceHistoryCard({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const { routePermissions } = usePermissions();
  const { addCorrection } = useAttendanceCorrections();
  const canRequestCorrection = !!user && !!routePermissions[user.role]?.attendanceMark;

  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);

  const records = attendanceForStudent(studentId).slice().reverse();

  function handleSubmit(values: RequestCorrectionValues) {
    if (!correcting || !user) return;
    addCorrection({
      studentId,
      classId: correcting.classId,
      date: correcting.date,
      currentStatus: correcting.status,
      requestedStatus: values.requestedStatus,
      reason: values.reason,
      requestedBy: user.name,
    });
    toast.success("Correction request submitted for approval.");
    setCorrecting(null);
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="p-lg flex items-center justify-between border-b border-outline-variant/40">
        <div>
          <p className="text-title-lg font-semibold text-primary">Attendance History</p>
          <p className="text-body-md text-on-surface-variant">Last {SCHOOL_DAYS.length} school days</p>
        </div>
        <p className="text-headline-md font-semibold text-emerald-600">{attendanceRate(attendanceForStudent(studentId))}%</p>
      </div>
      <div className="divide-y divide-outline-variant/20 max-h-96 overflow-y-auto">
        {records.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-lg py-3">
            <span className="text-body-md text-on-surface">{formatDate(r.date)}</span>
            <div className="flex items-center gap-3">
              <StatusBadge
                label={r.status[0].toUpperCase() + r.status.slice(1)}
                tone={r.status === "present" ? "success" : r.status === "late" ? "warning" : r.status === "leave" ? "info" : "error"}
              />
              {canRequestCorrection && (
                <button
                  className="text-label-sm text-secondary hover:underline flex items-center gap-1"
                  onClick={() => setCorrecting(r)}
                  title="Request Correction"
                >
                  <History size={14} /> Correct
                </button>
              )}
            </div>
          </div>
        ))}
        {records.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No attendance recorded yet.</p>}
      </div>

      <Modal open={!!correcting} onOpenChange={(open) => !open && setCorrecting(null)} title="Request Attendance Correction" className="max-w-[28rem]">
        {correcting && <RequestCorrectionForm currentStatus={correcting.status} onSubmit={handleSubmit} onCancel={() => setCorrecting(null)} />}
      </Modal>
    </div>
  );
}
