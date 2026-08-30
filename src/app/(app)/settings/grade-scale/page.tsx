"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGradeScale } from "@/lib/store/hooks";
import { GRADE_BAND_TEMPLATE } from "@/lib/mock/exams";
import type { GradeBand } from "@/lib/types";

type EditableBand = Omit<GradeBand, "schoolId">;

export default function GradeScalePage() {
  const { gradeScale, setGradeScale } = useGradeScale();
  const [bands, setBands] = useState<EditableBand[]>(gradeScale);

  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);

  function updateBand(id: string, patch: Partial<EditableBand>) {
    setBands((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addBand() {
    setBands((prev) => [...prev, { id: `gb-${Date.now()}`, grade: "", minPercentage: 0 }]);
  }

  function loadStandardScale() {
    setBands(GRADE_BAND_TEMPLATE.map((b, i) => ({ ...b, id: `gb-${Date.now()}-${i}` })));
  }

  function removeBand(id: string) {
    setBands((prev) => prev.filter((b) => b.id !== id));
  }

  function handleSave() {
    if (bands.some((b) => !b.grade.trim())) {
      toast.error("Every band needs a grade label.");
      return;
    }
    if (!bands.some((b) => b.minPercentage === 0)) {
      toast.error("One band must start at 0% so every score maps to a grade.");
      return;
    }
    const names = bands.map((b) => b.grade.trim());
    if (new Set(names).size !== names.length) {
      toast.error("Grade labels must be unique.");
      return;
    }
    setGradeScale(bands);
    toast.success("Grade scale saved — this updates every result card, student profile and parent portal view.");
  }

  return (
    <div>
      <PageHeader
        title="Grade Scale"
        description="Define the percentage boundaries each letter grade covers, used everywhere a mark is turned into a grade."
        actions={<Button onClick={handleSave}>Save Changes</Button>}
      />

      <div className="max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title-lg font-semibold text-on-surface">Bands</h3>
          <div className="flex items-center gap-2">
            {bands.length === 0 && (
              <Button size="sm" variant="secondary" onClick={loadStandardScale}>
                Load Standard Scale
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={addBand}>
              <Plus size={16} /> Add Band
            </Button>
          </div>
        </div>

        {bands.length === 0 && (
          <p className="text-body-md text-on-surface-variant mb-4">
            No grade bands yet — every score will show as &quot;F&quot; until at least one exists. Start from the standard A+–F scale or add your own.
          </p>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1 text-label-sm text-on-surface-variant uppercase tracking-wide">
            <span>Grade</span>
            <span>Minimum %</span>
            <span></span>
          </div>
          {bands.map((b) => (
            <div key={b.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
              <Input value={b.grade} onChange={(e) => updateBand(b.id, { grade: e.target.value })} placeholder="e.g., A+" maxLength={4} />
              <Input
                type="number"
                min={0}
                max={100}
                value={b.minPercentage}
                onChange={(e) => updateBand(b.id, { minPercentage: Number(e.target.value) })}
              />
              <button type="button" className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors" onClick={() => removeBand(b.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-outline-variant/40">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-2">Preview</p>
          <div className="flex flex-wrap gap-2">
            {sorted.map((b) => (
              <span key={b.id} className="px-3 py-1 rounded-full bg-surface-container text-label-md text-on-surface">
                {b.grade || "—"}: {b.minPercentage}%+
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
