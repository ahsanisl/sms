import * as classService from "@/services/class.service";
import * as attendanceService from "@/services/attendance.service";
import { requireSession } from "@/lib/tenancy";
import { AttendanceDashboardClient } from "@/app/(app)/attendance/attendance-dashboard-client";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AttendancePage() {
  const session = await requireSession();

  const allClasses = await classService.listClasses(session);
  const scopedClasses =
    session.role === "teacher"
      ? allClasses.filter((c) => c.classTeacherId === session.teacherId && c.status === "active")
      : allClasses.filter((c) => c.status === "active");

  const attendance = await attendanceService.listByClasses(session, scopedClasses.map((c) => c.id));

  const today = isoDate(new Date());
  const todayRecords = attendance.filter((a) => a.date === today);

  const present = todayRecords.filter((r) => r.status === "present").length;
  const absent = todayRecords.filter((r) => r.status === "absent").length;
  const leave = todayRecords.filter((r) => r.status === "leave" || r.status === "late").length;
  const rate = todayRecords.length
    ? Math.round(((present + todayRecords.filter((r) => r.status === "late").length) / todayRecords.length) * 100)
    : 0;

  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(isoDate(d));
  }
  const trend = last7Days.map((date) => {
    const records = attendance.filter((a) => a.date === date);
    const p = records.filter((r) => r.status === "present" || r.status === "late").length;
    return { date: formatShort(date), rate: records.length ? Math.round((p / records.length) * 100) : 0 };
  });

  const classBreakdown = scopedClasses.map((cls) => {
    const records = todayRecords.filter((r) => r.classId === cls.id);
    const p = records.filter((r) => r.status === "present" || r.status === "late").length;
    return {
      classId: cls.id,
      classLabel: `${cls.grade}-${cls.section}`,
      total: records.length,
      present: p,
      absent: records.filter((r) => r.status === "absent").length,
      rate: records.length ? Math.round((p / records.length) * 100) : 0,
    };
  });

  return (
    <AttendanceDashboardClient
      today={today}
      isTeacher={session.role === "teacher"}
      rate={rate}
      present={present}
      absent={absent}
      leave={leave}
      trend={trend}
      classBreakdown={classBreakdown}
    />
  );
}

function formatShort(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
