"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DashboardHeader, EventList, QuickActions, TaskList, rateTone, type DashboardTask } from "@/components/dashboard/widgets";
import { formatDate } from "@/lib/format";
import type { NavItem } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

interface TeacherDashboardProps {
  userName: string;
  today: string;
  myClasses: { id: string; label: string; studentCount: number; markedToday?: boolean; todayRate?: number }[];
  todaySlots: { id: string; period?: number; startTime: string; endTime?: string; subjectName: string; classLabel: string }[];
  rate: number;
  overallRate: number;
  totalStudents: number;
  upcomingExams: { id: string; name: string; startDate: string; ongoing?: boolean }[];
  tasks: DashboardTask[];
  quickActions: NavItem[];
  isWorkingDay: boolean;
}

const noopSubscribe = () => () => {};
/** "HH:MM" in the viewer's local time — null on the server, so the "Now" highlight only appears client-side. */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TeacherDashboard({ userName, today, myClasses, todaySlots, rate, overallRate, totalStudents, upcomingExams, tasks, quickActions, isWorkingDay }: TeacherDashboardProps) {
  const now = useSyncExternalStore(noopSubscribe, nowHHMM, () => null);
  const canMark = quickActions.some((a) => a.href === "/attendance/mark");
  const markedCount = myClasses.filter((c) => c.markedToday).length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={userName}
        subtitle={`Here's your teaching overview for ${formatDate(today)}.`}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/leave">
                <Icon name="event_busy" /> Request Leave
              </Link>
            </Button>
            {canMark && (
              <Button asChild>
                <Link href="/attendance/mark">
                  <Icon name="how_to_reg" /> Mark Attendance
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My Classes" value={String(myClasses.length)} icon="class" href="/classes" />
        <StatCard label="My Students" value={String(totalStudents)} icon="group" href="/students" />
        <StatCard
          label="Today's Attendance"
          value={markedCount > 0 ? `${rate}%` : "—"}
          icon="fact_check"
          tone={markedCount > 0 ? rateTone(rate) : "default"}
          href="/attendance"
          trend={{ direction: "flat", label: markedCount > 0 ? `${markedCount}/${myClasses.length} classes · ${overallRate}% overall` : `${overallRate}% overall` }}
        />
        <StatCard label="Upcoming Exams" value={String(upcomingExams.length)} icon="quiz" href="/exams" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today's timetable" description={isWorkingDay ? `${todaySlots.length} period${todaySlots.length === 1 ? "" : "s"} scheduled` : "No school today"} action={<Link href="/timetable" className="text-label-md font-semibold text-secondary hover:underline">Full timetable</Link>} />
          <div className="p-lg pt-md">
            {todaySlots.length === 0 ? (
              <p className="py-6 text-center text-body-md text-on-surface-variant">{isWorkingDay ? "No periods scheduled for you today." : "Enjoy your day off."}</p>
            ) : (
              <ol className="relative space-y-2 border-l-2 border-outline-variant/50 pl-4">
                {todaySlots.map((slot) => {
                  const current = !!now && !!slot.endTime && slot.startTime <= now && now < slot.endTime;
                  const past = !!now && !!slot.endTime && slot.endTime <= now;
                  return (
                    <li key={slot.id} className={cn("relative flex items-center gap-4 rounded-lg border p-3", current ? "border-secondary bg-secondary-fixed/40" : "border-outline-variant/50", past && "opacity-60")}>
                      <span aria-hidden className={cn("absolute -left-[23px] h-3 w-3 rounded-full border-2 border-surface-container-lowest", current ? "bg-secondary" : "bg-outline-variant")} />
                      <div className="w-24 shrink-0 text-label-md tabular-nums text-on-surface-variant">
                        {slot.startTime}
                        {slot.endTime && <span className="block text-label-sm">to {slot.endTime}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md font-medium text-on-surface">{slot.subjectName}</p>
                        <p className="text-label-sm text-on-surface-variant">Class {slot.classLabel}{slot.period ? ` · Period ${slot.period}` : ""}</p>
                      </div>
                      {current && <StatusBadge label="Now" tone="info" />}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Card>

        <TaskList tasks={tasks} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="My classes" description="Class-teacher assignments" />
          <div className="space-y-2 p-lg pt-md">
            {myClasses.map((cls) => (
              <Link
                key={cls.id}
                href={`/classes/${cls.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/50 p-3 transition-colors hover:border-secondary/40 hover:bg-surface-container-low"
              >
                <div>
                  <p className="text-body-md font-medium text-on-surface">Class {cls.label}</p>
                  <p className="text-label-sm text-on-surface-variant">{cls.studentCount} students</p>
                </div>
                {isWorkingDay &&
                  (cls.markedToday ? <StatusBadge label={`${cls.todayRate ?? 0}% present`} tone={rateTone(cls.todayRate ?? 0)} /> : <StatusBadge label="Not marked" tone="warning" />)}
              </Link>
            ))}
            {myClasses.length === 0 && <p className="py-4 text-center text-body-md text-on-surface-variant">No classes assigned yet.</p>}
          </div>
        </Card>

        <EventList
          title="Upcoming exams"
          description="For your classes"
          events={upcomingExams.map((e) => ({ id: e.id, date: e.startDate, title: e.name, badge: e.ongoing ? "Ongoing" : undefined, href: "/exams" }))}
          emptyText="No upcoming exams for your classes."
        />

        <QuickActions actions={quickActions} columns="grid-cols-2" />
      </div>
    </div>
  );
}
