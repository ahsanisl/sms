"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/shared/avatar";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { markAttendanceAction } from "@/app/(app)/attendance/mark/actions";
import type { AttendanceStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string; dot: string }[] = [
  { value: "present", label: "Present", activeClass: "peer-checked:bg-success peer-checked:text-on-success peer-checked:border-success", dot: "bg-success" },
  { value: "absent", label: "Absent", activeClass: "peer-checked:bg-error peer-checked:text-on-error peer-checked:border-error", dot: "bg-error" },
  { value: "leave", label: "Leave", activeClass: "peer-checked:bg-outline peer-checked:text-on-primary peer-checked:border-outline", dot: "bg-outline" },
  { value: "late", label: "Late", activeClass: "peer-checked:bg-warning peer-checked:text-on-warning peer-checked:border-warning", dot: "bg-warning" },
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
  const router = useLoadingRouter();
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

  const alreadyRecorded = Object.keys(initialStatuses).length > 0;
  const changedCount = roster.filter((s) => statusFor(s.id) !== (initialStatuses[s.id] ?? "present")).length;

  return (
    <div>
      <PageHeader title="Mark Attendance" description="Record daily attendance for a class. Everyone starts as Present — just mark the exceptions." backHref="/attendance" backLabel="Attendance" />

      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest card-shadow">
        <div className="flex flex-col justify-between gap-4 border-b border-outline-variant/50 p-lg lg:flex-row lg:items-end">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-col gap-1.5">
              <span className="text-label-md font-medium text-on-surface">Class</span>
              <Select value={classId} onChange={(e) => changeClass(e.target.value)} className="h-10 min-w-[12rem]">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-label-md font-medium text-on-surface">Date</span>
              <Input type="date" value={localDate} onChange={(e) => changeDate(e.target.value)} className="h-10 sm:max-w-[180px]" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <span key={opt.value} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/70 px-3 py-1 text-label-md text-on-surface">
                <span aria-hidden className={`h-2 w-2 rounded-full ${opt.dot}`} />
                <span className="font-semibold tabular-nums">{counts[opt.value]}</span> {opt.label}
              </span>
            ))}
            <Button variant="secondary" size="sm" onClick={markAllPresent} disabled={roster.length === 0}>
              Mark All Present
            </Button>
          </div>
        </div>

        {alreadyRecorded && (
          <div role="status" className="flex items-center gap-2 border-b border-outline-variant/50 bg-warning-container/50 px-lg py-2.5 text-label-md text-on-warning-container">
            <Icon name="info" className="h-4 w-4 shrink-0" aria-hidden />
            Attendance has already been recorded for this class on this date — saving will update it.
          </div>
        )}

        {roster.length === 0 ? (
          <EmptyState icon="group" title="No active students in this class" description="Add or transfer students into this class to start recording attendance." compact />
        ) : (
          <ul className="divide-y divide-outline-variant/30">
            {roster.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-lg py-3 transition-colors hover:bg-surface-container-low/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} />
                  <div className="flex flex-col">
                    <span className="text-body-md font-medium text-on-surface">{s.name}</span>
                    <span className="text-label-sm text-on-surface-variant">Roll {s.rollNumber}</span>
                  </div>
                </div>
                <fieldset className="flex flex-wrap gap-1.5">
                  <legend className="sr-only">Attendance for {s.name}</legend>
                  {STATUS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`status_${s.id}`}
                        value={opt.value}
                        checked={statusFor(s.id) === opt.value}
                        onChange={() => setStatus(s.id, opt.value)}
                        className="peer sr-only"
                      />
                      <span
                        className={`inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-lg border border-outline-variant px-3 text-label-md font-semibold text-on-surface-variant transition-colors hover:border-outline hover:bg-surface-container-low peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-1 ${opt.activeClass}`}
                      >
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ul>
        )}

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 rounded-b-xl border-t border-outline-variant/50 bg-surface-container-lowest/95 p-md backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-lg">
          <p className="text-label-md text-on-surface-variant" aria-live="polite">
            {roster.length} student{roster.length === 1 ? "" : "s"}
            {changedCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-secondary">
                  {changedCount} change{changedCount === 1 ? "" : "s"}
                </span>{" "}
                {alreadyRecorded ? "from saved record" : "from all-present"}
              </>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/attendance")} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={roster.length === 0 || saving} className="flex-1 sm:flex-none">
              {saving ? <Loader2 className="motion-safe:animate-spin" /> : <Icon name="check" />}
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
