"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, User, DoorOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ClassSection, Period, Room, Subject, Teacher, TimetableDay } from "@/lib/types";

interface Slot {
  day: TimetableDay;
  period: number;
  subjectId: string;
  teacherId: string;
  roomId?: string;
}

const SUBJECT_TONE = ["border-l-secondary bg-secondary/5", "border-l-tertiary-container bg-tertiary-container/5", "border-l-emerald-500 bg-emerald-500/5", "border-l-amber-500 bg-amber-500/5"];

export function TimetableViewClient({
  classId,
  classes,
  teachers,
  rooms,
  subjects,
  workingDays,
  periods,
  breakAfterPeriod,
  status,
  slots,
  canBuild,
}: {
  classId: string;
  classes: ClassSection[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  workingDays: TimetableDay[];
  periods: Period[];
  breakAfterPeriod: number;
  status: "draft" | "published";
  slots: Slot[];
  canBuild: boolean;
}) {
  const router = useRouter();
  const cls = classes.find((c) => c.id === classId);
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const subjectIndexById = new Map(subjects.map((s, i) => [s.id, i]));

  const slotFor = (day: string, period: number) => slots.find((s) => s.day === day && s.period === period);

  return (
    <div>
      <PageHeader
        title="Class Timetable"
        description={cls ? `${cls.grade}-${cls.section}` : ""}
        actions={
          <div className="flex items-center gap-3">
            <Select value={classId} onChange={(e) => router.push(`/timetable?classId=${e.target.value}`)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
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
            <PeriodRow
              key={p.period}
              period={p}
              isBreakAfter={p.period === breakAfterPeriod}
              workingDays={workingDays}
              slotFor={slotFor}
              subjects={subjects}
              subjectIndexById={subjectIndexById}
              teacherById={teacherById}
              roomById={roomById}
            />
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
  slotFor,
  subjects,
  subjectIndexById,
  teacherById,
  roomById,
}: {
  period: { period: number; startTime: string; endTime: string };
  isBreakAfter: boolean;
  workingDays: TimetableDay[];
  slotFor: (day: string, period: number) => Slot | undefined;
  subjects: Subject[];
  subjectIndexById: Map<string, number>;
  teacherById: Map<string, Teacher>;
  roomById: Map<string, Room>;
}) {
  return (
    <>
      <div className="bg-surface-bright flex flex-col items-center justify-start pt-4 gap-1">
        <span className="text-label-md text-on-surface-variant">{period.startTime}</span>
        {isBreakAfter && <span className="text-label-sm text-on-surface-variant/60">Break →</span>}
      </div>
      {workingDays.map((day) => {
        const slot = slotFor(day, period.period);
        const tone = slot ? SUBJECT_TONE[(subjectIndexById.get(slot.subjectId) ?? 0) % SUBJECT_TONE.length] : "";
        return (
          <div key={day} className="bg-surface-bright p-sm min-h-[110px]">
            {slot ? (
              <div className={`h-full rounded-lg p-3 flex flex-col gap-1 border-l-4 ${tone}`}>
                <h4 className="text-title-lg font-semibold text-on-surface leading-tight">
                  {subjects.find((s) => s.id === slot.subjectId)?.name ?? "Subject"}
                </h4>
                <div className="flex items-center gap-1 text-on-surface-variant mt-auto">
                  <User size={14} />
                  <span className="text-body-md truncate">{teacherById.get(slot.teacherId)?.name ?? "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <DoorOpen size={14} />
                  <span className="text-body-md truncate">{slot.roomId ? (roomById.get(slot.roomId)?.name ?? "—") : "—"}</span>
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
