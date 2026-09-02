"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { formatCompactNumber, formatCompactPKR, formatDate, formatPKR } from "@/lib/format";

interface TransactionRow {
  id: string;
  studentName: string;
  method: string;
  amount: number;
  date: string;
}

interface GradeCollection {
  grade: string;
  collected: number;
}

export function FeesDashboardClient({
  totalRevenue,
  collectedThisMonth,
  outstanding,
  overdueCount,
  collectionByGrade,
  recentTransactions,
  currentMonthCount,
  currentMonthPaidCount,
  currentMonthUnpaidCount,
  canManageStructure,
}: {
  totalRevenue: number;
  collectedThisMonth: number;
  outstanding: number;
  overdueCount: number;
  collectionByGrade: GradeCollection[];
  recentTransactions: TransactionRow[];
  currentMonthCount: number;
  currentMonthPaidCount: number;
  currentMonthUnpaidCount: number;
  canManageStructure: boolean;
}) {
  return (
    <div>
      <PageHeader
        title="Fees & Finances"
        description="Track collections, outstanding balances and manage invoices."
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/fees/structure">Fee Structure</Link>
            </Button>
            {canManageStructure && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/fees/generate">Generate Invoices</Link>
              </Button>
            )}
            <Button variant="secondary" size="sm" asChild>
              <Link href="/fees/reports">Reports</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/fees/collect">Collect Payment</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={formatCompactPKR(totalRevenue)} icon="account_balance" />
        <StatCard label="Collected This Month" value={formatCompactPKR(collectedThisMonth)} icon="payments" trend={{ direction: "up", label: "This month" }} />
        <StatCard label="Outstanding Balance" value={formatCompactPKR(outstanding)} icon="account_balance_wallet" trend={{ direction: "down", label: "This month" }} />
        <StatCard label="Overdue Accounts" value={String(overdueCount)} icon="warning" trend={{ direction: overdueCount > 0 ? "down" : "flat", label: "Need follow-up" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ChartCard title="Collection by Grade" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={collectionByGrade} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
              <XAxis dataKey="grade" tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactNumber(v)} width={44} tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCompactPKR(Number(v))} />
              <Bar dataKey="collected" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-label-md font-medium tracking-wide text-on-surface-variant uppercase mb-4 border-b border-outline-variant pb-2">
            This Month at a Glance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">Invoices Issued</span>
              <span className="font-semibold text-on-surface">{currentMonthCount}</span>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">Fully Paid</span>
              <span className="font-semibold text-emerald-600">{currentMonthPaidCount}</span>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">Unpaid</span>
              <span className="font-semibold text-error">{currentMonthUnpaidCount}</span>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">Overdue</span>
              <span className="font-semibold text-error">{overdueCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm">
        <div className="p-lg border-b border-outline-variant/40">
          <h3 className="text-title-lg font-semibold text-primary">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-4 text-label-sm text-on-surface-variant uppercase font-semibold">Student</th>
                <th className="p-4 text-label-sm text-on-surface-variant uppercase font-semibold">Method</th>
                <th className="p-4 text-label-sm text-on-surface-variant uppercase font-semibold text-right">Amount</th>
                <th className="p-4 text-label-sm text-on-surface-variant uppercase font-semibold">Date</th>
                <th className="p-4 text-label-sm text-on-surface-variant uppercase font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {recentTransactions.map((p) => (
                <tr key={p.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.studentName} />
                      <span className="font-medium text-on-surface">{p.studentName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-on-surface-variant capitalize">{p.method.replace("_", " ")}</td>
                  <td className="p-4 text-right font-medium text-on-surface">{formatPKR(p.amount)}</td>
                  <td className="p-4 text-on-surface-variant">{formatDate(p.date)}</td>
                  <td className="p-4">
                    <StatusBadge label="Paid" tone="success" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
