"use client";

import { Printer } from "lucide-react";
import { BackLink } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/constants";
import { monthKeyLabel, payslipTotals } from "@/lib/finance";
import { formatDate, formatPKR } from "@/lib/format";

interface PayslipClientProps {
  school: { name: string; address: string; logoEmoji: string };
  month: string;
  runId: string;
  runStatus: "draft" | "finalized";
  campusName: string;
  bankAccount: string;
  payslip: {
    name: string;
    designation: string;
    basicSalary: number;
    allowances: number;
    bonus: number;
    fixedDeductions: number;
    unpaidLeaveDays: number;
    leaveDeduction: number;
    otherDeduction: number;
    incomeTax: number;
    netPay: number;
    note: string;
    status: "unpaid" | "paid";
    paidDate?: string;
    method?: PaymentMethod;
    reference?: string;
  };
}

function Line({ label, amount, sign }: { label: string; amount: number; sign?: "−" }) {
  if (!amount) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-on-surface-variant">{label}</span>
      <span className="tabular-nums">
        {sign ? `${sign} ` : ""}
        {formatPKR(amount)}
      </span>
    </div>
  );
}

export function PayslipClient({ school, month, runId, runStatus, campusName, bankAccount, payslip }: PayslipClientProps) {
  const totals = payslipTotals(payslip);
  const paidLabel = [
    `Paid${payslip.paidDate ? ` ${formatDate(payslip.paidDate)}` : ""}`,
    payslip.method ? PAYMENT_METHOD_LABEL[payslip.method] : "",
    payslip.reference ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[44rem]">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <BackLink href={`/payroll/${runId}`} label={`Payroll — ${monthKeyLabel(month)}`} className="mb-0" />
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      {runStatus === "draft" && (
        <p className="mb-3 rounded-lg bg-warning-container/60 px-3 py-2 text-label-md text-on-warning-container print:hidden">
          This payroll is still a draft, so these figures may change.
        </p>
      )}
      <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant pb-4">
          <div className="flex items-center gap-3">
            <span className="text-headline-md" aria-hidden>
              {school.logoEmoji}
            </span>
            <div>
              <p className="text-title-lg font-semibold text-primary">{school.name}</p>
              <p className="text-label-md text-on-surface-variant">{school.address}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Payslip</p>
            <p className="font-semibold text-primary">{monthKeyLabel(month)}</p>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-outline-variant py-4 text-body-md">
          <div>
            <dt className="text-label-sm text-on-surface-variant">Name</dt>
            <dd className="font-semibold text-on-surface">{payslip.name}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Designation</dt>
            <dd className="text-on-surface">{payslip.designation || "—"}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Campus</dt>
            <dd className="text-on-surface">{campusName || "Whole school"}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Bank account</dt>
            <dd className="text-on-surface">{bankAccount || "—"}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 gap-6 py-4 text-body-md sm:grid-cols-2 print:grid-cols-2">
          <section>
            <h2 className="mb-1 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Earnings</h2>
            <Line label="Basic salary" amount={payslip.basicSalary} />
            <Line label="Allowances" amount={payslip.allowances} />
            <Line label="Bonus" amount={payslip.bonus} />
            <div className="mt-1 flex justify-between border-t border-outline-variant pt-2 font-semibold">
              <span>Gross pay</span>
              <span className="tabular-nums">{formatPKR(totals.gross)}</span>
            </div>
          </section>
          <section>
            <h2 className="mb-1 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Deductions</h2>
            <Line label="Income tax" amount={payslip.incomeTax} sign="−" />
            <Line label="Fixed deductions" amount={payslip.fixedDeductions} sign="−" />
            <Line label={`Unpaid leave (${payslip.unpaidLeaveDays} day${payslip.unpaidLeaveDays === 1 ? "" : "s"})`} amount={payslip.leaveDeduction} sign="−" />
            <Line label="Other deductions" amount={payslip.otherDeduction} sign="−" />
            {totals.deductions === 0 && <p className="py-1.5 text-on-surface-variant">None</p>}
            <div className="mt-1 flex justify-between border-t border-outline-variant pt-2 font-semibold">
              <span>Total deductions</span>
              <span className="tabular-nums">− {formatPKR(totals.deductions)}</span>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
          <span className="font-semibold text-on-surface">Net pay</span>
          <span className="text-headline-sm font-bold tabular-nums text-primary">{formatPKR(payslip.netPay)}</span>
        </div>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-label-md text-on-surface-variant">
          <span>{payslip.note}</span>
          {payslip.status === "paid" ? <StatusBadge label={paidLabel} tone="success" /> : <StatusBadge label="Not yet paid" tone="warning" />}
        </footer>
      </article>
    </div>
  );
}
