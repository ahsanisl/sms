"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface ClassBreakdownRow {
  classId: string;
  classLabel: string;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

interface TrendPoint {
  date: string;
  rate: number;
}

export function AttendanceDashboardClient({
  today,
  isTeacher,
  rate,
  present,
  absent,
  leave,
  trend,
  classBreakdown,
}: {
  today: string;
  isTeacher: boolean;
  rate: number;
  present: number;
  absent: number;
  leave: number;
  trend: TrendPoint[];
  classBreakdown: ClassBreakdownRow[];
}) {
  return (
    <div>
      <PageHeader
        title="Attendance Dashboard"
        description={`Overview for ${formatDate(today)}`}
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/attendance/corrections">{isTeacher ? "My Corrections" : "Corrections"}</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/attendance/reports">View Reports</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/attendance/mark">Mark Attendance</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Overall Attendance" value={`${rate}%`} icon="fact_check" />
        <StatCard label="Present" value={String(present)} icon="check_circle" />
        <StatCard label="Absent" value={String(absent)} icon="cancel" />
        <StatCard label="On Leave / Late" value={String(leave)} icon="event_busy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Attendance Trend (7 Days)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} />
              <Area type="monotone" dataKey="rate" stroke="var(--color-secondary)" strokeWidth={2} fill="url(#attTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Class Breakdown</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {classBreakdown.map((row) => (
              <Link
                key={row.classId}
                href={`/attendance/mark?classId=${row.classId}`}
                className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
              >
                <div>
                  <p className="text-body-md font-medium text-on-surface">{row.classLabel}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {row.present} present · {row.absent} absent · {row.total} total
                  </p>
                </div>
                <span className={`text-title-lg font-semibold ${row.rate >= 90 ? "text-emerald-600" : row.rate >= 75 ? "text-on-surface" : "text-error"}`}>{row.rate}%</span>
              </Link>
            ))}
            {classBreakdown.length === 0 && <p className="text-body-md text-on-surface-variant">No classes to show.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
