"use client";

import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session-context";
import { useStudents, useAttendanceStore, useExamsStore, useTimetableConfig } from "@/lib/store/hooks";
import { CLASSES, classLabel, subjectName } from "@/lib/mock/reference-data";
import { timetableForTeacher } from "@/lib/mock/timetable";
import { SCHOOL_DAYS, attendanceRate } from "@/lib/mock/attendance";
import { formatDate } from "@/lib/format";

export function TeacherDashboard() {
  const { user } = useSession();
  const { students } = useStudents();
  const { attendance } = useAttendanceStore();
  const { exams } = useExamsStore();
  const { workingDays, periods } = useTimetableConfig();

  const myClassList = CLASSES.filter((c) => user && (c.classTeacherId === user.id || timetableForTeacher(user.id).some((t) => t.classId === c.id)));
  const myStudents = students.filter((s) => myClassList.some((c) => c.id === s.classId));

  const today = SCHOOL_DAYS[SCHOOL_DAYS.length - 1];
  const todayDow = workingDays[(new Date(today).getDay() + 6) % 7] ?? "Mon";
  const todaySlots = user
    ? timetableForTeacher(user.id)
        .filter((t) => t.day === todayDow)
        .sort((a, b) => a.period - b.period)
    : [];

  const myAttendance = attendance.filter((a) => myClassList.some((c) => c.id === a.classId));
  const todayRecords = myAttendance.filter((a) => a.date === today);
  const overallRate = attendanceRate(myAttendance);
  const todayRate = attendanceRate(todayRecords);

  const upcomingExams = exams
    .filter((e) => e.status === "scheduled" && myClassList.some((c) => e.classIds.includes(c.id)))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg font-semibold text-primary mb-1">Good morning, {user?.name.split(" ")[0]}</h2>
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
        <StatCard label="My Classes" value={String(myClassList.length)} icon="school" />
        <StatCard label="Total Students" value={String(myStudents.length)} icon="group" />
        <StatCard label="Today's Attendance" value={`${todayRate}%`} icon="fact_check" trend={{ direction: "flat", label: `${overallRate}% overall` }} />
        <StatCard label="Upcoming Exams" value={String(upcomingExams.length)} icon="quiz" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-6">Today&apos;s Timetable</h3>
          {todaySlots.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No periods scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todaySlots.map((slot) => {
                const period = periods.find((p) => p.period === slot.period);
                return (
                  <div key={slot.id} className="flex items-center gap-4 p-3 rounded-lg border border-outline-variant/40">
                    <div className="w-16 text-label-sm text-on-surface-variant shrink-0">{period?.startTime}</div>
                    <div className="flex-1">
                      <p className="text-body-md font-medium text-on-surface">{subjectName(slot.subjectId)}</p>
                      <p className="text-label-sm text-on-surface-variant">{classLabel(slot.classId)}</p>
                    </div>
                    <Icon name="menu_book" className="h-4 w-4 text-on-surface-variant" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">My Classes</h3>
          <div className="space-y-3">
            {myClassList.map((cls) => (
              <Link
                key={cls.id}
                href="/classes"
                className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
              >
                <span className="text-body-md font-medium text-on-surface">{classLabel(cls)}</span>
                <span className="text-label-sm text-on-surface-variant">
                  {students.filter((s) => s.classId === cls.id).length} students
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
