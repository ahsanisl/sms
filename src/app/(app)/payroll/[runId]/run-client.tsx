"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCheck, Download, Lock, Printer, SlidersHorizontal, Trash2 } from "lucide-react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { adjustPayslipAction, deleteRunAction, finalizeRunAction, markPaidAction } from "@/app/(app)/payroll/actions";
import { runStatus } from "@/app/(app)/payroll/payroll-client";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/constants";
import { monthKeyLabel, payslipTotals, todayIso } from "@/lib/finance";
import { formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv-export";

export interface PayslipRow {
  id: string;
  name: string;
  designation: string;
  campusName: string;
  basicSalary: number;
  allowances: number;
  fixedDeductions: number;
  unpaidLeaveDays: number;
  leaveDeduction: number;
  bonus: number;
  otherDeduction: number;
  netPay: number;
  note: string;
  status: "unpaid" | "paid";
  paidDate?: string;
  method?: PaymentMethod;
  bankAccount: string;
}

interface RunClientProps {
  run: { id: string; month: string; status: "draft" | "finalized"; finalizedBy?: string; finalizedAt?: string };
  payslips: PayslipRow[];
  canManage: boolean;
}

export function RunClient({ run, payslips, canManage }: RunClientProps) {
  const router = useLoadingRouter();
  const [isPending, startTransition] = useTransition();
  const [adjusting, setAdjusting] = useState<PayslipRow | null>(null);
  const [confirm, setConfirm] = useState<"finalize" | "delete" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);

  const isDraft = run.status === "draft";
  const unpaid = payslips.filter((p) => p.status === "unpaid");
  const paidCount = payslips.length - unpaid.length;
  const totals = payslips.reduce(
    (acc, p) => {
      const t = payslipTotals(p);
      return { gross: acc.gross + t.gross, deductions: acc.deductions + t.deductions, net: acc.net + p.netPay };
    },
    { gross: 0, deductions: 0, net: 0 },
  );
  const status = runStatus({ status: run.status, paidCount, staffCount: payslips.length });
  const selectedUnpaid = unpaid.filter((p) => selected.has(p.id));

  function act(action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) {
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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    downloadCsv(
      `payroll-${run.month}.csv`,
      ["Name", "Designation", "Campus", "Bank account", "Basic", "Allowances", "Bonus", "Fixed deductions", "Unpaid leave days", "Leave deduction", "Other deductions", "Net pay", "Status", "Paid on"],
      payslips.map((p) => [p.name, p.designation, p.campusName, p.bankAccount, p.basicSalary, p.allowances, p.bonus, p.fixedDeductions, p.unpaidLeaveDays, p.leaveDeduction, p.otherDeduction, p.netPay, p.status === "paid" ? "Paid" : "Unpaid", p.paidDate ?? ""]),
    );
  }

  return (
    <div>
      <PageHeader
        title={`Payroll — ${monthKeyLabel(run.month)}`}
        description={
          isDraft
            ? "Draft: check unpaid leave, add bonuses or deductions, then finalize to lock the figures."
            : `Finalized${run.finalizedBy ? ` by ${run.finalizedBy}` : ""}${run.finalizedAt ? ` on ${formatDateTime(run.finalizedAt)}` : ""}. Mark salaries as paid as they go out.`
        }
        backHref="/payroll"
        backLabel="Salaries"
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              <Download /> Bank Sheet (CSV)
            </Button>
            {isDraft && canManage && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setConfirm("delete")} disabled={isPending}>
                  <Trash2 /> Delete Draft
                </Button>
                <Button size="sm" onClick={() => setConfirm("finalize")} disabled={isPending || payslips.length === 0}>
                  <Lock /> Finalize Payroll
                </Button>
              </>
            )}
            {!isDraft && unpaid.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  if (selectedUnpaid.length === 0) setSelected(new Set(unpaid.map((p) => p.id)));
                  setPayOpen(true);
                }}
                disabled={isPending}
              >
                <CheckCheck /> {selectedUnpaid.length ? `Mark ${selectedUnpaid.length} as Paid` : "Mark All as Paid"}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Status" value={status.label} icon={isDraft ? "edit_note" : "lock"} tone={status.tone === "success" ? "success" : status.tone === "warning" ? "warning" : "default"} />
        <StatCard label="Gross pay" value={formatPKR(totals.gross)} icon="payments" trend={{ direction: "flat", label: `${payslips.length} staff` }} />
        <StatCard label="Deductions" value={formatPKR(totals.deductions)} icon="money_off" trend={{ direction: "flat", label: `${payslips.reduce((s, p) => s + p.unpaidLeaveDays, 0)} unpaid leave days` }} />
        <StatCard label="Net to pay" value={formatPKR(totals.net)} icon="badge_dollar" tone="success" trend={!isDraft ? { direction: "flat", label: `${formatPKR(unpaid.reduce((s, p) => s + p.netPay, 0))} still to pay` } : undefined} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low/60 text-label-md uppercase tracking-wide text-on-surface-variant">
                {!isDraft && (
                  <th scope="col" className="w-10 px-3 py-2">
                    <Checkbox
                      aria-label="Select all unpaid"
                      checked={unpaid.length > 0 && selectedUnpaid.length === unpaid.length}
                      onCheckedChange={(v) => setSelected(v ? new Set(unpaid.map((p) => p.id)) : new Set())}
                      disabled={unpaid.length === 0}
                    />
                  </th>
                )}
                <th scope="col" className="px-3 py-2 font-semibold">Staff</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Basic + allowances</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Bonus</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Deductions</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Net pay</th>
                <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-body-md">
              {payslips.map((p) => {
                const t = payslipTotals(p);
                return (
                  <tr key={p.id} className="hover:bg-surface-container-low/50">
                    {!isDraft && (
                      <td className="px-3 py-2">
                        {p.status === "unpaid" && <Checkbox aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <p className="font-medium text-on-surface">{p.name}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        {p.designation || "—"} · {p.campusName}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPKR(p.basicSalary + p.allowances)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{p.bonus ? `+ ${formatPKR(p.bonus)}` : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                      {t.deductions ? `− ${formatPKR(t.deductions)}` : "—"}
                      {p.unpaidLeaveDays > 0 && <p className="text-label-sm text-warning">incl. {p.unpaidLeaveDays} unpaid leave day{p.unpaidLeaveDays === 1 ? "" : "s"}</p>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-on-surface">{formatPKR(p.netPay)}</td>
                    <td className="px-3 py-2">
                      {p.status === "paid" ? (
                        <span title={p.method ? PAYMENT_METHOD_LABEL[p.method] : undefined}>
                          <StatusBadge label={`Paid ${p.paidDate ? formatDate(p.paidDate) : ""}`.trim()} tone="success" />
                        </span>
                      ) : (
                        <StatusBadge label={isDraft ? "Draft" : "Unpaid"} tone={isDraft ? "neutral" : "warning"} />
                      )}
                      {p.note && <p className="mt-0.5 max-w-[14rem] truncate text-label-sm text-on-surface-variant" title={p.note}>{p.note}</p>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {isDraft && canManage && (
                          <button className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" title="Adjust" aria-label={`Adjust ${p.name}'s pay`} onClick={() => setAdjusting(p)}>
                            <SlidersHorizontal size={16} />
                          </button>
                        )}
                        <Link href={`/payroll/payslips/${p.id}`} className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" title="Payslip" aria-label={`${p.name}'s payslip`}>
                          <Printer size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant bg-surface-container-low/60 font-semibold">
                {!isDraft && <td />}
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPKR(payslips.reduce((s, p) => s + p.basicSalary + p.allowances, 0))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPKR(payslips.reduce((s, p) => s + p.bonus, 0))}</td>
                <td className="px-3 py-2 text-right tabular-nums">− {formatPKR(totals.deductions)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPKR(totals.net)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Modal open={!!adjusting} onOpenChange={(open) => !open && setAdjusting(null)} title={adjusting ? `Adjust — ${adjusting.name}` : "Adjust"} className="max-w-[32rem]">
        {adjusting && (
          <AdjustForm
            payslip={adjusting}
            submitting={isPending}
            onCancel={() => setAdjusting(null)}
            onSubmit={(values) => act(() => adjustPayslipAction(adjusting.id, values), `${adjusting.name}'s pay updated.`, () => setAdjusting(null))}
          />
        )}
      </Modal>

      <Modal open={payOpen} onOpenChange={setPayOpen} title="Mark Salaries as Paid" description={`${selectedUnpaid.length} staff · ${formatPKR(selectedUnpaid.reduce((s, p) => s + p.netPay, 0))}`} className="max-w-[28rem]">
        <MarkPaidForm
          submitting={isPending}
          onCancel={() => setPayOpen(false)}
          onSubmit={(values) =>
            act(() => markPaidAction(run.id, { ...values, payslipIds: selectedUnpaid.map((p) => p.id) }), `${selectedUnpaid.length} salar${selectedUnpaid.length === 1 ? "y" : "ies"} marked as paid.`, () => {
              setPayOpen(false);
              setSelected(new Set());
            })
          }
        />
      </Modal>

      <ConfirmDialog
        open={confirm === "finalize"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Finalize ${monthKeyLabel(run.month)} payroll?`}
        description={`${payslips.length} payslips totalling ${formatPKR(totals.net)}. After this the amounts can't be changed; you'll then mark salaries as paid.`}
        confirmLabel="Finalize"
        onConfirm={() => act(() => finalizeRunAction(run.id), "Payroll finalized.", () => setConfirm(null))}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this draft payroll?"
        description="All its payslips are removed. You can create it again from current salaries."
        confirmLabel="Delete Draft"
        destructive
        onConfirm={() => act(() => deleteRunAction(run.id), "Draft payroll deleted.", () => router.push("/payroll"))}
      />
    </div>
  );
}

function AdjustForm({
  payslip,
  submitting,
  onSubmit,
  onCancel,
}: {
  payslip: PayslipRow;
  submitting: boolean;
  onSubmit: (values: { unpaidLeaveDays: number; bonus: number; otherDeduction: number; note: string }) => void;
  onCancel: () => void;
}) {
  const [days, setDays] = useState(String(payslip.unpaidLeaveDays));
  const [bonus, setBonus] = useState(String(payslip.bonus));
  const [other, setOther] = useState(String(payslip.otherDeduction));
  const [note, setNote] = useState(payslip.note);
  const daysChanged = Number(days || 0) !== payslip.unpaidLeaveDays;
  // Leave deduction is recalculated on the server from the month's working days; show the current one until saved.
  const preview = payslipTotals({ ...payslip, bonus: Number(bonus || 0), otherDeduction: Number(other || 0) });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ unpaidLeaveDays: Number(days || 0), bonus: Number(bonus || 0), otherDeduction: Number(other || 0), note });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Unpaid leave days" htmlFor="adj-days" hint="From approved unpaid leave.">
          <Input id="adj-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, "").slice(0, 2))} />
        </FormField>
        <FormField label="Bonus (Rs.)" htmlFor="adj-bonus">
          <Input id="adj-bonus" inputMode="numeric" value={bonus} onChange={(e) => setBonus(e.target.value.replace(/[^\d]/g, ""))} />
        </FormField>
        <FormField label="Other deductions" htmlFor="adj-other" hint="Advance, fine…">
          <Input id="adj-other" inputMode="numeric" value={other} onChange={(e) => setOther(e.target.value.replace(/[^\d]/g, ""))} />
        </FormField>
      </div>
      <FormField label="Note on payslip (optional)" htmlFor="adj-note">
        <Input id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Eid bonus, salary advance recovered" />
      </FormField>
      <div className="rounded-lg bg-surface-container-low px-3 py-2 text-body-md">
        Net pay: <span className="font-semibold tabular-nums">{formatPKR(preview.net)}</span>
        {daysChanged && <span className="text-label-sm text-on-surface-variant"> · leave deduction is recalculated when you save</span>}
      </div>
      <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

function MarkPaidForm({ submitting, onSubmit, onCancel }: { submitting: boolean; onSubmit: (values: { paidDate: string; method: PaymentMethod; reference: string }) => void; onCancel: () => void }) {
  const [paidDate, setPaidDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ paidDate, method, reference });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Paid on" htmlFor="paid-date" required>
          <Input id="paid-date" type="date" value={paidDate} max={todayIso()} onChange={(e) => setPaidDate(e.target.value)} />
        </FormField>
        <FormField label="Paid by" htmlFor="paid-method" required>
          <Select id="paid-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full">
            {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Reference (optional)" htmlFor="paid-reference" hint="Bank batch or cheque number.">
        <Input id="paid-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
      </FormField>
      <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Mark as Paid"}</Button>
      </div>
    </form>
  );
}
