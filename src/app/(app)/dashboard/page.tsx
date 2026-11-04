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
import * as leaveService from "@/services/leave.service";
import * as admissionService from "@/services/admission.service";
import * as homeworkService from "@/services/homework.service";
import { requireSession, type AuthSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { moduleForPath } from "@/lib/permissions";
import { QUICK_ACTIONS, type NavItem } from "@/lib/nav-config";
import { getViewCampusId } from "@/services/scope";
import { ParentDashboardClient } from "@/app/(app)/dashboard/parent-dashboard-client";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";
import { PlatformAdminDashboard } from "@/components/dashboard/platform-admin-dashboard";
import type { DashboardEvent, DashboardTask } from "@/components/dashboard/widgets";
import type { TimetableDay } from "@/lib/types";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
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

const DAY_CODES: TimetableDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function todayDayCode(): TimetableDay | null {
  const code = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  return (DAY_CODES as string[]).includes(code) ? (code as TimetableDay) : null;
}

const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

const LEAVE_TYPE_LABEL: Record<string, string> = { sick: "Sick leave", casual: "Casual leave", annual: "Annual leave", other: "Leave" };

/** Quick actions the role can actually complete — each filtered by the permission module its route belongs to. */
async function allowedQuickActions(session: AuthSession): Promise<NavItem[]> {
  const checks = await Promise.all(QUICK_ACTIONS.map(async (action) => {
    const routeModule = moduleForPath(action.href);
    return !routeModule || (await can(session, routeModule));
  }));
  return QUICK_ACTIONS.filter((_, i) => checks[i]);
}

/** Every permission module whose value decides whether a dashboard card links somewhere or a pending-task section is computed. */
async function permissionFlags(session: AuthSession) {
  const keys = ["students", "teachers", "attendance", "attendanceMark", "fees", "exams", "examsMarks", "leave", "admissions", "homework", "classes", "settingsCampuses"] as const;
  const values = await Promise.all(keys.map((k) => can(session, k)));
  return Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Record<(typeof keys)[number], boolean>;
}

export default async function DashboardPage() {
  const session = await requireSession();

  // The login page always lands here regardless of role, so this is the one
  // place that can reliably catch "school_owner whose school hasn't finished
  // /onboarding yet" for a REAL (Postgres-only) school — a server-side
  // backstop for AuthGuard's client-side redirect (which reads the same
  // flag from /api/me/permissions).
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
  const today = isoDate(new Date());
  const [children, classes, allAnnouncements, homework, subjects] = await Promise.all([
    studentService.listMyChildren(session),
    classService.listClasses(session),
    announcementService.listAnnouncements(session),
    homeworkService.listHomeworkForParent(session).catch(() => []),
    subjectService.listSubjects(session),
  ]);
  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));

  const announcements = allAnnouncements
    .filter((a) => a.audience === "all" || a.audience === "parents")
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 4)
    .map((a) => ({ id: a.id, title: a.title, publishedAt: a.publishedAt.toISOString(), important: a.priority === "important" }));

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

  const childNamesByClass = new Map<string, string[]>();
  for (const child of children) childNamesByClass.set(child.classId, [...(childNamesByClass.get(child.classId) ?? []), child.name.split(" ")[0]]);
  const homeworkDue: DashboardEvent[] = homework
    .filter((h) => h.dueDate >= today)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 5)
    .map((h) => ({
      id: h.id,
      date: h.dueDate,
      title: h.title,
      subtitle: [subjectById.get(h.subjectId), childNamesByClass.get(h.classId)?.join(", ")].filter(Boolean).join(" · "),
      badge: h.dueDate === today ? "Due today" : undefined,
      href: `/portal/homework/${h.id}`,
    }));

  return <ParentDashboardClient parentName={session.name} childRows={childRows} announcements={announcements} homeworkDue={homeworkDue} />;
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
      userName={session.name}
      totalActiveSchools={active.length}
      archivedSchools={rows.length - active.length}
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
  const today = isoDate(new Date());
  const quickActions = await allowedQuickActions(session);
  const teacherId = session.teacherId;
  if (!teacherId) {
    return <TeacherDashboard userName={session.name} today={today} myClasses={[]} todaySlots={[]} rate={0} overallRate={0} totalStudents={0} upcomingExams={[]} tasks={[]} quickActions={quickActions} isWorkingDay={false} />;
  }

  const perms = await permissionFlags(session);
  const [allClasses, allStudents, allSubjects, slots, config] = await Promise.all([
    classService.listClasses(session),
    perms.students ? studentService.listStudents(session) : Promise.resolve([]),
    subjectService.listSubjects(session),
    timetableService.listSlotsForTeacher(session, teacherId),
    timetableService.getConfig(session),
  ]);
  const subjectById = new Map(allSubjects.map((s) => [s.id, s.name]));
  const myClassList = allClasses.filter((c) => c.classTeacherId === teacherId && c.status === "active");
  const myClassIds = new Set(myClassList.map((c) => c.id));
  const myStudents = allStudents.filter((s) => myClassIds.has(s.classId) && s.status === "active");
  const classLabel = (classId: string) => {
    const cls = allClasses.find((c) => c.id === classId);
    return cls ? `${cls.grade}-${cls.section}` : "—";
  };

  const attendance = perms.attendance ? await attendanceService.listByClasses(session, [...myClassIds]) : [];
  const todayRecords = attendance.filter((a) => a.date === today);
  const rate = attendanceRate(todayRecords);
  const overallRate = attendanceRate(attendance);

  const dayCode = todayDayCode();
  const isWorkingDay = !!dayCode && config.workingDays.includes(dayCode);
  const todaySlots = slots
    .filter((s) => s.day === dayCode)
    .sort((a, b) => a.period - b.period)
    .map((s) => {
      const period = config.periods.find((p) => p.period === s.period);
      return {
        id: s.id,
        period: s.period,
        startTime: period?.startTime ?? s.startTime,
        endTime: period?.endTime ?? s.endTime,
        subjectName: subjectById.get(s.subjectId) ?? "—",
        classLabel: classLabel(s.classId),
      };
    });

  const [exams, myLeave, homework] = await Promise.all([
    perms.exams ? examService.listExams(session) : Promise.resolve([]),
    perms.leave ? leaveService.listMyLeaveRequests(session).catch(() => []) : Promise.resolve([]),
    perms.homework ? homeworkService.listHomework(session) : Promise.resolve([]),
  ]);
  const myExams = exams.filter((e) => e.classIds.some((id) => myClassIds.has(id)));
  const upcomingExams = myExams
    .filter((e) => e.status !== "completed" && e.endDate >= today)
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1))
    .slice(0, 5)
    .map((e) => ({ id: e.id, name: e.name, startDate: e.startDate, ongoing: e.status === "ongoing" }));

  const unmarkedClasses = isWorkingDay ? myClassList.filter((c) => !todayRecords.some((r) => r.classId === c.id)) : [];
  const examsAwaitingMarks = myExams.filter((e) => e.status !== "scheduled" && !e.resultsPublished);
  const myHomeworkDueSoon = homework.filter((h) => h.teacherId === teacherId && h.dueDate >= today && h.dueDate <= addDays(today, 3));

  const tasks: DashboardTask[] = [
    {
      id: "attendance",
      icon: "how_to_reg",
      label: "Attendance not marked today",
      count: unmarkedClasses.length,
      description: unmarkedClasses.map((c) => `${c.grade}-${c.section}`).join(", "),
      href: perms.attendanceMark ? "/attendance/mark" : undefined,
      tone: "error",
    },
    {
      id: "marks",
      icon: "edit_note",
      label: "Exams awaiting results",
      count: examsAwaitingMarks.length,
      description: examsAwaitingMarks.map((e) => e.name).join(", "),
      href: perms.examsMarks ? "/exams/marks" : undefined,
      tone: "warning",
    },
    {
      id: "homework",
      icon: "assignment",
      label: "Homework due in the next 3 days",
      count: myHomeworkDueSoon.length,
      description: myHomeworkDueSoon.map((h) => h.title).join(", "),
      href: "/homework",
      tone: "info",
    },
    {
      id: "leave",
      icon: "event_busy",
      label: "Leave requests awaiting approval",
      count: myLeave.filter((l) => l.status === "pending").length,
      href: "/leave",
      tone: "info",
    },
  ];

  return (
    <TeacherDashboard
      userName={session.name}
      today={today}
      myClasses={myClassList.map((c) => ({
        id: c.id,
        label: `${c.grade}-${c.section}`,
        studentCount: allStudents.filter((s) => s.classId === c.id && s.status === "active").length,
        markedToday: todayRecords.some((r) => r.classId === c.id),
        todayRate: attendanceRate(todayRecords.filter((r) => r.classId === c.id)),
      }))}
      todaySlots={todaySlots}
      rate={rate}
      overallRate={overallRate}
      totalStudents={myStudents.length}
      upcomingExams={upcomingExams}
      tasks={tasks}
      quickActions={quickActions}
      isWorkingDay={isWorkingDay}
    />
  );
}

async function renderAccountantDashboard(session: AuthSession) {
  const perms = await permissionFlags(session);
  const [campuses, students, viewCampusId, quickActions] = await Promise.all([
    campusService.listCampusesInView(session),
    perms.students ? studentService.listStudents(session, { inView: true }) : Promise.resolve([]),
    getViewCampusId(session),
    allowedQuickActions(session),
  ]);
  const studentIds = students.map((s) => s.id);
  const [invoices, payments] = await Promise.all([
    perms.fees ? feeService.listInvoicesForStudents(session, studentIds) : Promise.resolve([]),
    perms.fees ? feeService.listPaymentsForStudents(session, studentIds) : Promise.resolve([]),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const currentMonthInvoices = invoices.filter((i) => i.month === currentMonthLabel);
  const billed = currentMonthInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const collected = currentMonthInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const overdueCount = overdueInvoices.length;
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

  const tasks: DashboardTask[] = [
    {
      id: "overdue",
      icon: "warning",
      label: "Overdue invoices",
      count: overdueCount,
      description: `Rs. ${overdueInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0).toLocaleString("en-PK")} outstanding`,
      href: "/fees/reports",
      tone: "error",
    },
    {
      id: "unpaid",
      icon: "receipt_long",
      label: `Unpaid invoices for ${currentMonthLabel}`,
      count: currentMonthInvoices.filter((i) => i.status === "unpaid").length,
      href: "/fees",
      tone: "warning",
    },
    {
      id: "partial",
      icon: "pending",
      label: "Partially paid invoices",
      count: currentMonthInvoices.filter((i) => i.status === "partial").length,
      href: "/fees",
      tone: "info",
    },
  ];

  return (
    <AccountantDashboard
      userName={session.name}
      isAllCampuses={!viewCampusId}
      billed={billed}
      collected={collected}
      outstanding={outstanding}
      overdueCount={overdueCount}
      totalCollectedAllTime={totalCollectedAllTime}
      feeByCampus={feeByCampus}
      recentPayments={recentPayments}
      tasks={tasks}
      quickActions={quickActions}
    />
  );
}

async function renderAdminDashboard(session: AuthSession) {
  const perms = await permissionFlags(session);
  const [campuses, students, teachers, classes, viewCampusId, quickActions, config] = await Promise.all([
    campusService.listCampusesInView(session),
    // Custom roles can lack any of these — each read is skipped (and its cards hidden) without the permission.
    perms.students ? studentService.listStudents(session, { inView: true }) : Promise.resolve([]),
    teacherService.listTeachers(session, { inView: true }),
    classService.listClasses(session, { inView: true }),
    getViewCampusId(session),
    allowedQuickActions(session),
    timetableService.getConfig(session),
  ]);
  const activeStudents = students.filter((s) => s.status === "active");
  const activeTeachers = teachers.filter((t) => t.status === "active");
  const activeClasses = classes.filter((c) => c.status === "active");
  const classIds = activeClasses.map((c) => c.id);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));

  const attendance = perms.attendance ? await attendanceService.listByClasses(session, classIds) : [];
  const days = last7Days();
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];
  const todayRecords = attendance.filter((a) => a.date === today);
  const yesterdayRecords = attendance.filter((a) => a.date === yesterday);
  const todayRate = attendanceRate(todayRecords);
  const yesterdayRate = attendanceRate(yesterdayRecords);
  const attendanceTrend = days.map((date) => ({ date: formatShort(date), rate: attendanceRate(attendance.filter((a) => a.date === date)) }));
  const markedClassIds = new Set(todayRecords.map((r) => r.classId));
  const dayCode = todayDayCode();
  const isWorkingDay = !!dayCode && config.workingDays.includes(dayCode);

  const studentIds = students.map((s) => s.id);
  const [invoices, payments] = await Promise.all([
    perms.fees ? feeService.listInvoicesForStudents(session, studentIds) : Promise.resolve([]),
    perms.fees ? feeService.listPaymentsForStudents(session, studentIds) : Promise.resolve([]),
  ]);
  const currentMonthInvoices = invoices.filter((i) => i.month === currentMonthLabel);
  const billed = currentMonthInvoices.reduce((s, i) => s + i.totalAmount, 0);
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
          students: activeStudents.filter((s) => s.campusId === campus.id).length,
          teachers: activeTeachers.filter((t) => t.campusId === campus.id).length,
          attendanceRate: attendanceRate(campusTodayRecords),
          collected: campusInvoices.reduce((s, i) => s + i.paidAmount, 0),
          outstanding: campusInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
        };
      })
    : [];

  // Marked classes with the lowest attendance first — the ones worth a follow-up.
  const classAttendance = activeClasses
    .filter((cls) => markedClassIds.has(cls.id))
    .map((cls) => ({ id: cls.id, label: `${cls.grade}-${cls.section}`, rate: attendanceRate(todayRecords.filter((r) => r.classId === cls.id)) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 6);

  const latestPayments = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3)
    .map((p) => ({ id: p.id, amount: p.amount, date: p.date, studentName: studentById.get(p.studentId)?.name ?? null }));
  const latestStudent = [...students].sort((a, b) => ((a.admissionDate ?? "") < (b.admissionDate ?? "") ? 1 : -1))[0];
  const latestStudentActivity = latestStudent
    ? {
        id: latestStudent.id,
        name: latestStudent.name,
        classLabel: (() => {
          const cls = classes.find((c) => c.id === latestStudent.classId);
          return cls ? `${cls.grade}-${cls.section}` : "—";
        })(),
        admissionDate: latestStudent.admissionDate ?? today,
      }
    : undefined;
  const absentToday = todayRecords.filter((r) => r.status === "absent").length;

  // Pending work — each source only queried when the role holds its permission.
  const [exams, leaveRequests, corrections, inquiries] = await Promise.all([
    perms.exams ? examService.listExams(session, { inView: true }) : Promise.resolve([]),
    perms.leave ? leaveService.listLeaveRequests(session, { inView: true }) : Promise.resolve([]),
    perms.attendance ? attendanceService.listCorrections(session, { inView: true }) : Promise.resolve([]),
    perms.admissions ? admissionService.listInquiries(session, { inView: true }) : Promise.resolve([]),
  ]);
  const unmarkedClasses = isWorkingDay ? activeClasses.filter((c) => !markedClassIds.has(c.id)) : [];
  const openInquiries = inquiries.filter((i) => i.stage !== "admitted" && i.stage !== "rejected");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const unpublishedExams = exams.filter((e) => e.status === "completed" && !e.resultsPublished);
  const pendingLeave = leaveRequests.filter((l) => l.status === "pending");

  const tasks: DashboardTask[] = [
    {
      id: "leave",
      icon: "event_busy",
      label: "Leave requests to review",
      count: pendingLeave.length,
      description: pendingLeave.map((l) => teacherById.get(l.teacherId)?.name).filter(Boolean).slice(0, 3).join(", "),
      href: "/leave",
      tone: "warning",
    },
    { id: "corrections", icon: "history", label: "Attendance corrections to review", count: corrections.filter((c) => c.status === "pending").length, href: "/attendance/corrections", tone: "warning" },
    {
      id: "unmarked",
      icon: "how_to_reg",
      label: "Classes without attendance today",
      count: unmarkedClasses.length,
      description: unmarkedClasses.slice(0, 6).map((c) => `${c.grade}-${c.section}`).join(", "),
      href: perms.attendanceMark ? "/attendance/mark" : "/attendance",
      tone: "error",
    },
    { id: "inquiries", icon: "how_to_reg", label: "Open admission inquiries", count: openInquiries.length, href: "/admissions", tone: "info" },
    {
      id: "overdue",
      icon: "warning",
      label: "Overdue fee invoices",
      count: overdueInvoices.length,
      description: `Rs. ${overdueInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0).toLocaleString("en-PK")} outstanding`,
      href: "/fees/reports",
      tone: "error",
    },
    { id: "results", icon: "quiz", label: "Exam results awaiting publication", count: unpublishedExams.length, description: unpublishedExams.map((e) => e.name).join(", "), href: "/exams", tone: "info" },
  ];

  const horizon = addDays(today, 30);
  const examEvents: DashboardEvent[] = exams
    .filter((e) => e.status !== "completed" && e.endDate >= today && e.startDate <= horizon)
    .map((e) => ({
      id: `exam-${e.id}`,
      date: e.startDate,
      title: e.name,
      subtitle: `${e.term} · ${e.classIds.length} class${e.classIds.length === 1 ? "" : "es"}`,
      badge: e.status === "ongoing" ? "Ongoing" : "Exam",
      href: "/exams",
    }));
  const leaveEvents: DashboardEvent[] = leaveRequests
    .filter((l) => l.status === "approved" && l.endDate >= today && l.startDate <= addDays(today, 14))
    .map((l) => ({
      id: `leave-${l.id}`,
      date: l.startDate < today ? today : l.startDate,
      title: `${teacherById.get(l.teacherId)?.name ?? "Teacher"} on leave`,
      subtitle: `${LEAVE_TYPE_LABEL[l.type] ?? "Leave"} · until ${formatShort(l.endDate)}`,
      badge: l.startDate <= today ? "Today" : undefined,
      href: "/leave",
    }));
  const upcomingEvents = [...examEvents, ...leaveEvents].sort((a, b) => (a.date > b.date ? 1 : -1)).slice(0, 6);

  return (
    <AdminDashboard
      userName={session.name}
      campusLabel={
        session.role === "campus_admin"
          ? (campuses.find((c) => c.id === session.campusId)?.name ?? "This Campus")
          : viewCampusId
            ? (campuses.find((c) => c.id === viewCampusId)?.name ?? "This Campus")
            : "All Campuses"
      }
      today={today}
      monthLabel={currentMonthLabel}
      totalStudents={activeStudents.length}
      totalTeachers={activeTeachers.length}
      todayRate={todayRate}
      yesterdayRate={yesterdayRate}
      classesMarked={markedClassIds.size}
      totalClasses={activeClasses.length}
      billed={billed}
      collected={collected}
      outstanding={outstanding}
      showFees={perms.fees}
      showStudents={perms.students}
      showTeachers={perms.teachers}
      showAttendance={perms.attendance}
      showCampusGlance={showCampusGlance}
      campusGlance={campusGlance}
      attendanceTrend={attendanceTrend}
      feeByCampus={feeByCampus}
      classAttendance={classAttendance}
      latestStudentActivity={latestStudentActivity}
      latestPayments={latestPayments}
      absentToday={absentToday}
      tasks={tasks}
      upcomingEvents={upcomingEvents}
      quickActions={quickActions}
      links={{
        students: perms.students ? "/students" : undefined,
        teachers: perms.teachers ? "/teachers" : undefined,
        attendance: perms.attendance ? "/attendance" : undefined,
        fees: perms.fees ? "/fees" : undefined,
        feeReports: perms.fees ? "/fees/reports" : undefined,
        classes: perms.classes ? "/classes" : undefined,
        campuses: perms.settingsCampuses ? "/settings/campuses" : undefined,
      }}
    />
  );
}
