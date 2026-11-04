import type { PermissionModule, Role } from "@/lib/types";

export const PERMISSION_MODULE_LABEL: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  students: "Students",
  studentsManage: "Manage Students (edit/withdraw/transfer)",
  admissions: "Admissions",
  teachers: "Teachers",
  classes: "Classes & Sections",
  classesManage: "Manage Classes (edit/archive)",
  attendance: "Attendance (view/reports)",
  attendanceMark: "Mark Attendance",
  fees: "Fees & Finances",
  feesCollect: "Collect Payment",
  feesStructure: "Fee Structure",
  exams: "Exams & Results",
  examsCreate: "Create Exam",
  examsMarks: "Enter Marks",
  timetable: "Timetable",
  timetableBuilder: "Timetable Builder",
  announcements: "Announcements",
  announcementsCreate: "Create Announcement",
  leave: "Leave Management",
  syllabus: "Syllabus",
  syllabusManage: "Manage Syllabus (add/edit/reorder topics)",
  classwork: "Classwork",
  classworkCreate: "Post Classwork",
  homework: "Homework",
  homeworkCreate: "Post & Grade Homework",
  auditLog: "Audit Log",
  reports: "Reports Center",
  settings: "Settings",
  settingsUsers: "Users & Roles",
  settingsCampuses: "Campus Management",
  settingsSubjects: "Subject Management",
  settingsSchools: "School Management (Platform)",
};

/** Every module a route-gated page belongs to, in the order the route matcher checks them (most specific first). */
export const MODULE_ROUTES: { module: PermissionModule; prefixes: string[] }[] = [
  { module: "settingsUsers", prefixes: ["/settings/users"] },
  { module: "settingsCampuses", prefixes: ["/settings/campuses"] },
  { module: "settingsSubjects", prefixes: ["/settings/subjects"] },
  { module: "settingsSchools", prefixes: ["/settings/schools"] },
  { module: "auditLog", prefixes: ["/audit-log"] },
  { module: "settings", prefixes: ["/settings"] },
  { module: "attendanceMark", prefixes: ["/attendance/mark"] },
  { module: "attendance", prefixes: ["/attendance"] },
  { module: "feesCollect", prefixes: ["/fees/collect"] },
  { module: "feesStructure", prefixes: ["/fees/structure", "/fees/generate"] },
  { module: "fees", prefixes: ["/fees"] },
  { module: "examsCreate", prefixes: ["/exams/create"] },
  { module: "examsMarks", prefixes: ["/exams/marks"] },
  { module: "exams", prefixes: ["/exams"] },
  { module: "timetableBuilder", prefixes: ["/timetable/builder"] },
  { module: "timetable", prefixes: ["/timetable"] },
  { module: "announcementsCreate", prefixes: ["/announcements/create"] },
  { module: "announcements", prefixes: ["/announcements"] },
  { module: "leave", prefixes: ["/leave"] },
  // syllabusManage and classworkCreate gate in-page actions (add/edit/reorder a
  // topic on /syllabus; the Add modal on /classwork), not their own route — so
  // they have no MODULE_ROUTES entry, same as e.g. studentsManage's in-page actions.
  { module: "syllabus", prefixes: ["/syllabus"] },
  { module: "classwork", prefixes: ["/classwork"] },
  { module: "homeworkCreate", prefixes: ["/homework/new"] },
  { module: "homework", prefixes: ["/homework"] },
  { module: "studentsManage", prefixes: ["/students/new", "/students/promote", "/students/alumni"] },
  { module: "students", prefixes: ["/students"] },
  { module: "admissions", prefixes: ["/admissions"] },
  { module: "teachers", prefixes: ["/teachers"] },
  { module: "classes", prefixes: ["/classes"] },
  { module: "reports", prefixes: ["/reports"] },
  { module: "dashboard", prefixes: ["/dashboard"] },
];

/**
 * Routes no permission module governs — reachable by any authenticated role.
 * /fees/invoices and /exams/results are single-record, read-mostly views
 * (a printable bill, a result card) that both admin-side pages and the
 * parent portal link into; the pages themselves hide admin-only actions
 * (Record Payment, Apply Discount, Reverse) behind a `feesCollect`
 * permission check rather than being gated at the route level. /account is
 * every user's own profile + password page, so no role can be locked out of it.
 */
const ALWAYS_ALLOWED_PREFIXES = ["/notifications", "/fees/invoices", "/exams/results", "/account"];

/** The Parent portal is a structurally separate, parent-only route tree (see lib/nav-config.ts). */
const PARENT_ONLY_PREFIXES = ["/portal"];

export function moduleForPath(pathname: string): PermissionModule | null {
  for (const { module, prefixes } of MODULE_ROUTES) {
    if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return module;
  }
  return null;
}

export function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isParentOnlyRoute(pathname: string): boolean {
  return PARENT_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Default module permissions per built-in role. For schools these are only
 * starting values — each school gets its own editable copy as its default
 * roles (lib/school-roles.ts); the database is then the source of truth.
 * platform_admin has no school, so its row here is used directly (see
 * lib/authorization.ts).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Record<PermissionModule, boolean>> = {
  // Platform-level SaaS operator: manages the roster of schools (tenants) and
  // a cross-school summary, never a single school's live student/fee/exam
  // data — see the multi-tenant plan for why this console is deliberately
  // shallow rather than a way to "log in as" any one school.
  platform_admin: allFalseExcept(["dashboard", "settingsSchools"]),
  school_owner: allTrueExcept(["settingsSchools"]),
  school_admin: allTrueExcept(["settingsSchools"]),
  // Audit Log is owner/school_admin only, even for campus_admin — audit_logs
  // has no campusId column, so there's no way to scope it to just one
  // campus without a bigger schema change; showing every campus's entries
  // to a campus-scoped role isn't the right default.
  campus_admin: allTrueExcept(["settingsUsers", "settingsCampuses", "settingsSubjects", "settingsSchools", "auditLog"]),
  teacher: allTrueExcept([
    "studentsManage",
    "admissions",
    "teachers",
    "classesManage",
    "fees",
    "feesCollect",
    "feesStructure",
    "examsCreate",
    "timetableBuilder",
    "announcementsCreate",
    "syllabusManage", // the syllabus itself is admin-set — teachers only update progress, see syllabus.service.ts
    "auditLog",
    "reports",
    "settings",
    "settingsUsers",
    "settingsCampuses",
    "settingsSubjects",
    "settingsSchools",
  ]),
  accountant: allTrueExcept([
    "studentsManage",
    "admissions",
    "teachers",
    "classes",
    "classesManage",
    "attendance",
    "attendanceMark",
    "examsCreate",
    "examsMarks",
    "exams",
    "timetable",
    "timetableBuilder",
    "announcementsCreate",
    "leave",
    "syllabus", // finance-only role — no academic access at all, matches its existing exam/attendance/timetable exclusions
    "syllabusManage",
    "classwork",
    "classworkCreate",
    "homework",
    "homeworkCreate",
    "auditLog",
    "settings",
    "settingsUsers",
    "settingsCampuses",
    "settingsSubjects",
    "settingsSchools",
  ]),
  parent: allTrueExcept([
    "students", // parent's own /students view is still allowed (scoped to their children) — see note below
    "studentsManage",
    "admissions",
    "teachers",
    "classes",
    "classesManage",
    "attendance",
    "attendanceMark",
    "fees",
    "feesCollect",
    "feesStructure",
    "examsCreate",
    "examsMarks",
    "exams",
    "timetableBuilder",
    "announcementsCreate",
    "leave",
    // Same shape as "exams" above: the staff-facing /syllabus, /classwork,
    // /homework routes and their read functions require these role
    // permissions, which a parent never holds — matching how parent never
    // gets "exams" either. Their own /portal/syllabus, /portal/classwork,
    // /portal/homework pages call separate ownership-checked service
    // functions that skip this permission entirely (mirrors
    // exam.service.getResultCardData), so this exclusion doesn't block them.
    "syllabus",
    "syllabusManage",
    "classwork",
    "classworkCreate",
    "homework",
    "homeworkCreate",
    "auditLog",
    "reports",
    "settings",
    "settingsUsers",
    "settingsCampuses",
    "settingsSubjects",
    "settingsSchools",
  ]),
};
// Parent needs "students" allowed (their own nav's "My Children" is /students, scoped by childStudentIds
// in the page itself) — re-enable it after the exclusion list above for readability of what's actually locked.
DEFAULT_ROLE_PERMISSIONS.parent.students = true;

function allTrueExcept(excluded: PermissionModule[]): Record<PermissionModule, boolean> {
  const modules = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];
  return Object.fromEntries(modules.map((m) => [m, !excluded.includes(m)])) as Record<PermissionModule, boolean>;
}

function allFalseExcept(included: PermissionModule[]): Record<PermissionModule, boolean> {
  const modules = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];
  return Object.fromEntries(modules.map((m) => [m, included.includes(m)])) as Record<PermissionModule, boolean>;
}
