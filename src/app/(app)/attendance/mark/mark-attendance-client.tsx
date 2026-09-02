"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/shared/avatar";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { markAttendanceAction } from "@/app/(app)/attendance/mark/actions";
import type { AttendanceStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: "present", label: "Present", activeClass: "accent-secondary" },
  { value: "absent", label: "Absent", activeClass: "accent-error" },
  { value: "leave", label: "Leave", activeClass: "accent-outline" },
  { value: "late", label: "Late", activeClass: "accent-amber-500" },
];

interface ClassOption {
  id: string;
  label: string;
}

interface RosterStudent {
  id: string;
  name: string;
  rollNumber: string;
}

export function MarkAttendanceClient({
  classes,
  classId,
  classLabel,
  date,
  roster,
  initialStatuses,
}: {
  classes: ClassOption[];
  classId: string;
  classLabel: string;
  date: string;
  roster: RosterStudent[];
  initialStatuses: Record<string, AttendanceStatus>;
}) {
  const router = useRouter();
  const [localDate, setLocalDate] = useState(date);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(initialStatuses);
  const [saving, setSaving] = useState(false);

  function statusFor(studentId: string): AttendanceStatus {
    return statuses[studentId] ?? "present";
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    const next: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => (next[s.id] = "present"));
    setStatuses(next);
  }

  function changeClass(newClassId: string) {
    router.push(`/attendance/mark?classId=${newClassId}&date=${localDate}`);
  }

  function changeDate(newDate: string) {
    setLocalDate(newDate);
    router.push(`/attendance/mark?classId=${classId}&date=${newDate}`);
  }

  const counts = roster.reduce(
    (acc, s) => {
      acc[statusFor(s.id)]++;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, late: 0 } as Record<AttendanceStatus, number>,
  );

  async function handleSave() {
    setSaving(true);
    const result = await markAttendanceAction(
      roster.map((s) => ({ studentId: s.id, classId, date: localDate, status: statusFor(s.id) })),
    );
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Attendance saved for ${classLabel} on ${localDate}.`);
    router.push("/attendance");
  }

  return (
    <div>
      <PageHeader title="Mark Attendance" description="Record daily attendance for a class." />

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
        <div className="p-lg border-b border-outline-variant/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={classId} onChange={(e) => changeClass(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
            <Input type="date" value={localDate} onChange={(e) => changeDate(e.target.value)} className="max-w-[180px]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> {counts.present} Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error" /> {counts.absent} Absent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-outline" /> {counts.leave} Leave</span>
            </div>
            <Button variant="secondary" size="sm" onClick={markAllPresent}>
              Mark All Present
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-lg py-sm text-label-sm text-on-surface-variant font-semibold">Student</th>
                <th className="px-lg py-sm text-label-sm text-on-surface-variant font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {roster.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-lg py-sm">
                    <div className="flex items-center gap-sm">
                      <Avatar name={s.name} />
                      <div className="flex flex-col">
                        <span className="text-body-md font-medium text-on-surface">{s.name}</span>
                        <span className="text-label-sm text-on-surface-variant">Roll: {s.rollNumber}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-sm">
                    <div className="flex items-center gap-sm flex-wrap">
                      {STATUS_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-surface-dim transition-colors">
                          <input
                            type="radio"
                            name={`status_${s.id}`}
                            value={opt.value}
                            checked={statusFor(s.id) === opt.value}
                            onChange={() => setStatus(s.id, opt.value)}
                            className={`w-4 h-4 border-outline-variant ${opt.activeClass}`}
                          />
                          <span className="text-body-md text-on-surface">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-lg py-8 text-center text-body-md text-on-surface-variant">
                    No active students in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-lg border-t border-outline-variant/40 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => router.push("/attendance")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={roster.length === 0 || saving}>
            {saving ? "Saving…" : "Save Attendance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
