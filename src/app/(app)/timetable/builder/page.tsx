"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Ban, Save, Send, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useClasses, useRooms, useTeachers, useTimetableConfig, useTimetableStore } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";
import { classLabel, GRADE_ORDER, subjectName } from "@/lib/mock/reference-data";
import type { TimetableDay, TimetableSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One in-progress grid cell — undefined subject/teacher/room means "free period". */
interface CellValue {
  subjectId: string;
  teacherId: string;
  roomId: string;
}

type Grid = Record<string, CellValue | undefined>;

function cellKey(day: TimetableDay, period: number) {
  return `${day}|${period}`;
}

function slotsToGrid(slots: TimetableSlot[]): Grid {
  const grid: Grid = {};
  for (const s of slots) {
    grid[cellKey(s.day, s.period)] = { subjectId: s.subjectId, teacherId: s.teacherId, roomId: s.roomId ?? "" };
  }
  return grid;
}

function BuilderContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { classes: allClasses } = useClasses();
  const { teachers } = useTeachers();
  const { rooms } = useRooms();
  const { workingDays, periods, breakAfterPeriod } = useTimetableConfig();
  const { timetable, statusForClass, draftForClass, saveDraft, discardDraft, publishDraft } = useTimetableStore();
  const { scopedCampusId } = useCampusScope();

  const activeClasses = allClasses.filter((c) => c.status === "active");
  const scopedClasses = scopedCampusId ? activeClasses.filter((c) => c.campusId === scopedCampusId) : activeClasses;
  const orderedClasses = GRADE_ORDER.flatMap((grade) => scopedClasses.filter((c) => c.grade === grade));

  const [classId, setClassId] = useState(params.get("classId") ?? orderedClasses[0]?.id ?? "");
  const cls = activeClasses.find((c) => c.id === classId);

  const [grid, setGrid] = useState<Grid>(() =>
    slotsToGrid(classId ? (draftForClass(classId) ?? timetable.filter((t) => t.classId === classId)) : []),
  );
  const [loadedClassId, setLoadedClassId] = useState(classId);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Re-seed the grid whenever the selected class actually changes (not on every render).
  if (classId !== loadedClassId) {
    setLoadedClassId(classId);
    setGrid(slotsToGrid(classId ? (draftForClass(classId) ?? timetable.filter((t) => t.classId === classId)) : []));
  }

  const status = classId ? statusForClass(classId) : "published";
  const hasDraft = classId ? !!draftForClass(classId) : false;

  // Every other class's currently-effective slots (its draft if it has one, else its published slots),
  // used to detect teacher/room double-booking against the grid being edited.
  const otherClassesEffectiveSlots = useMemo(() => {
    const result: TimetableSlot[] = [];
    for (const c of activeClasses) {
      if (c.id === classId) continue;
      const draft = draftForClass(c.id);
      result.push(...(draft ?? timetable.filter((t) => t.classId === c.id)));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClasses, timetable, classId]);

  function conflictFor(day: TimetableDay, period: number, cell: CellValue | undefined): string | null {
    if (!cell) return null;
    const teacherConflict = otherClassesEffectiveSlots.find((s) => s.day === day && s.period === period && s.teacherId === cell.teacherId);
    if (teacherConflict) return `Teacher already booked for ${classLabel(teacherConflict.classId)} at this time.`;
    if (cell.roomId) {
      const roomConflict = otherClassesEffectiveSlots.find((s) => s.day === day && s.period === period && s.roomId === cell.roomId);
      if (roomConflict) return `Room already in use by ${classLabel(roomConflict.classId)} at this time.`;
    }
    return null;
  }

  const conflicts = workingDays.flatMap((day) => periods.map((p) => conflictFor(day, p.period, grid[cellKey(day, p.period)]))).filter(Boolean) as string[];

  function updateCell(day: TimetableDay, period: number, patch: Partial<CellValue>) {
    setGrid((prev) => {
      const key = cellKey(day, period);
      const current = prev[key] ?? { subjectId: "", teacherId: "", roomId: "" };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  function clearCell(day: TimetableDay, period: number) {
    setGrid((prev) => {
      const next = { ...prev };
      delete next[cellKey(day, period)];
      return next;
    });
  }

  function gridToSlots(): TimetableSlot[] {
    const slots: TimetableSlot[] = [];
    for (const day of workingDays) {
      for (const p of periods) {
        const cell = grid[cellKey(day, p.period)];
        if (!cell || !cell.subjectId || !cell.teacherId) continue;
        slots.push({
          id: `${classId}-${day}-${p.period}`,
          classId,
          day,
          period: p.period,
          startTime: p.startTime,
          endTime: p.endTime,
          subjectId: cell.subjectId,
          teacherId: cell.teacherId,
          roomId: cell.roomId || undefined,
        });
      }
    }
    return slots;
  }

  function handleSaveDraft() {
    saveDraft(classId, gridToSlots());
    toast.success("Draft saved. It's only visible here until you publish.");
  }

  function handlePublish() {
    if (conflicts.length > 0) {
      toast.error(`Resolve ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} before publishing.`);
      return;
    }
    publishDraft(classId, gridToSlots());
    toast.success(`${cls ? classLabel(cls) : "Timetable"} published — visible to teachers and parents now.`);
    router.push(`/timetable?classId=${classId}`);
  }

  function handleDiscard() {
    discardDraft(classId);
    setGrid(slotsToGrid(timetable.filter((t) => t.classId === classId)));
    setDiscardOpen(false);
    toast.success("Draft discarded — reverted to the last published version.");
  }

  const teachersAtCampus = cls ? teachers.filter((t) => t.status === "active" && t.campusId === cls.campusId) : [];
  const roomsAtCampus = cls ? rooms.filter((r) => r.status === "active" && r.campusId === cls.campusId) : [];

  if (orderedClasses.length === 0) {
    return <EmptyState icon="event_busy" title="No classes to build a timetable for" description="Add a class under Classes & Sections first." />;
  }

  return (
    <div>
      <PageHeader
        title="Timetable Builder"
        description={cls ? `Assign subjects, teachers and rooms for ${classLabel(cls)}.` : "Select a class to begin."}
        actions={
          <div className="flex items-center gap-3">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {orderedClasses.map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => router.push(`/timetable?classId=${classId}`)}>
              View
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <StatusBadge label={status === "draft" ? "Draft" : "Published"} tone={status === "draft" ? "warning" : "success"} />
        {conflicts.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-label-md text-error">
            <AlertTriangle size={16} /> {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} — publishing is blocked until resolved
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hasDraft && (
            <Button variant="secondary" size="sm" onClick={() => setDiscardOpen(true)}>
              <Undo2 size={16} /> Discard Draft
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
            <Save size={16} /> Save Draft
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={conflicts.length > 0}>
            <Send size={16} /> Publish
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <div className="grid gap-px bg-outline-variant min-w-[900px]" style={{ gridTemplateColumns: `80px repeat(${workingDays.length}, minmax(0,1fr))` }}>
          <div className="bg-surface-container flex items-center justify-center border-b border-outline-variant p-3">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wide">Time</span>
          </div>
          {workingDays.map((day) => (
            <div key={day} className="bg-surface-container flex items-center justify-center p-3 border-b border-outline-variant">
              <span className="text-title-lg font-semibold text-on-surface">{day}</span>
            </div>
          ))}

          {periods.map((p) => (
            <RowCells
              key={p.period}
              period={p}
              isBreakAfter={p.period === breakAfterPeriod}
              workingDays={workingDays}
              grid={grid}
              cls={cls}
              teachersAtCampus={teachersAtCampus}
              roomsAtCampus={roomsAtCampus}
              conflictFor={conflictFor}
              updateCell={updateCell}
              clearCell={clearCell}
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard this draft?"
        description="All unpublished changes for this class will be lost and the last published timetable will be restored."
        confirmLabel="Discard Draft"
        onConfirm={handleDiscard}
      />
    </div>
  );
}

function RowCells({
  period,
  isBreakAfter,
  workingDays,
  grid,
  cls,
  teachersAtCampus,
  roomsAtCampus,
  conflictFor,
  updateCell,
  clearCell,
}: {
  period: { period: number; startTime: string; endTime: string };
  isBreakAfter: boolean;
  workingDays: TimetableDay[];
  grid: Grid;
  cls: { id: string; subjectIds: string[] } | undefined;
  teachersAtCampus: { id: string; name: string; subjectIds: string[] }[];
  roomsAtCampus: { id: string; name: string }[];
  conflictFor: (day: TimetableDay, period: number, cell: CellValue | undefined) => string | null;
  updateCell: (day: TimetableDay, period: number, patch: Partial<CellValue>) => void;
  clearCell: (day: TimetableDay, period: number) => void;
}) {
  return (
    <>
      <div className="bg-surface-bright flex flex-col items-center justify-start pt-4 gap-1">
        <span className="text-label-md text-on-surface-variant">{period.startTime}</span>
        {isBreakAfter && <span className="text-label-sm text-on-surface-variant/60">Break →</span>}
      </div>
      {workingDays.map((day) => {
        const key = cellKey(day, period.period);
        const cell = grid[key];
        const conflict = conflictFor(day, period.period, cell);
        const subjectOptions = cls?.subjectIds ?? [];
        const eligibleTeachers = cell?.subjectId ? teachersAtCampus.filter((t) => t.subjectIds.includes(cell.subjectId)) : teachersAtCampus;

        return (
          <div key={day} className={cn("bg-surface-bright p-2 min-h-[150px] flex flex-col gap-1 border-l-2", conflict ? "border-l-error bg-error-container/10" : "border-l-transparent")}>
            <Select
              value={cell?.subjectId ?? ""}
              onChange={(e) =>
                // Reset the teacher on a subject change — the previous teacher may not teach the new subject at all.
                e.target.value ? updateCell(day, period.period, { subjectId: e.target.value, teacherId: "" }) : clearCell(day, period.period)
              }
              className="w-full text-label-sm"
            >
              <option value="">— Free —</option>
              {subjectOptions.map((sid) => (
                <option key={sid} value={sid}>{subjectName(sid)}</option>
              ))}
            </Select>
            {cell?.subjectId && (
              <>
                <Select value={cell.teacherId} onChange={(e) => updateCell(day, period.period, { teacherId: e.target.value })} className="w-full text-label-sm">
                  <option value="">Select teacher…</option>
                  {eligibleTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Select value={cell.roomId} onChange={(e) => updateCell(day, period.period, { roomId: e.target.value })} className="w-full text-label-sm">
                  <option value="">No room</option>
                  {roomsAtCampus.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
                {conflict && (
                  <span className="flex items-center gap-1 text-[11px] leading-tight text-error mt-auto">
                    <Ban size={12} className="shrink-0" /> {conflict}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function TimetableBuilderPage() {
  return (
    <Suspense>
      <BuilderContent />
    </Suspense>
  );
}
