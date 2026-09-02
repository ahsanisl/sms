"use client";

import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface TeacherDashboardProps {
  userName: string;
  today: string;
  myClasses: { id: string; label: string; studentCount: number }[];
  todaySlots: { id: string; startTime: string; subjectName: string; classLabel: string }[];
  rate: number;
  overallRate: number;
  totalStudents: number;
  upcomingExams: { id: string; name: string; startDate: string }[];
}

export function TeacherDashboard({ userName, today, myClasses, todaySlots, rate, overallRate, totalStudents, upcomingExams }: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg font-semibold text-primary mb-1">Good morning, {userName.split(" ")[0]}</h2>
          <p className="text-body-md text-on-surface-variant">Here&apos;s your teaching overview for {formatDate(today)}.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" asChild>
            <Link href="/leave">
              <Icon name="event_busy" className="h-4 w-4" /> Request Leave
            </Link>
          </Button>
          <Button asChild>
            <Link href="/attendance/mark">
              <Icon name="how_to_reg" className="h-4 w-4" /> Mark Attendance
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={String(myClasses.length)} icon="school" />
        <StatCard label="Total Students" value={String(totalStudents)} icon="group" />
        <StatCard label="Today's Attendance" value={`${rate}%`} icon="fact_check" trend={{ direction: "flat", label: `${overallRate}% overall` }} />
        <StatCard label="Upcoming Exams" value={String(upcomingExams.length)} icon="quiz" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-6">Today&apos;s Timetable</h3>
          {todaySlots.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No periods scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todaySlots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-4 p-3 rounded-lg border border-outline-variant/40">
                  <div className="w-16 text-label-sm text-on-surface-variant shrink-0">{slot.startTime}</div>
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-on-surface">{slot.subjectName}</p>
                    <p className="text-label-sm text-on-surface-variant">{slot.classLabel}</p>
                  </div>
                  <Icon name="menu_book" className="h-4 w-4 text-on-surface-variant" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">My Classes</h3>
          <div className="space-y-3">
            {myClasses.map((cls) => (
              <Link
                key={cls.id}
                href="/classes"
                className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
              >
                <span className="text-body-md font-medium text-on-surface">{cls.label}</span>
                <span className="text-label-sm text-on-surface-variant">{cls.studentCount} students</span>
              </Link>
            ))}
            {myClasses.length === 0 && <p className="text-body-md text-on-surface-variant">No classes assigned yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
