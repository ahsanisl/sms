"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileStack } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { generateInvoicesAction } from "@/app/(app)/fees/generate/actions";
import { formatPKR } from "@/lib/format";
import type { Campus, ClassSection, FeeStructureItem, Student } from "@/lib/types";

export function GenerateInvoicesClient({
  students,
  classes,
  campuses,
  structureItems,
  existingInvoiceMonthsByStudent,
  defaultCampusId,
  isAllCampuses,
}: {
  students: Student[];
  classes: ClassSection[];
  campuses: Campus[];
  structureItems: FeeStructureItem[];
  existingInvoiceMonthsByStudent: Map<string, Set<string>>;
  defaultCampusId?: string;
  isAllCampuses: boolean;
}) {
  const router = useRouter();
  const classById = new Map(classes.map((c) => [c.id, c]));
  const campusById = new Map(campuses.map((c) => [c.id, c]));

  const today = new Date();
  const defaultLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const [monthLabel, setMonthLabel] = useState(defaultLabel);
  const [issueDate, setIssueDate] = useState(today.toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(today.getTime() + 9 * 86400000).toISOString().slice(0, 10));
  const [campusFilter, setCampusFilter] = useState(defaultCampusId ?? "");
  const [generating, setGenerating] = useState(false);

  const scopedStudents = students.filter((s) => s.status === "active" && (campusFilter ? s.campusId === campusFilter : true));

  const preview = useMemo(() => {
    const rows: { studentId: string; name: string; classId: string; campusId: string; items: { name: string; amount: number }[]; total: number }[] = [];
    let alreadyInvoicedCount = 0;
    let noStructureCount = 0;

    for (const s of scopedStudents) {
      if (existingInvoiceMonthsByStudent.get(s.id)?.has(monthLabel)) {
        alreadyInvoicedCount++;
        continue;
      }
      const items = structureItems
        .filter((f) => f.campusId === s.campusId && f.classId === s.classId && f.frequency === "monthly")
        .map((f) => ({ name: f.name, amount: f.amount }));
      if (items.length === 0) {
        noStructureCount++;
        continue;
      }
      rows.push({ studentId: s.id, name: s.name, classId: s.classId, campusId: s.campusId, items, total: items.reduce((sum, i) => sum + i.amount, 0) });
    }

    return { rows, alreadyInvoicedCount, noStructureCount };
  }, [scopedStudents, structureItems, existingInvoiceMonthsByStudent, monthLabel]);

  async function handleGenerate() {
    if (!monthLabel.trim()) {
      toast.error("Give this invoice run a month label, e.g. September 2026.");
      return;
    }
    if (preview.rows.length === 0) {
      toast.error("Nothing to generate — every eligible student already has an invoice for this month, or has no monthly fee structure configured.");
      return;
    }
    setGenerating(true);
    const result = await generateInvoicesAction({ monthLabel, issueDate, dueDate, campusId: campusFilter || undefined });
    setGenerating(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.count} invoice${result.count === 1 ? "" : "s"} generated for ${monthLabel}.`);
    router.push("/fees/reports");
  }

  return (
    <div>
      <PageHeader
        title="Generate Invoices"
        description="Bulk-create this month's invoices for every active student, from their class's monthly fee structure."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Will Generate" value={String(preview.rows.length)} icon="receipt_long" />
        <StatCard label="Already Invoiced" value={String(preview.alreadyInvoicedCount)} icon="task_alt" />
        <StatCard label="No Fee Structure" value={String(preview.noStructureCount)} icon="warning" />
        <StatCard label="Total Value" value={formatPKR(preview.rows.reduce((s, r) => s + r.total, 0))} icon="payments" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
          <h3 className="text-title-lg font-semibold text-on-surface">Run Details</h3>
          <FormField label="Month Label" htmlFor="monthLabel" required>
            <Input id="monthLabel" value={monthLabel} onChange={(e) => setMonthLabel(e.target.value)} placeholder="e.g., September 2026" />
          </FormField>
          <FormField label="Issue Date" htmlFor="issueDate">
            <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </FormField>
          <FormField label="Due Date" htmlFor="dueDate">
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
          {isAllCampuses && (
            <FormField label="Campus" htmlFor="campusFilter">
              <Select id="campusFilter" value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="w-full">
                <option value="">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          <div className="pt-4 border-t border-outline-variant/40">
            <Button className="w-full" onClick={handleGenerate} disabled={preview.rows.length === 0 || generating}>
              <FileStack size={16} /> {generating ? "Generating…" : `Generate ${preview.rows.length} Invoice${preview.rows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-lg border-b border-outline-variant/40">
            <p className="text-title-lg font-semibold text-primary">Preview</p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              Students already invoiced for {monthLabel || "this month"}, or with no monthly fee items configured, are skipped automatically.
            </p>
          </div>
          <div className="divide-y divide-outline-variant/20 max-h-[520px] overflow-y-auto">
            {preview.rows.map((row) => (
              <div key={row.studentId} className="flex items-center justify-between px-lg py-3">
                <div>
                  <p className="text-body-md font-medium text-on-surface">{row.name}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {classById.get(row.classId) ? `${classById.get(row.classId)!.grade}-${classById.get(row.classId)!.section}` : "—"} · {campusById.get(row.campusId)?.name ?? "—"} · {row.items.map((i) => i.name).join(", ")}
                  </p>
                </div>
                <span className="text-body-md font-semibold text-on-surface">{formatPKR(row.total)}</span>
              </div>
            ))}
            {preview.rows.length === 0 && (
              <EmptyState icon="receipt_long" title="Nothing to generate" description="Every eligible student already has an invoice for this month, or their class has no monthly fee structure." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
