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
  reports: "Reports Center",
  settings: "Settings",
  settingsUsers: "Users & Roles",
  settingsCampuses: "Campus Management",
  settingsSubjects: "Subject Management",
};

/** Every module a route-gated page belongs to, in the order the route matcher checks them (most specific first). */
export const MODULE_ROUTES: { module: PermissionModule; prefixes: string[] }[] = [
  { module: "settingsUsers", prefixes: ["/settings/users"] },
  { module: "settingsCampuses", prefixes: ["/settings/campuses"] },
  { module: "settingsSubjects", prefixes: ["/settings/subjects"] },
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
 * permission check rather than being gated at the route level.
 */
const ALWAYS_ALLOWED_PREFIXES = ["/notifications", "/fees/invoices", "/exams/results"];

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
 * Default route-view permissions per role. Persisted into AppDataState
 * (see lib/store/app-data-context.ts) so the Settings → Users & Roles matrix
 * is a real, enforced permission model rather than decorative UI: toggling
 * a module off there actually blocks that role from the route (see
 * components/layout/auth-guard.tsx).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Record<PermissionModule, boolean>> = {
  school_owner: allTrueExcept([]),
  school_admin: allTrueExcept([]),
  campus_admin: allTrueExcept(["settingsUsers", "settingsCampuses", "settingsSubjects"]),
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
    "reports",
    "settings",
    "settingsUsers",
    "settingsCampuses",
    "settingsSubjects",
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
    "settings",
    "settingsUsers",
    "settingsCampuses",
    "settingsSubjects",
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
    "reports",
    "settings",
    "settingsUsers",
    "settingsCampuses",
    "settingsSubjects",
  ]),
};
// Parent needs "students" allowed (their own nav's "My Children" is /students, scoped by childStudentIds
// in the page itself) — re-enable it after the exclusion list above for readability of what's actually locked.
DEFAULT_ROLE_PERMISSIONS.parent.students = true;

function allTrueExcept(excluded: PermissionModule[]): Record<PermissionModule, boolean> {
  const modules = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];
  return Object.fromEntries(modules.map((m) => [m, !excluded.includes(m)])) as Record<PermissionModule, boolean>;
}
