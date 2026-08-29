"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimetableConfig } from "@/lib/store/hooks";
import type { Period, TimetableDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_DAYS: { value: TimetableDay; label: string }[] = [
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
];

export default function TimetableSettingsPage() {
  const { workingDays, periods: savedPeriods, breakAfterPeriod: savedBreak, setWorkingDays, setPeriods } = useTimetableConfig();

  const [days, setDays] = useState<TimetableDay[]>(workingDays);
  const [periods, setLocalPeriods] = useState<Period[]>(savedPeriods);
  const [breakAfter, setBreakAfter] = useState<number>(savedBreak);

  function toggleDay(day: TimetableDay) {
    setDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      // keep canonical Mon–Fri order regardless of toggle order
      return ALL_DAYS.map((d) => d.value).filter((d) => next.includes(d));
    });
  }

  function updatePeriod(index: number, patch: Partial<Period>) {
    setLocalPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPeriod() {
    const last = periods[periods.length - 1];
    setLocalPeriods((prev) => [...prev, { period: prev.length + 1, startTime: last?.endTime ?? "08:00", endTime: "—" }]);
  }

  function removePeriod(index: number) {
    setLocalPeriods((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, period: i + 1 })));
    if (breakAfter === periods[index]?.period) setBreakAfter(0);
  }

  function handleSave() {
    if (days.length === 0) {
      toast.error("Select at least one working day.");
      return;
    }
    if (periods.some((p) => !p.startTime.trim() || !p.endTime.trim())) {
      toast.error("Every period needs a start and end time.");
      return;
    }
    setWorkingDays(days);
    setPeriods(periods, breakAfter);
    toast.success("Timetable settings saved. This affects the Timetable Builder and all timetable views.");
  }

  return (
    <div>
      <PageHeader
        title="Timetable Settings"
        description="Configure the working days and period schedule used across the school's timetables."
        actions={<Button onClick={handleSave}>Save Changes</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-title-lg font-semibold text-on-surface mb-1">Working Days</h3>
          <p className="text-label-sm text-on-surface-variant mb-4">Days the Timetable Builder grid will show as columns.</p>
          <div className="space-y-2">
            {ALL_DAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={days.includes(d.value)} onChange={() => toggleDay(d.value)} className="accent-secondary" />
                <span className="text-body-md text-on-surface">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-title-lg font-semibold text-on-surface">Periods</h3>
            <Button size="sm" variant="secondary" onClick={addPeriod}>
              <Plus size={16} /> Add Period
            </Button>
          </div>
          <p className="text-label-sm text-on-surface-variant mb-4">Each row is one teaching period. Pick which period is followed by the school&apos;s break.</p>
          <div className="space-y-2">
            {periods.map((p, i) => (
              <div key={i} className={cn("flex items-center gap-3 p-3 rounded-lg border", breakAfter === p.period ? "border-secondary bg-secondary/5" : "border-outline-variant")}>
                <span className="text-label-md text-on-surface-variant w-16">Period {p.period}</span>
                <Input type="time" value={p.startTime} onChange={(e) => updatePeriod(i, { startTime: e.target.value })} className="w-32" />
                <span className="text-on-surface-variant">–</span>
                <Input type="time" value={p.endTime === "—" ? "" : p.endTime} onChange={(e) => updatePeriod(i, { endTime: e.target.value })} className="w-32" />
                <label className="flex items-center gap-1.5 ml-auto text-label-sm text-on-surface-variant cursor-pointer">
                  <input type="radio" name="breakAfter" checked={breakAfter === p.period} onChange={() => setBreakAfter(p.period)} className="accent-secondary" />
                  Break after this period
                </label>
                <button type="button" className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors" onClick={() => removePeriod(i)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <label className="flex items-center gap-2 pt-1 text-label-sm text-on-surface-variant cursor-pointer">
              <input type="radio" name="breakAfter" checked={breakAfter === 0} onChange={() => setBreakAfter(0)} className="accent-secondary" />
              No break
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
