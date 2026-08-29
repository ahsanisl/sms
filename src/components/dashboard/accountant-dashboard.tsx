"use client";

import Link from "next/link";
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Icon } from "@/components/shared/icon";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { useStudents, useFeesStore } from "@/lib/store/hooks";
import { CAMPUSES } from "@/lib/mock/reference-data";
import { formatCompactNumber, formatCompactPKR, formatDate, timeAgo } from "@/lib/format";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
};

export function AccountantDashboard() {
  const { user } = useSession();
  const { scopedCampusId, isAllCampuses } = useCampusScope();
  const { students } = useStudents();
  const { invoices, payments } = useFeesStore();

  const scopedStudents = scopedCampusId ? students.filter((s) => s.campusId === scopedCampusId) : students;
  const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));
  const scopedInvoices = invoices.filter((i) => scopedStudentIds.has(i.studentId));
  const scopedPayments = payments.filter((p) => scopedStudentIds.has(p.studentId));

  const currentMonthInvoices = scopedInvoices.filter((i) => i.month === "August 2026");
  const collected = currentMonthInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const overdueCount = currentMonthInvoices.filter((i) => i.status === "overdue").length;
  const totalCollectedAllTime = scopedPayments.reduce((s, p) => s + p.amount, 0);

  const feeByCampus = (scopedCampusId ? CAMPUSES.filter((c) => c.id === scopedCampusId) : CAMPUSES).map((campus) => {
    const campusInvoices = currentMonthInvoices.filter((i) => students.find((s) => s.id === i.studentId)?.campusId === campus.id);
    return {
      campus: campus.name.replace(" Campus", ""),
      collected: campusInvoices.reduce((s, i) => s + i.paidAmount, 0),
      outstanding: campusInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
    };
  });

  const recentPayments = [...scopedPayments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg font-semibold text-primary mb-1">Good morning, {user?.name.split(" ")[0]}</h2>
          <p className="text-body-md text-on-surface-variant">
            {isAllCampuses ? "Here's the fee collection picture across all campuses." : "Here's the fee collection picture for this campus."}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg border border-outline-variant card-shadow">
          <Icon name="calendar_today" className="h-4 w-4 text-on-surface-variant" />
          <span className="text-label-md">{formatDate("2026-08-27")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Collected (August 2026)" value={formatCompactPKR(collected)} icon="payments" trend={{ direction: "up", label: "This month" }} />
        <StatCard label="Outstanding (August 2026)" value={formatCompactPKR(outstanding)} icon="account_balance_wallet" trend={{ direction: "down", label: "This month" }} />
        <StatCard label="Overdue Invoices" value={String(overdueCount)} icon="warning" />
        <StatCard label="Total Collected (All Time)" value={formatCompactPKR(totalCollectedAllTime)} icon="savings" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <ChartCard title="Fee Collection by Campus (August 2026)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeByCampus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
              <XAxis dataKey="campus" tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactNumber(v)} width={44} tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCompactPKR(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="collected" name="Collected" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="var(--color-error)" radius={[4, 4, 0, 0]} fillOpacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickAction href="/fees/collect" icon="point_of_sale" label="Collect Fee" />
            <QuickAction href="/fees/structure" icon="receipt_long" label="Fee Structure" />
            <QuickAction href="/fees/reports" icon="analytics" label="Fee Reports" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title-lg font-semibold text-primary">Recent Payments</h3>
          <Link href="/fees/reports" className="text-label-md text-secondary hover:underline">View All →</Link>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {recentPayments.map((p) => {
            const student = students.find((s) => s.id === p.studentId);
            return (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-body-md text-on-surface font-medium">{student?.name ?? "—"}</p>
                  <p className="text-label-sm text-on-surface-variant">{METHOD_LABEL[p.method] ?? p.method} · {timeAgo(p.date)}</p>
                </div>
                <span className="text-body-md font-semibold text-emerald-600">{formatCompactPKR(p.amount)}</span>
              </div>
            );
          })}
          {recentPayments.length === 0 && <p className="text-body-md text-on-surface-variant py-6">No payments recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-outline-variant p-4 hover:bg-surface-container-low hover:border-secondary/40 transition-colors"
    >
      <Icon name={icon} className="h-5 w-5 text-secondary" />
      <span className="text-label-md font-medium text-on-surface">{label}</span>
    </Link>
  );
}
