"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { promoteStudentsAction } from "@/app/(app)/students/promote/actions";

interface ClassOption {
  id: string;
  label: string;
}

interface RosterStudent {
  id: string;
  name: string;
  rollNumber: string;
  attendanceRate: number;
}

export function PromoteClient({
  orderedClasses,
  classId,
  sourceClassLabel,
  targetOptions,
  suggestedTargetClassId,
  roster,
}: {
  orderedClasses: ClassOption[];
  classId: string;
  sourceClassLabel: string;
  targetOptions: ClassOption[];
  suggestedTargetClassId: string | "alumni";
  roster: RosterStudent[];
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"class" | "alumni">(suggestedTargetClassId === "alumni" ? "alumni" : "class");
  const [targetClassId, setTargetClassId] = useState(suggestedTargetClassId === "alumni" ? "" : suggestedTargetClassId);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  function toggleStudent(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const includedIds = roster.filter((s) => !excluded.has(s.id)).map((s) => s.id);

  async function handlePromote() {
    if (includedIds.length === 0) {
      toast.error("Select at least one student to promote.");
      return;
    }
    if (outcome === "class" && !targetClassId) {
      toast.error("Pick a target class.");
      return;
    }
    setSubmitting(true);
    const result = await promoteStudentsAction(
      { studentIds: includedIds, fromClassId: classId, date, toClassId: outcome === "class" ? targetClassId : undefined, toAlumni: outcome === "alumni" },
      includedIds.length,
    );
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      outcome === "alumni"
        ? `${result.count} student${result.count === 1 ? "" : "s"} graduated to Alumni.`
        : `${result.count} student${result.count === 1 ? "" : "s"} promoted.`,
    );
    router.push(`/classes/${classId}`);
  }

  if (orderedClasses.length === 0) {
    return <EmptyState icon="school" title="No classes to promote from" description="Add a class under Classes & Sections first." />;
  }

  return (
    <div>
      <PageHeader
        title="Promote Students"
        description="Move an entire class's roster up to the next grade at year-end, or graduate a final-year class to Alumni."
        actions={
          <Select value={classId} onChange={(e) => router.push(`/students/promote?classId=${e.target.value}`)}>
            {orderedClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
          <h3 className="text-title-lg font-semibold text-on-surface">Outcome</h3>
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${outcome === "class" ? "border-secondary bg-secondary/5" : "border-outline-variant"}`}>
            <input type="radio" name="outcome" checked={outcome === "class"} onChange={() => setOutcome("class")} className="mt-1 accent-secondary" />
            <span>
              <span className="block text-body-md font-medium text-on-surface">Promote to a class</span>
              <span className="block text-label-sm text-on-surface-variant">Move the roster up to the next grade.</span>
            </span>
          </label>
          {outcome === "class" && (
            <Select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} className="w-full ml-8">
              <option value="">Select target class…</option>
              {targetOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          )}
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${outcome === "alumni" ? "border-secondary bg-secondary/5" : "border-outline-variant"}`}>
            <input type="radio" name="outcome" checked={outcome === "alumni"} onChange={() => setOutcome("alumni")} className="mt-1 accent-secondary" />
            <span>
              <span className="block text-body-md font-medium text-on-surface flex items-center gap-1.5">
                <GraduationCap size={16} className="text-secondary" /> Graduate to Alumni
              </span>
              <span className="block text-label-sm text-on-surface-variant">For a final-year class completing school.</span>
            </span>
          </label>

          <div className="pt-2 border-t border-outline-variant/40">
            <label className="block text-label-md text-on-surface mb-1.5">Effective Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="pt-4 border-t border-outline-variant/40 flex items-center justify-between">
            <span className="text-body-md text-on-surface-variant">{includedIds.length} of {roster.length} selected</span>
          </div>
          <Button className="w-full" onClick={handlePromote} disabled={submitting}>
            {submitting ? "Working…" : `${outcome === "alumni" ? "Graduate" : "Promote"} ${includedIds.length} Student${includedIds.length === 1 ? "" : "s"}`}
            <ArrowRight size={16} />
          </Button>
        </div>

        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-lg border-b border-outline-variant/40 flex items-center justify-between">
            <div>
              <p className="text-title-lg font-semibold text-primary">{sourceClassLabel} Roster</p>
              <p className="text-label-sm text-on-surface-variant">Uncheck a student to keep them in this class (repeater).</p>
            </div>
            <button
              className="text-label-md text-secondary hover:underline"
              onClick={() => setExcluded((prev) => (prev.size === 0 ? new Set(roster.map((s) => s.id)) : new Set()))}
            >
              {excluded.size === 0 ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="divide-y divide-outline-variant/20 max-h-[520px] overflow-y-auto">
            {roster.map((s) => {
              const included = !excluded.has(s.id);
              return (
                <label key={s.id} className="flex items-center gap-4 px-lg py-3 cursor-pointer hover:bg-surface-bright transition-colors">
                  <Checkbox checked={included} onCheckedChange={() => toggleStudent(s.id)} />
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-on-surface">{s.name}</p>
                    <p className="text-label-sm text-on-surface-variant">Roll {s.rollNumber}</p>
                  </div>
                  <span className={`text-label-md font-medium ${s.attendanceRate >= 75 ? "text-emerald-600" : "text-error"}`}>{s.attendanceRate}% attendance</span>
                </label>
              );
            })}
            {roster.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No active students in this class.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
