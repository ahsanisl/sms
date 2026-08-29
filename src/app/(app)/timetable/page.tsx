"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pencil, User, DoorOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTimetableStore, useClasses, useTimetableConfig, usePermissions } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useStudents } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";
import { SUBJECTS, classLabel, teacherName, roomName, GRADE_ORDER } from "@/lib/mock/reference-data";
import type { TimetableSlot } from "@/lib/types";

const SUBJECT_TONE: Record<string, string> = {};
SUBJECTS.forEach((s, i) => {
  SUBJECT_TONE[s.id] = ["border-l-secondary bg-secondary/5", "border-l-tertiary-container bg-tertiary-container/5", "border-l-emerald-500 bg-emerald-500/5", "border-l-amber-500 bg-amber-500/5"][i % 4];
});

function TimetableContent() {
  const params = useSearchParams();
  const { timetable, statusForClass } = useTimetableStore();
  const { workingDays, periods, breakAfterPeriod } = useTimetableConfig();
  const { user } = useSession();
  const { students } = useStudents();
  const { classes: allClasses } = useClasses();
  const { scopedCampusId } = useCampusScope();
  const { routePermissions } = usePermissions();
  const canBuild = !!user && !!routePermissions[user.role]?.timetableBuilder;

  const activeClasses = allClasses.filter((c) => c.status === "active");
  const scopedClasses = scopedCampusId ? activeClasses.filter((c) => c.campusId === scopedCampusId) : activeClasses;

  const defaultClassId =
    user?.role === "parent"
      ? students.find((s) => user.childStudentIds?.includes(s.id))?.classId
      : scopedClasses[0]?.id;

  const [classId, setClassId] = useState(params.get("classId") ?? defaultClassId ?? activeClasses[0]?.id ?? "");
  const cls = activeClasses.find((c) => c.id === classId);
  const status = classId ? statusForClass(classId) : "published";

  const slotsFor = (day: string, period: number) => timetable.find((t) => t.classId === classId && t.day === day && t.period === period);

  return (
    <div>
      <PageHeader
        title="Class Timetable"
        description={cls ? classLabel(cls) : ""}
        actions={
          <div className="flex items-center gap-3">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {GRADE_ORDER.flatMap((grade) => scopedClasses.filter((c) => c.grade === grade)).map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </Select>
            {canBuild && classId && (
              <Button asChild size="sm">
                <Link href={`/timetable/builder?classId=${classId}`}>
                  <Pencil size={16} /> Edit Timetable
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {canBuild && classId && (
        <div className="mb-4">
          <StatusBadge label={status === "draft" ? "Draft edits pending" : "Published"} tone={status === "draft" ? "warning" : "success"} />
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="grid bg-outline-variant gap-px overflow-x-auto" style={{ gridTemplateColumns: `80px repeat(${workingDays.length}, minmax(0,1fr))` }}>
          <div className="bg-surface-container flex items-center justify-center border-b border-outline-variant p-3">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wide">Time</span>
          </div>
          {workingDays.map((day) => (
            <div key={day} className="bg-surface-container flex items-center justify-center p-3 border-b border-outline-variant">
              <span className="text-title-lg font-semibold text-on-surface">{day}</span>
            </div>
          ))}

          {periods.map((p) => (
            <PeriodRow key={p.period} period={p} isBreakAfter={p.period === breakAfterPeriod} workingDays={workingDays} slotsFor={slotsFor} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodRow({
  period,
  isBreakAfter,
  workingDays,
  slotsFor,
}: {
  period: { period: number; startTime: string; endTime: string };
  isBreakAfter: boolean;
  workingDays: string[];
  slotsFor: (day: string, period: number) => TimetableSlot | undefined;
}) {
  return (
    <>
      <div className="bg-surface-bright flex flex-col items-center justify-start pt-4 gap-1">
        <span className="text-label-md text-on-surface-variant">{period.startTime}</span>
        {isBreakAfter && <span className="text-label-sm text-on-surface-variant/60">Break →</span>}
      </div>
      {workingDays.map((day) => {
        const slot = slotsFor(day, period.period);
        return (
          <div key={day} className="bg-surface-bright p-sm min-h-[110px]">
            {slot ? (
              <div className={`h-full rounded-lg p-3 flex flex-col gap-1 border-l-4 ${SUBJECT_TONE[slot.subjectId]}`}>
                <h4 className="text-title-lg font-semibold text-on-surface leading-tight">
                  {SUBJECTS.find((s) => s.id === slot.subjectId)?.name}
                </h4>
                <div className="flex items-center gap-1 text-on-surface-variant mt-auto">
                  <User size={14} />
                  <span className="text-body-md truncate">{teacherName(slot.teacherId)}</span>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <DoorOpen size={14} />
                  <span className="text-body-md truncate">{roomName(slot.roomId)}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-outline-variant text-label-sm">—</div>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function TimetablePage() {
  return (
    <Suspense>
      <TimetableContent />
    </Suspense>
  );
}
