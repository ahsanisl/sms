"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteUnpaidLeaveAction, recordUnpaidLeaveAction, setTaxSlabsAction } from "@/app/(app)/payroll/actions";
import { PAKISTAN_SALARIED_SLABS_2026, yearlyIncomeTax, type TaxSlab } from "@/lib/finance";
import { countWorkingDaysLabel } from "@/app/(app)/payroll/working-days";
import { formatDate, formatPKR } from "@/lib/format";
import { todayIso } from "@/lib/dates";

export interface UnpaidLeaveRow {
  id: string;
  profileId: string;
  name: string;
  startDate: string;
  endDate: string;
  note: string;
}

/** Salaries → "Tax & Unpaid Leave" tab. */
export function TaxAndLeave({
  slabs,
  leave,
  staff,
  canManage,
}: {
  slabs: TaxSlab[] | null;
  leave: UnpaidLeaveRow[];
  staff: { id: string; name: string; isTeacher: boolean }[];
  canManage: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <TaxSlabsCard slabs={slabs} canManage={canManage} />
      <UnpaidLeaveCard leave={leave} staff={staff} canManage={canManage} />
    </div>
  );
}

function TaxSlabsCard({ slabs, canManage }: { slabs: TaxSlab[] | null; canManage: boolean }) {
  const router = useLoadingRouter();
  const [rows, setRows] = useState<{ from: string; ratePercent: string }[]>((slabs ?? []).map((s) => ({ from: String(s.from), ratePercent: String(s.ratePercent) })));
  const [isPending, startTransition] = useTransition();
  const parsed: TaxSlab[] = rows.map((r) => ({ from: Number(r.from || 0), ratePercent: Number(r.ratePercent || 0) }));
  const exampleMonthly = 150_000;

  function save(next: TaxSlab[]) {
    startTransition(async () => {
      const result = await setTaxSlabsAction(next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(next.length ? "Tax brackets saved. They apply to payrolls you create from now on." : "Automatic income tax turned off.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader
        title="Income tax brackets"
        description="Used for staff with “Withhold income tax” switched on. Each rate applies to yearly salary above its starting amount. Monthly tax = yearly tax on (basic + allowances) × 12, ÷ 12."
      />
      <CardContent className="space-y-3 pt-md">
        {rows.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low px-3 py-2 text-body-md text-on-surface-variant">No brackets set, so payroll doesn&apos;t calculate income tax. You can still enter tax as a fixed deduction on each salary.</p>
        ) : (
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="text-label-md uppercase tracking-wide text-on-surface-variant">
                <th scope="col" className="pb-1 font-semibold">Yearly income from (Rs.)</th>
                <th scope="col" className="pb-1 font-semibold">Rate %</th>
                <th scope="col" className="pb-1"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <Input aria-label={`Bracket ${i + 1} starts at`} inputMode="numeric" value={row.from} disabled={!canManage} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, from: e.target.value.replace(/[^\d]/g, "") } : r)))} />
                  </td>
                  <td className="w-28 py-1 pr-2">
                    <Input aria-label={`Bracket ${i + 1} rate`} inputMode="decimal" value={row.ratePercent} disabled={!canManage} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ratePercent: e.target.value.replace(/[^\d.]/g, "") } : r)))} />
                  </td>
                  <td className="w-10 py-1 text-right">
                    {canManage && (
                      <button type="button" className="rounded p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error" aria-label={`Remove bracket ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length > 0 && (
          <p className="text-label-md text-on-surface-variant">
            Example: a salary of {formatPKR(exampleMonthly)} a month → {formatPKR(Math.round(yearlyIncomeTax(exampleMonthly * 12, parsed) / 12))} tax a month.
          </p>
        )}
        {canManage && (
          <div className="flex flex-wrap gap-2 border-t border-outline-variant/40 pt-3">
            <Button size="sm" variant="ghost" onClick={() => setRows([...rows, { from: "", ratePercent: "" }])}>
              <Plus /> Add bracket
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRows(PAKISTAN_SALARIED_SLABS_2026.map((s) => ({ from: String(s.from), ratePercent: String(s.ratePercent) })))}>
              Use Pakistan 2025–26 salaried rates
            </Button>
            <span className="flex-1" />
            {slabs?.length ? (
              <Button size="sm" variant="secondary" disabled={isPending} onClick={() => save([])}>
                Turn off
              </Button>
            ) : null}
            <Button size="sm" disabled={isPending || rows.length === 0} onClick={() => save(parsed)}>
              {isPending ? "Saving…" : "Save Brackets"}
            </Button>
          </div>
        )}
        <p className="text-label-sm text-on-surface-variant">The Pakistan preset follows the 2025–26 budget for salaried people (surcharge on incomes over Rs. 10 million not included). Rates change with each budget — check them with your accountant or FBR.</p>
      </CardContent>
    </Card>
  );
}

function UnpaidLeaveCard({ leave, staff, canManage }: { leave: UnpaidLeaveRow[]; staff: { id: string; name: string; isTeacher: boolean }[]; canManage: boolean }) {
  const router = useLoadingRouter();
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      after?.();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader
        title="Unpaid leave"
        description="Days deducted from the payroll for that month. Teachers' approved “Unpaid Leave” requests are counted automatically; record other staff here."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setOpen(true)} disabled={staff.length === 0}>
              <Plus /> Record
            </Button>
          ) : undefined
        }
      />
      <CardContent className="pt-md">
        {leave.length === 0 ? (
          <EmptyState compact icon="event_busy" title="No unpaid leave recorded" />
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {leave.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-on-surface">{l.name}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {formatDate(l.startDate)}
                    {l.endDate !== l.startDate ? ` – ${formatDate(l.endDate)}` : ""} · {countWorkingDaysLabel(l.startDate, l.endDate)}
                    {l.note ? ` · ${l.note}` : ""}
                  </p>
                </div>
                {canManage && (
                  <button type="button" disabled={isPending} className="rounded p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error" aria-label={`Remove ${l.name}'s unpaid leave`} onClick={() => run(() => deleteUnpaidLeaveAction(l.id), "Unpaid leave removed.")}>
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-label-sm text-on-surface-variant">Recorded after a payroll was created? Adjust that person&apos;s unpaid days on the draft payroll.</p>
      </CardContent>

      <Modal open={open} onOpenChange={setOpen} title="Record Unpaid Leave" className="max-w-[28rem]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!profileId) return toast.error("Choose who was on leave.");
            run(() => recordUnpaidLeaveAction({ profileId, startDate, endDate, note }), "Unpaid leave recorded.", () => {
              setOpen(false);
              setNote("");
            });
          }}
        >
          <FormField label="Staff member" htmlFor="leave-profile" required>
            <Select id="leave-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)} className="w-full">
              <option value="">Choose…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isTeacher ? " (teacher)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First day" htmlFor="leave-start" required>
              <Input id="leave-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="Last day" htmlFor="leave-end" required>
              <Input id="leave-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Note (optional)" htmlFor="leave-note">
            <Input id="leave-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Absent without leave" />
          </FormField>
          <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
