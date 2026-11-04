"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { monthKeyLabel, monthKeyShortLabel } from "@/lib/finance";
import { formatCompactNumber, formatCompactPKR, formatPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

type MonthCampus = { month: string; campusId: string | null; amount: number };

interface FinanceReport {
  months: string[];
  income: MonthCampus[];
  expenses: (MonthCampus & { categoryId: string })[];
  salaries: MonthCampus[];
  salariesOwed: { month: string; amount: number; count: number }[];
  includeSchoolWide: boolean;
  categories: { id: string; name: string }[];
  campuses: { id: string; name: string }[];
  links: { payroll: boolean };
}

const axisTick = { fontSize: 11, fill: "var(--color-on-surface-variant)" };
const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

function signedPKR(amount: number) {
  return amount < 0 ? `− ${formatPKR(-amount)}` : formatPKR(amount);
}

export function FinanceClient({ report, monthCount, ranges, scopeLabel }: { report: FinanceReport; monthCount: number; ranges: number[]; scopeLabel: string }) {
  const router = useLoadingRouter();
  const lastMonth = report.months[report.months.length - 1];
  const [selectedMonth, setSelectedMonth] = useState(lastMonth);

  const monthly = useMemo(() => {
    const rows = report.months.map((month) => {
      const income = sum(report.income.filter((r) => r.month === month));
      const expenses = sum(report.expenses.filter((r) => r.month === month));
      const salaries = sum(report.salaries.filter((r) => r.month === month));
      return { month, label: monthKeyShortLabel(month), income, expenses, salaries, net: income - expenses - salaries };
    });
    // Skip months before the school had any figures (e.g. before it started using EduFlow); always keep the current month.
    const first = rows.findIndex((m) => m.income || m.expenses || m.salaries);
    return first === -1 ? rows.slice(-1) : rows.slice(first);
  }, [report]);
  const isCurrentMonth = (month: string) => month === lastMonth;
  const selected = monthly.find((m) => m.month === selectedMonth) ?? monthly[monthly.length - 1];
  const previous = monthly[monthly.findIndex((m) => m.month === selected.month) - 1];
  const totals = monthly.reduce((acc, m) => ({ income: acc.income + m.income, expenses: acc.expenses + m.expenses, salaries: acc.salaries + m.salaries, net: acc.net + m.net }), { income: 0, expenses: 0, salaries: 0, net: 0 });
  const owed = report.salariesOwed.reduce((s, r) => s + r.amount, 0);

  // Per campus for the selected month, plus a "whole school" row for shared costs.
  const campusRows = [
    ...report.campuses.map((c) => ({ id: c.id, name: c.name })),
    ...(report.includeSchoolWide ? [{ id: null as string | null, name: "Whole school (shared costs)" }] : []),
  ]
    .map((c) => {
      const match = (r: MonthCampus) => r.month === selected.month && r.campusId === c.id;
      const income = sum(report.income.filter(match));
      const expenses = sum(report.expenses.filter(match));
      const salaries = sum(report.salaries.filter(match));
      return { ...c, income, expenses, salaries, net: income - expenses - salaries };
    })
    .filter((c) => c.id !== null || c.expenses || c.salaries);

  const categoryRows = [
    ...report.categories.map((c) => ({ name: c.name, amount: sum(report.expenses.filter((r) => r.month === selected.month && r.categoryId === c.id)) })),
    { name: "Salaries", amount: selected.salaries },
  ]
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const totalSpend = selected.expenses + selected.salaries;

  /** Change against the month before. Not shown for the current month — a few days in, any comparison with a full month misleads. */
  function trend(current: number, before: number | undefined) {
    if (isCurrentMonth(selected.month)) return { direction: "flat" as const, label: "so far this month" };
    if (before === undefined || before === 0) return undefined;
    const change = Math.round(((current - before) / Math.abs(before)) * 100);
    if (change === 0) return { direction: "flat" as const, label: "same as the month before" };
    return { direction: change > 0 ? ("up" as const) : ("down" as const), label: `${change > 0 ? "+" : ""}${change}% vs the month before` };
  }

  function exportCsv() {
    downloadCsv(
      `income-and-expenses-${report.months[0]}-to-${lastMonth}.csv`,
      ["Month", "Fee income (Rs.)", "Expenses (Rs.)", "Salaries (Rs.)", "Net (Rs.)"],
      [...monthly.map((m) => [monthKeyLabel(m.month), m.income, m.expenses, m.salaries, m.net]), ["Total", totals.income, totals.expenses, totals.salaries, totals.net]],
    );
  }

  return (
    <div>
      <PageHeader
        title="Income & Expenses"
        description={`Fee income against spending and salaries — ${scopeLabel.toLowerCase() === "all campuses" ? "the whole school" : scopeLabel}. Money is counted in the month it was received or paid.`}
        actions={
          <>
            <Select aria-label="Period" value={String(monthCount)} onChange={(e) => router.push(`/finance?months=${e.target.value}`)}>
              {ranges.map((r) => (
                <option key={r} value={r}>Last {r} months</option>
              ))}
            </Select>
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              <Download /> Export
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="finance-month" className="text-label-md text-on-surface-variant">Showing</label>
        <Select id="finance-month" value={selected.month} onChange={(e) => setSelectedMonth(e.target.value)}>
          {[...monthly].reverse().map(({ month: m }) => (
            <option key={m} value={m}>{monthKeyLabel(m)}</option>
          ))}
        </Select>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Fee income" value={formatCompactPKR(selected.income)} icon="payments" tone="success" href="/fees" trend={trend(selected.income, previous?.income)} />
        <StatCard label="Expenses" value={formatCompactPKR(selected.expenses)} icon="receipt" href="/expenses" trend={trend(selected.expenses, previous?.expenses)} />
        <StatCard label="Salaries paid" value={formatCompactPKR(selected.salaries)} icon="badge_dollar" href={report.links.payroll ? "/payroll" : undefined} trend={trend(selected.salaries, previous?.salaries)} />
        <StatCard
          label={selected.net >= 0 ? "Surplus" : "Shortfall"}
          value={selected.net < 0 ? `− ${formatCompactPKR(-selected.net)}` : formatCompactPKR(selected.net)}
          icon="balance"
          tone={selected.net >= 0 ? "success" : "error"}
          trend={{ direction: "flat", label: selected.income ? `${Math.round((selected.net / selected.income) * 100)}% of income` : "no fee income yet" }}
        />
      </div>

      {owed > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-container/40 px-3 py-2 text-label-md text-on-warning-container">
          <span>
            {formatPKR(owed)} in finalized salaries hasn&apos;t been paid yet ({report.salariesOwed.map((r) => monthKeyLabel(r.month)).join(", ")}). It isn&apos;t counted above until it&apos;s paid.
          </span>
          {report.links.payroll && (
            <Link href="/payroll" className="font-semibold underline">
              Open Salaries
            </Link>
          )}
        </div>
      )}

      <ChartCard title="Month by month" description={`${monthKeyLabel(monthly[0].month)} – ${monthKeyLabel(lastMonth)}`} className="mb-5" height={280}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => (v < 0 ? `−${formatCompactNumber(-v)}` : formatCompactNumber(v))} width={48} tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, name) => [signedPKR(Number(v)), name]} contentStyle={{ borderRadius: 8, borderColor: "var(--color-outline-variant)", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Fee income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" stackId="out" fill="var(--color-error)" fillOpacity={0.7} />
            <Bar dataKey="salaries" name="Salaries" stackId="out" fill="var(--color-warning)" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="net" name="Net" stroke="var(--color-secondary)" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="By campus" description={monthKeyLabel(selected.month)} />
          <CardContent className="overflow-x-auto pt-md">
            <table className="w-full text-left text-body-md">
              <thead>
                <tr className="border-b border-outline-variant text-label-md uppercase tracking-wide text-on-surface-variant">
                  <th scope="col" className="py-2 pr-3 font-semibold">Campus</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Income</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Expenses</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Salaries</th>
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {campusRows.map((c) => (
                  <tr key={c.id ?? "school"}>
                    <td className="py-2 pr-3 font-medium text-on-surface">{c.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.income ? formatPKR(c.income) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{c.expenses ? formatPKR(c.expenses) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{c.salaries ? formatPKR(c.salaries) : "—"}</td>
                    <td className={cn("py-2 pl-3 text-right font-semibold tabular-nums", c.net < 0 ? "text-error" : "text-on-surface")}>{signedPKR(c.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.includeSchoolWide && campusRows.some((c) => c.id === null) && (
              <p className="pt-2 text-label-sm text-on-surface-variant">Shared costs aren&apos;t split between campuses, so a campus&apos;s own net is before its share of them.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Where the money went" description={`${monthKeyLabel(selected.month)} · ${formatPKR(totalSpend)}`} />
          <CardContent className="pt-md">
            {categoryRows.length === 0 ? (
              <p className="py-6 text-center text-body-md text-on-surface-variant">No approved expenses or salary payments this month.</p>
            ) : (
              <ul className="space-y-2.5">
                {categoryRows.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between gap-2 text-body-md">
                      <span className="text-on-surface">{c.name}</span>
                      <span className="tabular-nums text-on-surface-variant">
                        {formatPKR(c.amount)} · {Math.round((c.amount / totalSpend) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div className={cn("h-full rounded-full", c.name === "Salaries" ? "bg-warning" : "bg-error/70")} style={{ width: `${Math.max(2, (c.amount / totalSpend) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly summary" description={`${monthKeyLabel(monthly[0].month)} – ${monthKeyLabel(lastMonth)}`} />
        <CardContent className="overflow-x-auto pt-md">
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant text-label-md uppercase tracking-wide text-on-surface-variant">
                <th scope="col" className="py-2 pr-3 font-semibold">Month</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Fee income</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Expenses</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Salaries</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {[...monthly].reverse().map((m) => (
                <tr key={m.month} className={cn("cursor-pointer hover:bg-surface-container-low/60", m.month === selected.month && "bg-secondary-fixed/25")} onClick={() => setSelectedMonth(m.month)}>
                  <td className="py-2 pr-3 font-medium text-on-surface">{monthKeyLabel(m.month)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPKR(m.income)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{formatPKR(m.expenses)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">{formatPKR(m.salaries)}</td>
                  <td className={cn("py-2 pl-3 text-right font-semibold tabular-nums", m.net < 0 ? "text-error" : "text-on-surface")}>{signedPKR(m.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPKR(totals.income)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPKR(totals.expenses)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPKR(totals.salaries)}</td>
                <td className={cn("py-2 pl-3 text-right tabular-nums", totals.net < 0 && "text-error")}>{signedPKR(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
