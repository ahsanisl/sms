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
import { Card, CardHeader } from "@/components/ui/card";
import { DashboardHeader, EventList, ProgressBar, QuickActions, TaskList, rateTone, type DashboardEvent, type DashboardTask } from "@/components/dashboard/widgets";
import { formatCompactNumber, formatCompactPKR, formatDate, timeAgo } from "@/lib/format";
import type { NavItem } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

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
  monthLabel: string;
  totalStudents: number;
  totalTeachers: number;
  todayRate: number;
  yesterdayRate: number;
  classesMarked: number;
  totalClasses: number;
  billed: number;
  collected: number;
  outstanding: number;
  showFees: boolean;
  /** Custom roles may lack these — the matching cards are hidden rather than shown empty. Default true. */
  showStudents?: boolean;
  showTeachers?: boolean;
  showAttendance?: boolean;
  showCampusGlance: boolean;
  campusGlance: CampusGlanceRow[];
  attendanceTrend: { date: string; rate: number }[];
  feeByCampus: { campus: string; collected: number; outstanding: number }[];
  classAttendance: { id: string; label: string; rate: number }[];
  latestStudentActivity?: { id: string; name: string; classLabel: string; admissionDate: string };
  latestPayments: { id: string; amount: number; date: string; studentName: string | null }[];
  absentToday: number;
  tasks: DashboardTask[];
  upcomingEvents: DashboardEvent[];
  quickActions: NavItem[];
  /** Destination for each card — omitted when the role can't open that screen. */
  links: Partial<Record<"students" | "teachers" | "attendance" | "fees" | "feeReports" | "classes" | "campuses", string>>;
}

const axisTick = { fontSize: 12, fill: "var(--color-on-surface-variant)" };

export function AdminDashboard({
  userName,
  campusLabel,
  today,
  monthLabel,
  totalStudents,
  totalTeachers,
  todayRate,
  yesterdayRate,
  classesMarked,
  totalClasses,
  billed,
  collected,
  outstanding,
  showFees,
  showStudents = true,
  showTeachers = true,
  showAttendance = true,
  showCampusGlance,
  campusGlance,
  attendanceTrend,
  feeByCampus,
  classAttendance,
  latestStudentActivity,
  latestPayments,
  absentToday,
  tasks,
  upcomingEvents,
  quickActions,
  links,
}: AdminDashboardProps) {
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
  const rateDelta = todayRate - yesterdayRate;
  const hasAttendanceToday = classesMarked > 0;
  const kpiCount = [showStudents, showTeachers, showAttendance, showFees, showFees].filter(Boolean).length;
  const kpiCols = ({ 0: "", 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5" } as Record<number, string>)[kpiCount];
  const events = (
    <EventList title="Upcoming events" description="Exams and staff leave, next 30 days" events={upcomingEvents} emptyText="Nothing scheduled in the next 30 days." className={showAttendance ? undefined : "lg:col-span-2"} />
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={userName}
        subtitle="Here's what's happening across your school today."
        chips={[
          { icon: "business", label: campusLabel },
          { icon: "calendar_today", label: formatDate(today) },
        ]}
      />

      {kpiCount > 0 && (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", kpiCols)}>
        {showStudents && <StatCard label="Active Students" value={totalStudents.toLocaleString()} icon="group" href={links.students} />}
        {showTeachers && <StatCard label="Active Teachers" value={totalTeachers.toLocaleString()} icon="school" href={links.teachers} />}
        {showAttendance && <StatCard
          label="Today's Attendance"
          value={hasAttendanceToday ? `${todayRate}%` : "—"}
          icon="fact_check"
          tone={hasAttendanceToday ? rateTone(todayRate) : "default"}
          href={links.attendance}
          trend={
            hasAttendanceToday
              ? { direction: rateDelta > 0 ? "up" : rateDelta < 0 ? "down" : "flat", label: `${classesMarked}/${totalClasses} classes · ${rateDelta >= 0 ? "+" : ""}${rateDelta}% vs yesterday` }
              : { direction: "flat", label: `0/${totalClasses} classes marked yet` }
          }
        />}
        {showFees && (
          <StatCard
            label="Collected This Month"
            value={formatCompactPKR(collected)}
            icon="payments"
            tone="success"
            href={links.fees}
            trend={{ direction: collectionRate >= 75 ? "up" : collectionRate > 0 ? "flat" : "down", label: billed > 0 ? `${collectionRate}% of ${formatCompactPKR(billed)} billed` : "No invoices this month" }}
          />
        )}
        {showFees && (
          <StatCard
            label="Outstanding"
            value={formatCompactPKR(outstanding)}
            icon="account_balance_wallet"
            tone={outstanding > 0 ? "error" : "success"}
            href={links.feeReports}
            trend={{ direction: "flat", label: monthLabel }}
          />
        )}
      </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TaskList tasks={tasks} />
        {!showAttendance && events}
        {showAttendance && <ChartCard title="Attendance trend" description="School-wide attendance, last 7 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.6} vertical={false} />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} contentStyle={{ borderRadius: 8, borderColor: "var(--color-outline-variant)" }} />
              <Area type="monotone" dataKey="rate" stroke="var(--color-secondary)" strokeWidth={2.5} fill="url(#attendanceFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {showAttendance && events}
        {showFees ? (
          <ChartCard title="Fee collection by campus" description={monthLabel} className={showAttendance ? "lg:col-span-2" : "lg:col-span-3"}>
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
        ) : (
          <QuickActions actions={quickActions} className={showAttendance ? "lg:col-span-2" : "lg:col-span-3"} />
        )}
      </div>

      {showCampusGlance && (
        <Card>
          <CardHeader
            title="Campuses at a glance"
            description={`Today's attendance and ${monthLabel} fee collection`}
            action={links.campuses && <Link href={links.campuses} className="text-label-md font-semibold text-secondary hover:underline">Manage campuses</Link>}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-outline-variant/50 bg-surface-container-low/60">
                  <th scope="col" className="px-lg py-3 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Campus</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Students</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Teachers</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Attendance</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Collected</th>
                  <th scope="col" className="px-lg py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {campusGlance.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-container-low/60">
                    <td className="px-lg py-3 font-medium text-on-surface">{c.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{c.students}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{c.teachers}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn("font-semibold", { success: "text-success", warning: "text-warning", error: "text-error" }[rateTone(c.attendanceRate)])}>{c.attendanceRate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{formatCompactPKR(c.collected)}</td>
                    <td className="px-lg py-3 text-right tabular-nums text-error">{formatCompactPKR(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {showAttendance && <Card className="flex flex-col">
          <CardHeader title="Lowest attendance today" description="Classes marked so far, lowest first" />
          <div className="flex-1 space-y-4 p-lg pt-md">
            {classAttendance.map(({ id, label, rate }) => (
              <div key={id}>
                <div className="mb-1.5 flex justify-between text-label-md">
                  <span className="font-semibold text-on-surface">Class {label}</span>
                  <span className={cn("font-bold tabular-nums", { success: "text-success", warning: "text-warning", error: "text-error" }[rateTone(rate)])}>{rate}%</span>
                </div>
                <ProgressBar value={rate} tone={rateTone(rate)} label={`Class ${label} attendance`} />
              </div>
            ))}
            {classAttendance.length === 0 && <p className="py-4 text-center text-body-md text-on-surface-variant">No attendance recorded yet today.</p>}
          </div>
          {links.classes && (
            <div className="border-t border-outline-variant/50 px-lg py-3">
              <Link href={links.attendance ?? links.classes} className="text-label-md font-semibold text-secondary hover:underline">View attendance overview →</Link>
            </div>
          )}
        </Card>}

        <Card className={showAttendance ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader title="Recent activity" />
          <div className="space-y-1 p-sm pt-md">
            {latestStudentActivity && (
              <ActivityItem
                icon="person_add"
                tone="secondary"
                href={links.students ? `/students/${latestStudentActivity.id}` : undefined}
                text={<><span className="font-semibold">{latestStudentActivity.name}</span> was admitted to <span className="font-semibold">Class {latestStudentActivity.classLabel}</span></>}
                time={formatDate(latestStudentActivity.admissionDate)}
              />
            )}
            {latestPayments.map((p) => (
              <ActivityItem
                key={p.id}
                icon="payments"
                tone="success"
                text={<><span className="font-semibold">{formatCompactPKR(p.amount)}</span> fee payment received{p.studentName && <> from <span className="font-semibold">{p.studentName}</span></>}</>}
                time={timeAgo(p.date)}
              />
            ))}
            {absentToday > 0 && (
              <ActivityItem icon="cancel" tone="error" href={links.attendance} text={<><span className="font-semibold">{absentToday} student{absentToday === 1 ? "" : "s"}</span> marked absent today</>} time={formatDate(today)} />
            )}
            {!latestStudentActivity && latestPayments.length === 0 && absentToday === 0 && (
              <p className="px-3 py-6 text-center text-body-md text-on-surface-variant">Nothing to show yet.</p>
            )}
          </div>
        </Card>
      </div>

      {showFees && <QuickActions actions={quickActions} />}
    </div>
  );
}

function ActivityItem({ icon, tone, text, time, href }: { icon: string; tone: "secondary" | "success" | "error"; text: React.ReactNode; time: string; href?: string }) {
  const toneClasses = {
    secondary: "bg-secondary-fixed text-secondary",
    success: "bg-success-container text-success",
    error: "bg-error-container/70 text-error",
  }[tone];
  const body = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon name={icon} className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-md text-on-surface">{text}</p>
        <p className="mt-0.5 text-label-sm text-on-surface-variant">{time}</p>
      </div>
    </>
  );
  const classes = "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-low";
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
