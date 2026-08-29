"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { useAttendanceStore } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { CLASSES, classLabel } from "@/lib/mock/reference-data";
import { SCHOOL_DAYS } from "@/lib/mock/attendance";
import { formatDate } from "@/lib/format";

export default function AttendancePage() {
  const { attendance } = useAttendanceStore();
  const { user } = useSession();
  const { scopedCampusId } = useCampusScope();

  const scopedClasses = user?.role === "teacher"
    ? CLASSES.filter((c) => c.campusId === user.campusId)
    : scopedCampusId
      ? CLASSES.filter((c) => c.campusId === scopedCampusId)
      : CLASSES;
  const scopedClassIds = new Set(scopedClasses.map((c) => c.id));

  const today = SCHOOL_DAYS[SCHOOL_DAYS.length - 1];
  const todayRecords = attendance.filter((a) => a.date === today && scopedClassIds.has(a.classId));

  const present = todayRecords.filter((r) => r.status === "present").length;
  const absent = todayRecords.filter((r) => r.status === "absent").length;
  const leave = todayRecords.filter((r) => r.status === "leave" || r.status === "late").length;
  const rate = todayRecords.length ? Math.round(((present + todayRecords.filter((r) => r.status === "late").length) / todayRecords.length) * 100) : 0;

  const trend = SCHOOL_DAYS.slice(-7).map((date) => {
    const records = attendance.filter((a) => a.date === date && scopedClassIds.has(a.classId));
    const p = records.filter((r) => r.status === "present" || r.status === "late").length;
    return { date: formatDate(date).slice(0, 6), rate: records.length ? Math.round((p / records.length) * 100) : 0 };
  });

  const classBreakdown = scopedClasses.map((cls) => {
    const records = todayRecords.filter((r) => r.classId === cls.id);
    const p = records.filter((r) => r.status === "present" || r.status === "late").length;
    return {
      cls,
      total: records.length,
      present: p,
      absent: records.filter((r) => r.status === "absent").length,
      rate: records.length ? Math.round((p / records.length) * 100) : 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Attendance Dashboard"
        description={`Overview for ${formatDate(today)}`}
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/attendance/corrections">{user?.role === "teacher" ? "My Corrections" : "Corrections"}</Link>
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
            {classBreakdown.map(({ cls, present: p, absent: a, rate: r, total }) => (
              <Link
                key={cls.id}
                href={`/attendance/mark?classId=${cls.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
              >
                <div>
                  <p className="text-body-md font-medium text-on-surface">{classLabel(cls)}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {p} present · {a} absent · {total} total
                  </p>
                </div>
                <span className={`text-title-lg font-semibold ${r >= 90 ? "text-emerald-600" : r >= 75 ? "text-on-surface" : "text-error"}`}>{r}%</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
