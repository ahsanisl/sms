import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as attendanceService from "@/services/attendance.service";
import * as feeService from "@/services/fee.service";
import * as examService from "@/services/exam.service";
import * as announcementService from "@/services/announcement.service";
import { requireSession, type AuthSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { attendanceRate } from "@/lib/attendance";
import { formatCompactPKR, formatDate, timeAgo } from "@/lib/format";
import { NotificationsClient, type NotificationItem } from "@/app/(app)/notifications/notifications-client";

const LOW_ATTENDANCE_THRESHOLD = 80;

/**
 * Derived, not stored: built per request from the viewer's own scoped data
 * (campus-scoped for staff, own children for a parent). Each section is
 * only included for roles that can already see that data elsewhere, so this
 * page never reveals more than the rest of the app does.
 */
export default async function NotificationsPage() {
  const session = await requireSession();
  const items = session.schoolId ? await buildItems(session) : [];
  return <NotificationsClient items={items} />;
}

async function buildItems(session: AuthSession): Promise<NotificationItem[]> {
  const isParent = session.role === "parent";
  const [canStudents, canAttendance, canFees, canExams] = await Promise.all([
    can(session.role, "students"),
    can(session.role, "attendance"),
    can(session.role, "fees"),
    can(session.role, "exams"),
  ]);

  const [students, classes] = await Promise.all([
    isParent ? studentService.listMyChildren(session) : canStudents ? studentService.listStudents(session, { inView: true }) : Promise.resolve([]),
    classService.listClasses(session),
  ]);
  const activeStudents = students.filter((s) => s.status === "active");
  const studentById = new Map(students.map((s) => [s.id, s]));
  const classLabel = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? `${cls.grade}-${cls.section}` : "—";
  };

  const items: NotificationItem[] = [];

  // -- Attendance alerts --------------------------------------------------------
  if (isParent || canAttendance) {
    const records = isParent
      ? (await Promise.all(activeStudents.map((s) => attendanceService.listByStudent(session, s.id)))).flat()
      : await attendanceService.listByClasses(session, [...new Set(activeStudents.map((s) => s.classId))]);
    activeStudents
      .map((s) => ({ s, rate: attendanceRate(records.filter((r) => r.studentId === s.id)) }))
      .filter(({ rate }) => rate > 0 && rate < LOW_ATTENDANCE_THRESHOLD)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3)
      .forEach(({ s, rate }) =>
        items.push({
          id: `att-${s.id}`,
          kind: "attendance",
          title: "Attendance Alert",
          description: `${s.name} (${classLabel(s.classId)}) is at ${rate}% attendance, below ${LOW_ATTENDANCE_THRESHOLD}%.`,
          time: "This term",
        }),
      );
  }

  // -- Recent payments --------------------------------------------------------
  if (isParent || canFees) {
    const payments = isParent
      ? (await Promise.all(students.map((s) => feeService.listPaymentsForStudent(session, s.id)))).flat()
      : await feeService.listPaymentsForStudents(session, students.map((s) => s.id));
    [...payments]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3)
      .forEach((p) =>
        items.push({
          id: `pay-${p.id}`,
          kind: "fees",
          title: "Payment Recorded",
          description: `${formatCompactPKR(p.amount)} received for ${studentById.get(p.studentId)?.name ?? "a student"}.`,
          time: timeAgo(p.date),
        }),
      );
  }

  // -- Exams: published results + upcoming --------------------------------------------------------
  if (isParent) {
    const cards = await Promise.all(activeStudents.map((s) => examService.getResultCardData(session, s.id)));
    const published = new Map(cards.flatMap((c) => c.exams.map((e) => [e.id, e] as const)));
    [...published.values()]
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))
      .slice(0, 2)
      .forEach((e) => items.push({ id: `exam-${e.id}`, kind: "results", title: "Results Published", description: `${e.name} results are now available.`, time: formatDate(e.endDate) }));
  } else if (canExams) {
    const [exams, campuses] = await Promise.all([examService.listExams(session, { inView: true }), campusService.listCampuses(session)]);
    // Each campus runs its own copy of an exam — name the campus when this view spans several, or the items read as duplicates.
    const spansCampuses = new Set(exams.map((e) => e.campusId)).size > 1;
    const examName = (e: (typeof exams)[number]) => (spansCampuses ? `${e.name} (${campuses.find((c) => c.id === e.campusId)?.name ?? "Campus"})` : e.name);
    exams
      .filter((e) => e.resultsPublished)
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))
      .slice(0, 2)
      .forEach((e) => items.push({ id: `exam-${e.id}`, kind: "results", title: "Results Published", description: `${examName(e)} results are now available.`, time: formatDate(e.endDate) }));
    exams
      .filter((e) => e.status === "scheduled")
      .sort((a, b) => (a.startDate > b.startDate ? 1 : -1))
      .slice(0, 2)
      .forEach((e) => items.push({ id: `upcoming-${e.id}`, kind: "events", title: "Upcoming Exam", description: `${examName(e)} begins ${formatDate(e.startDate)}.`, time: formatDate(e.startDate) }));
  }

  // -- Announcements for this viewer's audience --------------------------------------------------------
  const audiences = isParent ? ["all", "parents"] : session.role === "teacher" ? ["all", "teachers"] : ["all", "teachers", "parents", "students"];
  const announcements = await announcementService.listAnnouncements(session, { inView: true });
  announcements
    .filter((a) => audiences.includes(a.audience))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 3)
    .forEach((a) =>
      items.push({
        id: `an-${a.id}`,
        kind: "events",
        title: a.title,
        description: a.author ? `Published by ${a.author}` : "School announcement",
        time: timeAgo(a.publishedAt.toISOString()),
      }),
    );

  return items;
}
