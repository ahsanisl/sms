"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { formatCompactNumber, formatCompactPKR, formatDate, timeAgo } from "@/lib/format";

interface CampusGlanceRow {
  id: string;
  name: string;
  students: number;
  teachers: number;
  attendanceRate: number;
  collected: number;
  outstanding: number;
}

interface AdminDashboardProps {
  userName: string;
  campusLabel: string;
  today: string;
  totalStudents: number;
  totalTeachers: number;
  todayRate: number;
  yesterdayRate: number;
  collected: number;
  outstanding: number;
  showCampusGlance: boolean;
  campusGlance: CampusGlanceRow[];
  attendanceTrend: { date: string; rate: number }[];
  feeByCampus: { campus: string; collected: number; outstanding: number }[];
  classAttendance: { id: string; label: string; rate: number }[];
  latestStudentActivity?: { name: string; classLabel: string; admissionDate: string };
  latestPayments: { id: string; amount: number; date: string }[];
  absentToday: number;
  upcomingExams: { id: string; name: string; startDate: string }[];
}

export function AdminDashboard({
  userName,
  campusLabel,
  today,
  totalStudents,
  totalTeachers,
  todayRate,
  yesterdayRate,
  collected,
  outstanding,
  showCampusGlance,
  campusGlance,
  attendanceTrend,
  feeByCampus,
  classAttendance,
  latestStudentActivity,
  latestPayments,
  absentToday,
  upcomingExams,
}: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg font-semibold text-primary mb-1">
            Good morning, {userName.split(" ")[0]}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Here&apos;s what&apos;s happening across your school today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg border border-outline-variant card-shadow">
            <Icon name="business" className="h-4 w-4 text-on-surface-variant" />
            <span className="text-label-md">{campusLabel}</span>
          </div>
          <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg border border-outline-variant card-shadow">
            <Icon name="calendar_today" className="h-4 w-4 text-on-surface-variant" />
            <span className="text-label-md">{formatDate(today)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon="group" trend={{ direction: "up", label: "Across all classes" }} />
        <StatCard label="Teachers" value={totalTeachers.toLocaleString()} icon="school" trend={{ direction: "flat", label: "Active faculty" }} />
        <StatCard
          label="Today's Attendance"
          value={`${todayRate}%`}
          icon="fact_check"
          trend={{ direction: todayRate >= yesterdayRate ? "up" : "down", label: `${Math.abs(todayRate - yesterdayRate)}% vs yesterday` }}
        />
        <StatCard label="Fees Collected" value={formatCompactPKR(collected)} icon="payments" trend={{ direction: "up", label: "This month" }} />
        <StatCard label="Outstanding Fees" value={formatCompactPKR(outstanding)} icon="account_balance_wallet" trend={{ direction: "down", label: "This month" }} />
      </div>

      {showCampusGlance && (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow mt-8">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Campuses at a Glance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Campus</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Students</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Teachers</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Today&apos;s Attendance</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Collected (Aug)</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Outstanding (Aug)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {campusGlance.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-bright transition-colors">
                    <td className="p-3 font-medium text-on-surface">
                      <Link href="/settings/campuses" className="hover:text-secondary hover:underline">{c.name}</Link>
                    </td>
                    <td className="p-3 text-right text-on-surface-variant">{c.students}</td>
                    <td className="p-3 text-right text-on-surface-variant">{c.teachers}</td>
                    <td className="p-3 text-right">
                      <span className={c.attendanceRate >= 90 ? "text-emerald-600 font-semibold" : c.attendanceRate >= 75 ? "text-on-surface" : "text-error font-semibold"}>
                        {c.attendanceRate}%
                      </span>
                    </td>
                    <td className="p-3 text-right text-on-surface-variant">{formatCompactPKR(c.collected)}</td>
                    <td className="p-3 text-right text-error">{formatCompactPKR(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ChartCard title="Attendance Overview (last 7 days)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} />
              <Area type="monotone" dataKey="rate" stroke="var(--color-secondary)" strokeWidth={2} fill="url(#attendanceFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Fee Collection by Campus (${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })})`}>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-6">Today&apos;s Attendance</h3>
          <div className="space-y-5">
            {classAttendance.map(({ id, label, rate: r }) => (
              <div key={id}>
                <div className="flex justify-between text-label-md mb-2">
                  <span className="text-on-surface font-semibold">{label}</span>
                  <span className={r >= 90 ? "text-emerald-600 font-bold" : r >= 80 ? "text-on-surface-variant font-bold" : "text-error font-bold"}>
                    {r}%
                  </span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r >= 80 ? "bg-secondary" : "bg-error"}`} style={{ width: `${r}%` }} />
                </div>
              </div>
            ))}
            {classAttendance.length === 0 && <p className="text-body-md text-on-surface-variant">No attendance recorded yet today.</p>}
          </div>
          <Button variant="link" asChild className="w-full mt-6 justify-center">
            <Link href="/classes">View All Classes</Link>
          </Button>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow col-span-1 lg:col-span-2">
          <h3 className="text-title-lg font-semibold text-primary mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {latestStudentActivity && (
              <ActivityItem
                icon="person_add"
                tone="secondary"
                text={<><span className="font-semibold">{latestStudentActivity.name}</span> was admitted to <span className="font-semibold">{latestStudentActivity.classLabel}</span></>}
                time={formatDate(latestStudentActivity.admissionDate)}
              />
            )}
            {latestPayments.map((p) => (
              <ActivityItem key={p.id} icon="payments" tone="success" text={<><span className="font-semibold">{formatCompactPKR(p.amount)}</span> fee payment received</>} time={timeAgo(p.date)} />
            ))}
            {absentToday > 0 && (
              <ActivityItem icon="cancel" tone="error" text={<><span className="font-semibold">{absentToday} students</span> marked absent today</>} time={formatDate(today)} />
            )}
            {!latestStudentActivity && latestPayments.length === 0 && absentToday === 0 && (
              <p className="text-body-md text-on-surface-variant">Nothing to show yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {upcomingExams.length === 0 && <p className="text-body-md text-on-surface-variant">No upcoming exams scheduled.</p>}
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
                  <Icon name="event_upcoming" className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-body-md text-on-surface font-medium">{exam.name}</p>
                  <p className="text-label-sm text-on-surface-variant">{formatDate(exam.startDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction href="/students/new" icon="person_add" label="Add Student" />
            <QuickAction href="/attendance/mark" icon="how_to_reg" label="Mark Attendance" />
            <QuickAction href="/fees/collect" icon="point_of_sale" label="Collect Fee" />
            <QuickAction href="/announcements/create" icon="campaign" label="New Announcement" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, tone, text, time }: { icon: string; tone: "secondary" | "success" | "error"; text: React.ReactNode; time: string }) {
  const toneClasses = {
    secondary: "bg-secondary-container/20 text-secondary",
    success: "bg-emerald-100 text-emerald-600",
    error: "bg-error-container/50 text-error",
  }[tone];
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-surface-container-low transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toneClasses}`}>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-body-md text-on-surface">{text}</p>
        <p className="text-label-sm text-on-surface-variant mt-1">{time}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant p-4 text-center hover:bg-surface-container-low hover:border-secondary/40 transition-colors"
    >
      <Icon name={icon} className="h-5 w-5 text-secondary" />
      <span className="text-label-md font-medium text-on-surface">{label}</span>
    </Link>
  );
}
