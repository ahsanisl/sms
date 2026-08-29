"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/shared/avatar";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAttendanceStore, useStudents } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { CLASSES, classLabel } from "@/lib/mock/reference-data";
import { SCHOOL_DAYS } from "@/lib/mock/attendance";
import type { AttendanceStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: "present", label: "Present", activeClass: "accent-secondary" },
  { value: "absent", label: "Absent", activeClass: "accent-error" },
  { value: "leave", label: "Leave", activeClass: "accent-outline" },
  { value: "late", label: "Late", activeClass: "accent-amber-500" },
];

function MarkAttendanceContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useSession();
  const { scopedCampusId } = useCampusScope();
  const { students } = useStudents();
  const { markAttendanceBulk } = useAttendanceStore();

  const scopedClasses = user?.role === "teacher"
    ? CLASSES.filter((c) => c.campusId === user.campusId)
    : scopedCampusId
      ? CLASSES.filter((c) => c.campusId === scopedCampusId)
      : CLASSES;

  const today = SCHOOL_DAYS[SCHOOL_DAYS.length - 1];
  const [classId, setClassId] = useState(params.get("classId") ?? scopedClasses[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  const roster = useMemo(() => students.filter((s) => s.classId === classId && s.status === "active"), [students, classId]);

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

  const counts = roster.reduce(
    (acc, s) => {
      acc[statusFor(s.id)]++;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, late: 0 } as Record<AttendanceStatus, number>,
  );

  function handleSave() {
    markAttendanceBulk(
      roster.map((s) => ({
        studentId: s.id,
        classId,
        date,
        status: statusFor(s.id),
        markedBy: user?.name ?? "Staff",
      })),
    );
    toast.success(`Attendance saved for ${classLabel(classId)} on ${date}.`);
    router.push("/attendance");
  }

  return (
    <div>
      <PageHeader title="Mark Attendance" description="Record daily attendance for a class." />

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
        <div className="p-lg border-b border-outline-variant/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {scopedClasses.map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[180px]" />
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
          <Button onClick={handleSave} disabled={roster.length === 0}>
            Save Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MarkAttendancePage() {
  return (
    <Suspense>
      <MarkAttendanceContent />
    </Suspense>
  );
}
