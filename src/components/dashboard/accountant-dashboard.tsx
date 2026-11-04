"use client";

import Link from "next/link";
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/shared/icon";
import { DashboardHeader, ProgressBar, QuickActions, TaskList, type DashboardTask } from "@/components/dashboard/widgets";
import { formatCompactNumber, formatCompactPKR, formatDate, formatPKR, timeAgo } from "@/lib/format";
import type { NavItem } from "@/lib/nav-config";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
};

const axisTick = { fontSize: 12, fill: "var(--color-on-surface-variant)" };

interface AccountantDashboardProps {
  userName: string;
  isAllCampuses: boolean;
  billed: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
  totalCollectedAllTime: number;
  feeByCampus: { campus: string; collected: number; outstanding: number }[];
  recentPayments: { id: string; studentName: string; method: string; amount: number; date: string }[];
  tasks: DashboardTask[];
  quickActions: NavItem[];
  /** This month's fee income minus expenses and salaries paid — null without the Income & Expenses report permission. */
  financeMonth: { income: number; expenses: number; salaries: number; net: number } | null;
}

export function AccountantDashboard({
  userName,
  isAllCampuses,
  billed,
  collected,
  outstanding,
  overdueCount,
  totalCollectedAllTime,
  feeByCampus,
  recentPayments,
  tasks,
  quickActions,
  financeMonth,
}: AccountantDashboardProps) {
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
  const canCollect = quickActions.some((a) => a.href === "/fees/collect");

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={userName}
        subtitle={isAllCampuses ? "Here's the fee collection picture across all campuses." : "Here's the fee collection picture for this campus."}
        chips={[{ icon: "calendar_today", label: formatDate(new Date().toISOString().slice(0, 10)) }]}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/fees/reports">
                <Icon name="analytics" /> Fee Reports
              </Link>
            </Button>
            {canCollect && (
              <Button asChild>
                <Link href="/fees/collect">
                  <Icon name="point_of_sale" /> Collect Payment
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected This Month" value={formatCompactPKR(collected)} icon="payments" tone="success" href="/fees" trend={{ direction: "flat", label: monthLabel }} />
        <StatCard label="Outstanding This Month" value={formatCompactPKR(outstanding)} icon="account_balance_wallet" tone={outstanding > 0 ? "error" : "success"} href="/fees" trend={{ direction: "flat", label: monthLabel }} />
        <StatCard label="Overdue Invoices" value={String(overdueCount)} icon="warning" tone={overdueCount > 0 ? "warning" : "success"} href="/fees/reports" />
        {financeMonth ? (
          <StatCard
            label="Net This Month"
            value={financeMonth.net < 0 ? `− ${formatCompactPKR(-financeMonth.net)}` : formatCompactPKR(financeMonth.net)}
            icon="balance"
            tone={financeMonth.net >= 0 ? "success" : "error"}
            href="/finance"
            trend={{ direction: "flat", label: `after ${formatCompactPKR(financeMonth.expenses + financeMonth.salaries)} expenses & salaries` }}
          />
        ) : (
          <StatCard label="Total Collected (All Time)" value={formatCompactPKR(totalCollectedAllTime)} icon="savings" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <CardHeader title="Collection progress" description={monthLabel} />
          <div className="p-lg pt-md">
            <p className="text-display-sm font-bold tracking-tight text-primary tabular-nums">{collectionRate}%</p>
            <p className="mb-4 text-body-md text-on-surface-variant">of {formatPKR(billed)} billed has been collected</p>
            <ProgressBar value={collectionRate} tone={collectionRate >= 75 ? "success" : collectionRate >= 40 ? "warning" : "error"} label="Collection rate this month" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-label-md">
              <div className="rounded-lg bg-success-container/50 p-3">
                <p className="text-on-surface-variant">Collected</p>
                <p className="mt-0.5 font-semibold text-success tabular-nums">{formatCompactPKR(collected)}</p>
              </div>
              <div className="rounded-lg bg-error-container/40 p-3">
                <p className="text-on-surface-variant">Remaining</p>
                <p className="mt-0.5 font-semibold text-error tabular-nums">{formatCompactPKR(outstanding)}</p>
              </div>
            </div>
          </div>
        </Card>

        <ChartCard title="Fee collection by campus" description={monthLabel} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeByCampus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.6} vertical={false} />
              <XAxis dataKey="campus" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactNumber(v)} width={44} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCompactPKR(Number(v))} contentStyle={{ borderRadius: 8, borderColor: "var(--color-outline-variant)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="collected" name="Collected" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="var(--color-error)" radius={[4, 4, 0, 0]} fillOpacity={0.55} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TaskList tasks={tasks} />

        <Card className="lg:col-span-2">
          <CardHeader title="Recent payments" action={<Link href="/fees/reports" className="text-label-md font-semibold text-secondary hover:underline">View all</Link>} />
          <div className="divide-y divide-outline-variant/30 px-lg pb-sm pt-sm">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <Avatar name={p.studentName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-medium text-on-surface">{p.studentName}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {METHOD_LABEL[p.method] ?? p.method} · {timeAgo(p.date)}
                  </p>
                </div>
                <span className="text-body-md font-semibold text-success tabular-nums">+{formatCompactPKR(p.amount)}</span>
              </div>
            ))}
            {recentPayments.length === 0 && <p className="py-8 text-center text-body-md text-on-surface-variant">No payments recorded yet.</p>}
          </div>
        </Card>
      </div>

      <QuickActions actions={quickActions} />
    </div>
  );
}
