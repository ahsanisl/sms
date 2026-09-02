import { redirect } from "next/navigation";
import * as studentService from "@/services/student.service";
import * as teacherService from "@/services/teacher.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as subjectService from "@/services/subject.service";
import * as attendanceService from "@/services/attendance.service";
import * as feeService from "@/services/fee.service";
import * as examService from "@/services/exam.service";
import * as timetableService from "@/services/timetable.service";
import * as announcementService from "@/services/announcement.service";
import * as schoolService from "@/services/school.service";
import { requireSession, type AuthSession } from "@/lib/tenancy";
import { ParentDashboardClient } from "@/app/(app)/dashboard/parent-dashboard-client";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";
import { PlatformAdminDashboard } from "@/components/dashboard/platform-admin-dashboard";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(isoDate(d));
  }
  return days;
}

function formatShort(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function attendanceRate(records: { status: string }[]) {
  return records.length ? Math.round((records.filter((r) => r.status === "present" || r.status === "late").length / records.length) * 100) : 0;
}

const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default async function DashboardPage() {
  const session = await requireSession();

  // The login page always lands here regardless of role, so this is the one
  // place that can reliably catch "school_owner whose school hasn't finished
  // /onboarding yet" for a REAL (Postgres-only) school — AuthGuard's client-
  // side equivalent check only knows about the mock store's schools, so it
  // silently no-ops for one created through the real Platform Admin console.
  if (session.role === "school_owner") {
    const school = await schoolService.getMySchool(session);
    if (!school.onboardingComplete) redirect("/onboarding");
  }

  if (session.role === "parent") return renderParentDashboard(session);
  if (session.role === "platform_admin") return renderPlatformAdminDashboard(session);
  if (session.role === "teacher") return renderTeacherDashboard(session);
  if (session.role === "accountant") return renderAccountantDashboard(session);
  return renderAdminDashboard(session);
}

async function renderParentDashboard(session: AuthSession) {
  const [children, classes, allAnnouncements] = await Promise.all([
    studentService.listMyChildren(session),
    classService.listClasses(session),
    announcementService.listAnnouncements(session),
  ]);
  const classById = new Map(classes.map((c) => [c.id, c]));

  const announcements = allAnnouncements
    .filter((a) => a.audience === "all" || a.audience === "parents")
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 4)
    .map((a) => ({ id: a.id, title: a.title, publishedAt: a.publishedAt.toISOString() }));

  const childRows = await Promise.all(
    children.map(async (child) => {
      const [attendance, invoices] = await Promise.all([
        attendanceService.listByStudent(session, child.id),
        feeService.listInvoicesForStudent(session, child.id),
      ]);
      const rate = attendanceRate(attendance);
      const currentInvoice = invoices.find((i) => i.month === currentMonthLabel);
      const feesDue = currentInvoice ? currentInvoice.totalAmount - currentInvoice.paidAmount : 0;
      const cls = classById.get(child.classId);
      return {
        id: child.id,
        name: child.name,
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        rollNumber: child.rollNumber,
        attendanceRate: rate,
        feesDue,
      };
    }),
  );

  return <ParentDashboardClient parentName={session.name} childRows={childRows} announcements={announcements} />;
}

async function renderPlatformAdminDashboard(session: AuthSession) {
  const rows = await schoolService.listAllSchoolsWithStats(session);
  const active = rows.filter((r) => r.school.status === "active");
  const totals = active.reduce(
    (acc, r) => ({
      campuses: acc.campuses + r.stats.campuses,
      students: acc.students + r.stats.students,
      collected: acc.collected + r.stats.collected,
    }),
    { campuses: 0, students: 0, collected: 0 },
  );

  return (
    <PlatformAdminDashboard
      totalActiveSchools={active.length}
      totals={totals}
      schools={active.map((r) => ({
        id: r.school.id,
        name: r.school.name,
        logoEmoji: r.school.logoEmoji,
        campuses: r.stats.campuses,
        students: r.stats.students,
        teachers: r.stats.teachers,
        collected: r.stats.collected,
        outstanding: r.stats.outstanding,
      }))}
    />
  );
}

async function renderTeacherDashboard(session: AuthSession) {
  const teacherId = session.teacherId;
  if (!teacherId) return <TeacherDashboard userName={session.name} today={isoDate(new Date())} myClasses={[]} todaySlots={[]} rate={0} overallRate={0} totalStudents={0} upcomingExams={[]} />;

  const [allClasses, allStudents, allSubjects, slots, config] = await Promise.all([
    classService.listClasses(session),
    studentService.listStudents(session),
    subjectService.listSubjects(session),
    timetableService.listSlotsForTeacher(session, teacherId),
    timetableService.getConfig(session),
  ]);
  const subjectById = new Map(allSubjects.map((s) => [s.id, s.name]));
  const myClassList = allClasses.filter((c) => c.classTeacherId === teacherId && c.status === "active");
  const myClassIds = new Set(myClassList.map((c) => c.id));
  const myStudents = allStudents.filter((s) => myClassIds.has(s.classId));

  const attendance = await attendanceService.listByClasses(session, [...myClassIds]);
  const today = isoDate(new Date());
  const todayRecords = attendance.filter((a) => a.date === today);
  const rate = attendanceRate(todayRecords);
  const overallRate = attendanceRate(attendance);

  const todayDow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  const todaySlots = slots
    .filter((s) => s.day === todayDow)
    .sort((a, b) => a.period - b.period)
    .map((s) => {
      const period = config.periods.find((p) => p.period === s.period);
      const cls = allClasses.find((c) => c.id === s.classId);
      return {
        id: s.id,
        startTime: period?.startTime ?? s.startTime,
        subjectName: subjectById.get(s.subjectId) ?? "—",
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
      };
    });

  const exams = await examService.listExams(session);
  const upcomingExams = exams
    .filter((e) => e.status === "scheduled" && e.classIds.some((id) => myClassIds.has(id)))
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1))
    .slice(0, 3)
    .map((e) => ({ id: e.id, name: e.name, startDate: e.startDate }));

  return (
    <TeacherDashboard
      userName={session.name}
      today={today}
      myClasses={myClassList.map((c) => ({ id: c.id, label: `${c.grade}-${c.section}`, studentCount: allStudents.filter((s) => s.classId === c.id).length }))}
      todaySlots={todaySlots}
      rate={rate}
      overallRate={overallRate}
      totalStudents={myStudents.length}
      upcomingExams={upcomingExams}
    />
  );
}

async function renderAccountantDashboard(session: AuthSession) {
  const [campuses, students] = await Promise.all([campusService.listCampuses(session), studentService.listStudents(session)]);
  const studentIds = students.map((s) => s.id);
  const [invoices, payments] = await Promise.all([
    feeService.listInvoicesForStudents(session, studentIds),
    feeService.listPaymentsForStudents(session, studentIds),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const currentMonthInvoices = invoices.filter((i) => i.month === currentMonthLabel);
  const collected = currentMonthInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const overdueCount = currentMonthInvoices.filter((i) => i.status === "overdue").length;
  const totalCollectedAllTime = payments.reduce((s, p) => s + p.amount, 0);

  const feeByCampus = campuses.map((campus) => {
    const campusInvoices = currentMonthInvoices.filter((i) => studentById.get(i.studentId)?.campusId === campus.id);
    return {
      campus: campus.name.replace(" Campus", ""),
      collected: campusInvoices.reduce((s, i) => s + i.paidAmount, 0),
      outstanding: campusInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
    };
  });

  const recentPayments = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)
    .map((p) => ({ id: p.id, studentName: studentById.get(p.studentId)?.name ?? "—", method: p.method, amount: p.amount, date: p.date }));

  return (
    <AccountantDashboard
      userName={session.name}
      isAllCampuses={session.role !== "campus_admin"}
      collected={collected}
      outstanding={outstanding}
      overdueCount={overdueCount}
      totalCollectedAllTime={totalCollectedAllTime}
      feeByCampus={feeByCampus}
      recentPayments={recentPayments}
    />
  );
}

async function renderAdminDashboard(session: AuthSession) {
  const [campuses, students, teachers, classes] = await Promise.all([
    campusService.listCampuses(session),
    studentService.listStudents(session),
    teacherService.listTeachers(session),
    classService.listClasses(session),
  ]);
  const activeClasses = classes.filter((c) => c.status === "active");
  const classIds = activeClasses.map((c) => c.id);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const attendance = await attendanceService.listByClasses(session, classIds);
  const days = last7Days();
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];
  const todayRecords = attendance.filter((a) => a.date === today);
  const yesterdayRecords = attendance.filter((a) => a.date === yesterday);
  const todayRate = attendanceRate(todayRecords);
  const yesterdayRate = attendanceRate(yesterdayRecords);
  const attendanceTrend = days.map((date) => ({ date: formatShort(date), rate: attendanceRate(attendance.filter((a) => a.date === date)) }));

  const studentIds = students.map((s) => s.id);
  const invoices = await feeService.listInvoicesForStudents(session, studentIds);
  const currentMonthInvoices = invoices.filter((i) => i.month === currentMonthLabel);
  const collected = currentMonthInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const feeByCampus = campuses.map((campus) => {
    const campusInvoices = currentMonthInvoices.filter((i) => studentById.get(i.studentId)?.campusId === campus.id);
    return {
      campus: campus.name.replace(" Campus", ""),
      collected: campusInvoices.reduce((s, i) => s + i.paidAmount, 0),
      outstanding: campusInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
    };
  });

  const showCampusGlance = session.role === "school_owner" && campuses.length > 1;
  const campusGlance = showCampusGlance
    ? campuses.map((campus) => {
        const campusClassIds = new Set(activeClasses.filter((c) => c.campusId === campus.id).map((c) => c.id));
        const campusTodayRecords = todayRecords.filter((a) => campusClassIds.has(a.classId));
        const campusInvoices = currentMonthInvoices.filter((i) => studentById.get(i.studentId)?.campusId === campus.id);
        return {
          id: campus.id,
          name: campus.name,
          students: students.filter((s) => s.campusId === campus.id).length,
          teachers: teachers.filter((t) => t.campusId === campus.id).length,
          attendanceRate: attendanceRate(campusTodayRecords),
          collected: campusInvoices.reduce((s, i) => s + i.paidAmount, 0),
          outstanding: campusInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
        };
      })
    : [];

  const classAttendance = activeClasses
    .map((cls) => ({ id: cls.id, label: `${cls.grade}-${cls.section}`, rate: attendanceRate(todayRecords.filter((r) => r.classId === cls.id)) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const payments = await feeService.listPaymentsForStudents(session, studentIds);
  const latestPayments = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 2)
    .map((p) => ({ id: p.id, amount: p.amount, date: p.date }));
  const latestStudent = [...students].sort((a, b) => ((a.admissionDate ?? "") < (b.admissionDate ?? "") ? 1 : -1))[0];
  const latestStudentActivity = latestStudent
    ? {
        name: latestStudent.name,
        classLabel: (() => {
          const cls = classes.find((c) => c.id === latestStudent.classId);
          return cls ? `${cls.grade}-${cls.section}` : "—";
        })(),
        admissionDate: latestStudent.admissionDate ?? today,
      }
    : undefined;
  const absentToday = todayRecords.filter((r) => r.status === "absent").length;

  const exams = await examService.listExams(session);
  const upcomingExams = exams
    .filter((e) => e.status === "scheduled")
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1))
    .slice(0, 3)
    .map((e) => ({ id: e.id, name: e.name, startDate: e.startDate }));

  return (
    <AdminDashboard
      userName={session.name}
      campusLabel={session.role === "campus_admin" ? (campuses.find((c) => c.id === session.campusId)?.name ?? "This Campus") : "All Campuses"}
      today={today}
      totalStudents={students.length}
      totalTeachers={teachers.length}
      todayRate={todayRate}
      yesterdayRate={yesterdayRate}
      collected={collected}
      outstanding={outstanding}
      showCampusGlance={showCampusGlance}
      campusGlance={campusGlance}
      attendanceTrend={attendanceTrend}
      feeByCampus={feeByCampus}
      classAttendance={classAttendance}
      latestStudentActivity={latestStudentActivity}
      latestPayments={latestPayments}
      absentToday={absentToday}
      upcomingExams={upcomingExams}
    />
  );
}
