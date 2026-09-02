import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as attendanceService from "@/services/attendance.service";
import { requireSession } from "@/lib/tenancy";
import { AttendanceReportsClient } from "@/app/(app)/attendance/reports/reports-client";

const COLORS = { present: "#4648d4", absent: "#ba1a1a", leave: "#75777d", late: "#d97706" };

export default async function AttendanceReportsPage() {
  const session = await requireSession();
  const [campuses, classes] = await Promise.all([campusService.listCampuses(session), classService.listClasses(session)]);
  const activeClasses = classes.filter((c) => c.status === "active");
  const campusById = new Map(campuses.map((c) => [c.id, c]));

  const attendance = await attendanceService.listByClasses(session, activeClasses.map((c) => c.id));

  const distribution = (["present", "absent", "leave", "late"] as const).map((status) => ({
    name: status[0].toUpperCase() + status.slice(1),
    value: attendance.filter((a) => a.status === status).length,
    color: COLORS[status],
  }));

  const totalMarked = attendance.length;
  const presentTotal = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const overallRate = totalMarked ? Math.round((presentTotal / totalMarked) * 100) : 0;

  const rows = activeClasses.map((cls) => {
    const records = attendance.filter((a) => a.classId === cls.id);
    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    return {
      classId: cls.id,
      classLabel: `${cls.grade}-${cls.section}`,
      campusId: cls.campusId,
      campusName: campusById.get(cls.campusId)?.name ?? "—",
      total: records.length,
      present,
      absent: records.filter((r) => r.status === "absent").length,
      rate: records.length ? Math.round((present / records.length) * 100) : 0,
    };
  });

  return (
    <AttendanceReportsClient
      rows={rows}
      campuses={campuses.filter((c) => c.status === "active")}
      isAllCampuses={campuses.length > 1 && session.role !== "campus_admin"}
      distribution={distribution}
      overallRate={overallRate}
      totalMarked={totalMarked}
      classCount={activeClasses.length}
    />
  );
}
