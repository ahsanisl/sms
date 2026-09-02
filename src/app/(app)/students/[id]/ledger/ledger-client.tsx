"use client";

import { Printer } from "lucide-react";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatPKR } from "@/lib/format";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
};

interface LedgerRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
}

export function LedgerClient({
  studentName,
  classLabel,
  campusName,
  rollNumber,
  invoices,
  payments,
  reversals,
}: {
  studentName: string;
  classLabel: string;
  campusName: string;
  rollNumber: string;
  invoices: { id: string; invoiceNo: string; month: string; issueDate: string; totalAmount: number }[];
  payments: { id: string; date: string; amount: number; method: string; reference: string | null }[];
  reversals: { id: string; date: string; amount: number; reason: string }[];
}) {
  const rows: LedgerRow[] = [
    ...invoices.map((i) => ({ date: i.issueDate, description: `${i.month} Invoice — ${i.invoiceNo}`, debit: i.totalAmount, credit: 0 })),
    ...payments.map((p) => ({
      date: p.date,
      description: `Payment received — ${METHOD_LABEL[p.method] ?? p.method}${p.reference ? ` · Ref ${p.reference}` : ""}`,
      debit: 0,
      credit: p.amount,
    })),
    ...reversals.map((r) => ({ date: r.date, description: `Payment reversed — ${r.reason}`, debit: r.amount, credit: 0 })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const withBalance = rows.reduce<(LedgerRow & { balance: number })[]>((acc, r) => {
    const previousBalance = acc.length ? acc[acc.length - 1].balance : 0;
    acc.push({ ...r, balance: previousBalance + r.debit - r.credit });
    return acc;
  }, []);

  const totalCharged = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0) - reversals.reduce((s, r) => s + r.amount, 0);
  const balance = totalCharged - totalPaid;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <h2 className="text-headline-md font-semibold text-on-surface">Financial Statement</h2>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={18} /> Print
        </Button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-lg border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <Avatar name={studentName} size="lg" />
            <div>
              <h3 className="text-title-lg font-semibold text-on-surface">{studentName}</h3>
              <p className="text-body-md text-on-surface-variant">
                {classLabel} · {campusName} · Roll {rollNumber}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Charged</p>
              <p className="text-title-lg font-semibold text-on-surface">{formatPKR(totalCharged)}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Paid</p>
              <p className="text-title-lg font-semibold text-emerald-600">{formatPKR(totalPaid)}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Balance</p>
              <p className={`text-title-lg font-semibold ${balance > 0 ? "text-error" : "text-emerald-600"}`}>{formatPKR(balance)}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-title-lg font-semibold text-primary mb-4">Transaction History</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Charge</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Payment</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {withBalance.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-body-md text-on-surface-variant whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-body-md text-on-surface">{r.description}</td>
                  <td className="px-4 py-3 text-body-md text-error text-right">{r.debit ? formatPKR(r.debit) : "—"}</td>
                  <td className="px-4 py-3 text-body-md text-emerald-600 text-right">{r.credit ? formatPKR(r.credit) : "—"}</td>
                  <td className="px-4 py-3 text-body-md font-medium text-on-surface text-right">{formatPKR(r.balance)}</td>
                </tr>
              ))}
              {withBalance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-body-md text-on-surface-variant">No transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
